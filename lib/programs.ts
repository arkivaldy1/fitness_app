import { supabase, isSupabaseConfigured } from './supabase';
import {
  getDatabase,
  generateUUID,
  addToSyncQueue,
  createWorkoutTemplate,
  addExerciseToTemplate,
} from './database';
import type { GeneratedProgram, ProgramRequest } from './ai';

export interface SavedProgram {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  weekly_schedule: string | null;
  is_ai_generated: boolean;
  ai_generation_inputs: ProgramRequest | null;
  tips: string[] | null;
  created_at: string;
  updated_at: string;
}

// Save a generated program to the database
export const saveGeneratedProgram = async (
  userId: string,
  program: GeneratedProgram,
  inputs: ProgramRequest
): Promise<string> => {
  const database = await getDatabase();
  const programId = await generateUUID();
  const now = new Date().toISOString();

  // Create program record
  await database.runAsync(
    `INSERT INTO programs (id, user_id, name, description, weekly_schedule, is_ai_generated, ai_generation_inputs, tips, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      programId,
      userId,
      program.name,
      program.description,
      program.weeklySchedule,
      JSON.stringify(inputs),
      JSON.stringify(program.tips),
      now,
      now,
    ]
  );

  // Add to sync queue
  await addToSyncQueue('insert', 'programs', programId, {
    id: programId,
    user_id: userId,
    name: program.name,
    description: program.description,
    weekly_schedule: program.weeklySchedule,
    is_ai_generated: true,
    ai_generation_inputs: inputs,
    tips: program.tips,
    created_at: now,
    updated_at: now,
  });

  // Create workout templates for each workout
  const dayMap: Record<string, number> = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 0,
  };

  for (let i = 0; i < program.workouts.length; i++) {
    const workout = program.workouts[i];

    const templateId = await createWorkoutTemplate({
      user_id: userId,
      program_id: programId,
      name: workout.name,
      day_of_week: dayMap[workout.dayOfWeek] ?? null,
      order_index: i,
      target_duration_minutes: workout.targetDuration,
    });

    // Add exercises to template
    for (let j = 0; j < workout.exercises.length; j++) {
      const exercise = workout.exercises[j];

      // Find or create exercise in database
      const exerciseId = await findOrCreateExercise(database, exercise.name, userId);

      await addExerciseToTemplate({
        workout_template_id: templateId,
        exercise_id: exerciseId,
        order_index: j,
        superset_group: null,
        target_sets: exercise.sets,
        target_reps: exercise.reps,
        target_rpe: null,
        rest_seconds: exercise.restSeconds,
        tempo: null,
        notes: exercise.notes || null,
      });
    }
  }

  return programId;
};

// Find exercise by name or create a new one
const findOrCreateExercise = async (
  database: Awaited<ReturnType<typeof getDatabase>>,
  name: string,
  userId: string
): Promise<string> => {
  // Try to find existing exercise
  const existing = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [name]
  );

  if (existing) {
    return existing.id;
  }

  // Create new exercise
  const id = await generateUUID();
  await database.runAsync(
    `INSERT INTO exercises (id, name, primary_muscle, equipment, is_system, user_id, created_at)
     VALUES (?, ?, 'other', 'other', 0, ?, datetime('now'))`,
    [id, name, userId]
  );

  await addToSyncQueue('insert', 'exercises', id, {
    id,
    name,
    primary_muscle: 'other',
    equipment: 'other',
    is_system: false,
    user_id: userId,
  });

  return id;
};

// Get all programs for a user
export const getUserPrograms = async (userId: string): Promise<SavedProgram[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    duration_weeks: row.duration_weeks as number | null,
    weekly_schedule: row.weekly_schedule as string | null,
    is_ai_generated: row.is_ai_generated === 1,
    ai_generation_inputs: row.ai_generation_inputs
      ? JSON.parse(row.ai_generation_inputs as string)
      : null,
    tips: row.tips ? JSON.parse(row.tips as string) : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
};

// Get a single program with its workouts
export const getProgramWithWorkouts = async (programId: string) => {
  const database = await getDatabase();

  const program = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM programs WHERE id = ?',
    [programId]
  );

  if (!program) return null;

  const workouts = await database.getAllAsync<Record<string, unknown>>(
    `SELECT wt.*,
            (SELECT COUNT(*) FROM workout_template_exercises WHERE workout_template_id = wt.id) as exercise_count
     FROM workout_templates wt
     WHERE wt.program_id = ?
     ORDER BY wt.order_index`,
    [programId]
  );

  return {
    id: program.id as string,
    user_id: program.user_id as string,
    name: program.name as string,
    description: program.description as string | null,
    weekly_schedule: program.weekly_schedule as string | null,
    is_ai_generated: program.is_ai_generated === 1,
    tips: program.tips ? JSON.parse(program.tips as string) : null,
    workouts: workouts.map((w) => ({
      id: w.id as string,
      name: w.name as string,
      day_of_week: w.day_of_week as number | null,
      target_duration_minutes: w.target_duration_minutes as number | null,
      exercise_count: w.exercise_count as number,
    })),
  };
};

// Delete a program
export const deleteProgram = async (programId: string): Promise<void> => {
  const database = await getDatabase();

  // SQLite cascade will handle workout_templates and their exercises
  await database.runAsync('DELETE FROM programs WHERE id = ?', [programId]);

  await addToSyncQueue('delete', 'programs', programId, {});
};

// Set a program as active (for starting workouts from it)
export const setActiveProgram = async (userId: string, programId: string | null): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    ['active_program_id', programId || '']
  );
};

// Get active program
export const getActiveProgram = async (userId: string): Promise<string | null> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_settings WHERE key = ?',
    ['active_program_id']
  );
  return result?.value || null;
};
