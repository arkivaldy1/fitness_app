import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import {
  createWorkoutSession,
  completeWorkoutSession,
  logSet,
  getSetLogsForSession,
  getWorkoutTemplateWithExercises,
  getLastExerciseSets,
  getExercisePRs,
} from '../lib/database';
import { checkForPR, calculateVolume, formatDuration } from '../lib/analytics';
import type {
  WorkoutSession,
  SetLog,
  WorkoutTemplateWithExercises,
  WeightUnit,
} from '../types';

interface ExerciseSetState {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  completedSets: SetLog[];
  lastSessionSets: SetLog[];
}

export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'reps';
  value: number;
}

interface ActiveSession {
  session: WorkoutSession;
  template: WorkoutTemplateWithExercises;
  exercises: ExerciseSetState[];
  currentExerciseIndex: number;
  startTime: Date;
  restTimerEnd: Date | null;
  isPaused: boolean;
  prsHit: PRRecord[];
  latestPrExerciseIndex: number | null;
}

export interface WorkoutSummary {
  sessionId: string;
  workoutName: string;
  durationSeconds: number;
  totalVolume: number;
  exercisesCompleted: number;
  setsCompleted: number;
  prsHit: PRRecord[];
  rating: number | null;
}

interface WorkoutState {
  activeSession: ActiveSession | null;
  lastWorkoutSummary: WorkoutSummary | null;
  isLoading: boolean;

  // Actions
  startWorkout: (templateId: string, userId: string) => Promise<void>;
  startQuickWorkout: (name: string, userId: string) => Promise<void>;
  addExerciseToSession: (exercise: { id: string; name: string }, sets?: number, reps?: string, restSeconds?: number) => void;
  logSetComplete: (
    exerciseIndex: number,
    reps: number,
    weight: number,
    weightUnit: WeightUnit,
    options?: {
      rpe?: number;
      notes?: string;
      isWarmup?: boolean;
      isFailure?: boolean;
    }
  ) => Promise<void>;
  skipSet: (exerciseIndex: number) => Promise<void>;
  nextExercise: () => void;
  previousExercise: () => void;
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  finishWorkout: (rating?: number, notes?: string) => Promise<void>;
  cancelWorkout: () => void;
  clearSummary: () => void;
  updateSummaryRating: (rating: number) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  lastWorkoutSummary: null,
  isLoading: false,

