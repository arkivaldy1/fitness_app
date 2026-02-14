export * from './database';

// App-specific derived types

import type {
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutTemplateExerciseWithJoin,
  WorkoutSession,
  SetLog,
  NutritionEntry,
} from './database';

// Workout with exercises joined
export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: WorkoutTemplateExerciseWithJoin[];
}

// Active session state
export interface ActiveWorkoutSession {
  session: WorkoutSession;
  template: WorkoutTemplateWithExercises;
  currentExerciseIndex: number;
  currentSetIndex: number;
  setLogs: SetLog[];
  startedAt: Date;
  restTimerEnd: Date | null;
}

// Exercise history for quick reference
export interface ExerciseHistory {
  exercise_id: string;
  last_session: {
    date: string;
    sets: {
      reps: number;
      weight: number;
      rpe: number | null;
    }[];
  } | null;
  estimated_1rm: number | null;
  pr_weight: number | null;
  pr_reps: number | null;
}

// Nutrition day summary
export interface NutritionDaySummary {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water_ml: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water_ml: number;
  };
  entries: NutritionEntry[];
  adherence: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
}

// Analytics types
export interface WeeklyStats {
  week_start: string;
  sessions_completed: number;
  sessions_planned: number;
  total_volume: number;
  total_duration_seconds: number;
  prs_hit: number;
}

export interface ExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  data_points: {
    date: string;
    estimated_1rm: number;
    best_set_volume: number;
  }[];
}