  startWorkout: async (templateId: string, userId: string) => {
    set({ isLoading: true });

    try {
      // Load template with exercises
      const template = await getWorkoutTemplateWithExercises(templateId);
      if (!template) {
        throw new Error('Workout template not found');
      }

      // Create session
      const startedAt = new Date().toISOString();
      const sessionId = await createWorkoutSession({
        user_id: userId,
        workout_template_id: templateId,
        template_snapshot: {
          name: template.name,
          exercises: template.exercises,
        },
        started_at: startedAt,
        completed_at: null,
        duration_seconds: null,
        notes: null,
        rating: null,
      });

      // Load last session data for each exercise
      const exercises: ExerciseSetState[] = await Promise.all(
        template.exercises.map(async (te) => {
          const lastSessions = await getLastExerciseSets(te.exercise_id, 1);
          const lastSessionSets = lastSessions[0]?.sets || [];

          return {
            exerciseId: te.exercise_id,
            exerciseName: te.exercise?.name || 'Unknown',
            targetSets: te.target_sets,
            targetReps: te.target_reps,
            restSeconds: te.rest_seconds,
            completedSets: [],
            lastSessionSets,
          };
        })
      );

      set({
        activeSession: {
          session: {
            id: sessionId,
            user_id: userId,
            workout_template_id: templateId,
            template_snapshot: { name: template.name, exercises: template.exercises },
            started_at: startedAt,
            completed_at: null,
            duration_seconds: null,
            notes: null,
            rating: null,
            created_at: startedAt,
          },
          template: template as WorkoutTemplateWithExercises,
          exercises,
          currentExerciseIndex: 0,
          startTime: new Date(),
          restTimerEnd: null,
          isPaused: false,
          prsHit: [],
          latestPrExerciseIndex: null,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to start workout:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  startQuickWorkout: async (name: string, userId: string) => {
    set({ isLoading: true });

    const startedAt = new Date().toISOString();
    const sessionId = await createWorkoutSession({
      user_id: userId,
      workout_template_id: null,
      template_snapshot: { name, exercises: [] },
      started_at: startedAt,
      completed_at: null,
      duration_seconds: null,
      notes: null,
      rating: null,
    });

    set({
      activeSession: {
        session: {
          id: sessionId,
          user_id: userId,
          workout_template_id: null,
          template_snapshot: { name, exercises: [] },
          started_at: startedAt,
          completed_at: null,
          duration_seconds: null,
          notes: null,
          rating: null,
          created_at: startedAt,
        },
        template: {
          id: '',
          user_id: userId,
          program_id: null,
          name,
          day_of_week: null,
          order_index: 0,
          target_duration_minutes: null,
          created_at: startedAt,
          updated_at: startedAt,
          exercises: [],
        },
        exercises: [],
        currentExerciseIndex: 0,
        startTime: new Date(),
        restTimerEnd: null,
        isPaused: false,
        prsHit: [],
        latestPrExerciseIndex: null,
      },
      isLoading: false,
    });
  },

  addExerciseToSession: (exercise, sets = 3, reps = '8-12', restSeconds = 90) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const newExercise: ExerciseSetState = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetSets: sets,
      targetReps: reps,
      restSeconds,
      completedSets: [],
      lastSessionSets: [],
    };

    // Also update template_snapshot so history can resolve exercise names
    const snapshotEntry = {
      id: `dynamic_${Date.now()}`,
      workout_template_id: activeSession.session.workout_template_id || '',
      exercise_id: exercise.id,
      exercise: { id: exercise.id, name: exercise.name },
      target_sets: sets,
      target_reps: reps,
      target_rpe: null,
      rest_seconds: restSeconds,
      order_index: activeSession.session.template_snapshot.exercises.length,
      superset_group: null,
      tempo: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
    const updatedSnapshot = {
      ...activeSession.session.template_snapshot,
      exercises: [
        ...activeSession.session.template_snapshot.exercises,
        snapshotEntry,
      ],
    };

    set({
      activeSession: {
        ...activeSession,
        exercises: [...activeSession.exercises, newExercise],
        currentExerciseIndex: activeSession.exercises.length, // Jump to new exercise
        session: {
          ...activeSession.session,
          template_snapshot: updatedSnapshot,
        },
      },
    });
  },

  logSetComplete: async (exerciseIndex, reps, weight, weightUnit, options = {}) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const exercise = activeSession.exercises[exerciseIndex];
    if (!exercise) return;

    const setNumber = exercise.completedSets.filter((s) => !s.skipped).length + 1;
    const setId = Crypto.randomUUID();

    const setLog: SetLog = {
      id: setId,
      workout_session_id: activeSession.session.id,
      exercise_id: exercise.exerciseId,
      set_number: setNumber,
      reps,
      weight,
      weight_unit: weightUnit,
      rpe: options.rpe || null,
      rest_seconds: null,
      tempo: null,
      notes: options.notes || null,
      is_warmup: options.isWarmup || false,
      is_dropset: false,
      is_failure: options.isFailure || false,
      skipped: false,
      logged_at: new Date().toISOString(),
    };

    // Save to database
    await logSet(setLog);

    // Check for PRs (only for non-warmup working sets)
    const newPrs: PRRecord[] = [];
    if (!options.isWarmup && weight > 0) {
      try {
        const prs = await getExercisePRs(exercise.exerciseId, activeSession.session.user_id);
        const prResult = checkForPR(weight, reps, prs.maxWeight, prs.maxReps);
        if (prResult.isWeightPR) {
          newPrs.push({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            type: 'weight',
            value: weight,
          });
        }
        if (prResult.isRepsPR) {
          newPrs.push({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            type: 'reps',
            value: reps,
          });
        }
        if (newPrs.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        // PR check is non-critical, don't block set logging
        console.warn('PR check failed:', e);
      }
    }

    // Update state
    set({
      activeSession: {
        ...activeSession,
        exercises: activeSession.exercises.map((e, i) =>
          i === exerciseIndex
            ? { ...e, completedSets: [...e.completedSets, setLog] }
            : e
        ),
        prsHit: [...activeSession.prsHit, ...newPrs],
        latestPrExerciseIndex: newPrs.length > 0 ? exerciseIndex : null,
      },
    });

    // Start rest timer
    get().startRestTimer(exercise.restSeconds);
  },

  skipSet: async (exerciseIndex) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const exercise = activeSession.exercises[exerciseIndex];
    if (!exercise) return;

    const setNumber = exercise.completedSets.length + 1;
    const setId = Crypto.randomUUID();

    const setLog: SetLog = {
      id: setId,
      workout_session_id: activeSession.session.id,
      exercise_id: exercise.exerciseId,
      set_number: setNumber,
      reps: 0,
      weight: 0,
      weight_unit: 'kg',
      rpe: null,
      rest_seconds: null,
      tempo: null,
      notes: null,
      is_warmup: false,
      is_dropset: false,
      is_failure: false,
      skipped: true,
      logged_at: new Date().toISOString(),
    };

    await logSet(setLog);

    set({
      activeSession: {
        ...activeSession,
        exercises: activeSession.exercises.map((e, i) =>
          i === exerciseIndex
            ? { ...e, completedSets: [...e.completedSets, setLog] }
            : e
        ),
      },
    });
  },

  nextExercise: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const nextIndex = Math.min(
      activeSession.currentExerciseIndex + 1,
      activeSession.exercises.length - 1
    );

    set({
      activeSession: {
        ...activeSession,
        currentExerciseIndex: nextIndex,
        restTimerEnd: null,
      },
    });
  },

  previousExercise: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const prevIndex = Math.max(activeSession.currentExerciseIndex - 1, 0);

    set({
      activeSession: {
        ...activeSession,
        currentExerciseIndex: prevIndex,
        restTimerEnd: null,
      },
    });
  },

  startRestTimer: (seconds: number) => {
    const { activeSession } = get();
    if (!activeSession) return;

    set({
      activeSession: {
        ...activeSession,
        restTimerEnd: new Date(Date.now() + seconds * 1000),
      },
    });
  },

  clearRestTimer: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    set({
      activeSession: {
        ...activeSession,
        restTimerEnd: null,
      },
    });
  },

  finishWorkout: async (rating?: number, notes?: string) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const completedAt = new Date().toISOString();
    const durationSeconds = Math.floor(
      (Date.now() - activeSession.startTime.getTime()) / 1000
    );

    await completeWorkoutSession(
      activeSession.session.id,
      completedAt,
      durationSeconds,
      rating,
      notes
    );

    // Compute summary before clearing
    const allSets = activeSession.exercises.flatMap((e) => e.completedSets);
    const totalVolume = calculateVolume(allSets);
    const exercisesCompleted = activeSession.exercises.filter(
      (e) => e.completedSets.some((s) => !s.skipped)
    ).length;
    const setsCompleted = allSets.filter((s) => !s.skipped && !s.is_warmup).length;

    const summary: WorkoutSummary = {
      sessionId: activeSession.session.id,
      workoutName: activeSession.template.name,
      durationSeconds,
      totalVolume,
      exercisesCompleted,
      setsCompleted,
      prsHit: activeSession.prsHit,
      rating: rating || null,
    };

    set({ activeSession: null, lastWorkoutSummary: summary });
  },

  cancelWorkout: () => {
    // Note: Session remains in DB as incomplete
    set({ activeSession: null });
  },

  clearSummary: () => {
    set({ lastWorkoutSummary: null });
  },

  updateSummaryRating: async (rating: number) => {
    const { lastWorkoutSummary } = get();
    if (!lastWorkoutSummary) return;

    await completeWorkoutSession(
      lastWorkoutSummary.sessionId,
      new Date().toISOString(),
      lastWorkoutSummary.durationSeconds,
      rating
    );

    set({
      lastWorkoutSummary: { ...lastWorkoutSummary, rating },
    });
  },
}));

// Helper hooks for derived state
export const useCurrentExercise = () => {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  if (!activeSession) return null;
  return activeSession.exercises[activeSession.currentExerciseIndex] || null;
};

export const useWorkoutProgress = () => {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  if (!activeSession) return { completed: 0, total: 0, percentage: 0 };

  const total = activeSession.exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const completed = activeSession.exercises.reduce(
    (sum, e) => sum + e.completedSets.filter((s) => !s.skipped).length,
    0
  );

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};
