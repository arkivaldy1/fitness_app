import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SEED_EXERCISES } from '../constants/exercises';
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutSession,
  SetLog,
  NutritionDay,
  NutritionEntry,
  WaterLog,
  MealTemplate,
  BodyWeightLog,
  SyncOperation,
} from '../types';

// Open database
let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('forge_fitness.db');
  return db;
};

// Generate UUID
export const generateUUID = async (): Promise<string> => {
  return Crypto.randomUUID();
};

// Initialize database schema
export const initializeDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  await database.execAsync(`
    -- Exercises table
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_muscle TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment TEXT NOT NULL,
      movement_pattern TEXT,
      is_compound INTEGER DEFAULT 0,
      is_unilateral INTEGER DEFAULT 0,
      instructions TEXT,
      video_url TEXT,
      is_system INTEGER DEFAULT 1,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Programs (AI-generated or custom)
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration_weeks INTEGER,
      weekly_schedule TEXT,
      is_ai_generated INTEGER DEFAULT 0,
      ai_generation_inputs TEXT,
      tips TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Workout templates
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      program_id TEXT,
      name TEXT NOT NULL,
      day_of_week INTEGER,
      order_index INTEGER DEFAULT 0,
      target_duration_minutes INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Workout template exercises
    CREATE TABLE IF NOT EXISTS workout_template_exercises (
      id TEXT PRIMARY KEY,
      workout_template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      superset_group INTEGER,
      target_sets INTEGER NOT NULL,
      target_reps TEXT NOT NULL,
      target_rpe REAL,
      rest_seconds INTEGER DEFAULT 90,
      tempo TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    -- Workout sessions (logged workouts)
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workout_template_id TEXT,
      template_snapshot TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER,
      notes TEXT,
      rating INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Set logs
    CREATE TABLE IF NOT EXISTS set_logs (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      weight_unit TEXT NOT NULL,
      rpe REAL,
      rest_seconds INTEGER,
      tempo TEXT,
      notes TEXT,
      is_warmup INTEGER DEFAULT 0,
      is_dropset INTEGER DEFAULT 0,
      is_failure INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      logged_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    -- Nutrition days
    CREATE TABLE IF NOT EXISTS nutrition_days (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT NOT NULL,
      target_calories INTEGER,
      target_protein REAL,
      target_carbs REAL,
      target_fat REAL,
      target_water_ml INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    -- Nutrition entries
    CREATE TABLE IF NOT EXISTS nutrition_entries (
      id TEXT PRIMARY KEY,
      nutrition_day_id TEXT NOT NULL,
      user_id TEXT,
      label TEXT,
      calories INTEGER NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,
      water_ml INTEGER DEFAULT 0,
      meal_template_id TEXT,
      logged_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (nutrition_day_id) REFERENCES nutrition_days(id) ON DELETE CASCADE
    );

    -- Water logs
    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Meal templates
    CREATE TABLE IF NOT EXISTS meal_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,
      water_ml INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    -- Body weight logs
    CREATE TABLE IF NOT EXISTS body_weight_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    -- Sync queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      attempts INTEGER DEFAULT 0,
      last_error TEXT
    );

    -- User settings (local cache)
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(primary_muscle);
    CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(workout_session_id);
    CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_days_date ON nutrition_days(date);
    CREATE INDEX IF NOT EXISTS idx_nutrition_entries_day ON nutrition_entries(nutrition_day_id);
    CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(date);
    CREATE INDEX IF NOT EXISTS idx_body_weight_logs_user_date ON body_weight_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
  `);

  // Seed exercises if empty
  await seedExercises();
};

// Seed exercises from constants
const seedExercises = async (): Promise<void> => {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE is_system = 1'
  );

  if (result && result.count > 0) {
    return; // Already seeded
  }

  for (const exercise of SEED_EXERCISES) {
    const id = await generateUUID();
    await database.runAsync(
      `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, is_compound, is_unilateral, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        exercise.name,
        exercise.primary_muscle,
        exercise.secondary_muscles ? JSON.stringify(exercise.secondary_muscles) : null,
        exercise.equipment,
        exercise.movement_pattern || null,
        exercise.is_compound ? 1 : 0,
        exercise.is_unilateral ? 1 : 0,
      ]
    );
  }
};

// Exercise queries
export const getAllExercises = async (): Promise<Exercise[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM exercises ORDER BY name');
  return rows.map(mapRowToExercise);
};

export const getExercisesByMuscle = async (muscle: string): Promise<Exercise[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM exercises WHERE primary_muscle = ? ORDER BY name',
    [muscle]
  );
  return rows.map(mapRowToExercise);
};

export const searchExercises = async (query: string): Promise<Exercise[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name LIMIT 50',
    [`%${query}%`]
  );
  return rows.map(mapRowToExercise);
};

export const getExerciseById = async (id: string): Promise<Exercise | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM exercises WHERE id = ?',
    [id]
  );
  return row ? mapRowToExercise(row) : null;
};

// Workout template queries
export const createWorkoutTemplate = async (
  template: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO workout_templates (id, user_id, program_id, name, day_of_week, order_index, target_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      template.user_id,
      template.program_id || null,
      template.name,
      template.day_of_week ?? null,
      template.order_index,
      template.target_duration_minutes || null,
      now,
      now,
    ]
  );

  await addToSyncQueue('insert', 'workout_templates', id, template);
  return id;
};

export const getWorkoutTemplates = async (userId?: string): Promise<WorkoutTemplate[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    userId
      ? 'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY order_index'
      : 'SELECT * FROM workout_templates ORDER BY order_index',
    userId ? [userId] : []
  );
  return rows.map(mapRowToWorkoutTemplate);
};

export const getWorkoutTemplateWithExercises = async (templateId: string) => {
  const database = await getDatabase();

  const template = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM workout_templates WHERE id = ?',
    [templateId]
  );

  if (!template) return null;

  const exerciseRows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT wte.*, e.name as exercise_name, e.primary_muscle, e.equipment, e.is_compound
     FROM workout_template_exercises wte
     JOIN exercises e ON wte.exercise_id = e.id
     WHERE wte.workout_template_id = ?
     ORDER BY wte.order_index`,
    [templateId]
  );

  return {
    ...mapRowToWorkoutTemplate(template),
    exercises: exerciseRows.map((row) => ({
      ...mapRowToWorkoutTemplateExercise(row),
      exercise: {
        id: row.exercise_id as string,
        name: row.exercise_name as string,
        primary_muscle: row.primary_muscle as string,
        equipment: row.equipment as string,
        is_compound: row.is_compound === 1,
      },
    })),
  };
};

// Update workout template
export const updateWorkoutTemplate = async (
  templateId: string,
  fields: { name?: string; target_duration_minutes?: number | null }
): Promise<void> => {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.target_duration_minutes !== undefined) { sets.push('target_duration_minutes = ?'); values.push(fields.target_duration_minutes); }

  values.push(templateId);
  await database.runAsync(
    `UPDATE workout_templates SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
  await addToSyncQueue('update', 'workout_templates', templateId, { ...fields, updated_at: now });
};

// Delete workout template (exercises cascade)
export const deleteWorkoutTemplate = async (templateId: string): Promise<void> => {
  const database = await getDatabase();
  // Enable foreign keys to ensure cascade works
  await database.execAsync('PRAGMA foreign_keys = ON');
  await database.runAsync('DELETE FROM workout_templates WHERE id = ?', [templateId]);
  await addToSyncQueue('delete', 'workout_templates', templateId, {});
};

// Replace all exercises in a template (delete old, insert new)
export const replaceTemplateExercises = async (
  templateId: string,
  exercises: Omit<WorkoutTemplateExercise, 'id' | 'created_at' | 'workout_template_id'>[]
): Promise<void> => {
  const database = await getDatabase();

  // Delete existing exercises
  await database.runAsync(
    'DELETE FROM workout_template_exercises WHERE workout_template_id = ?',
    [templateId]
  );

  // Insert new exercises
  for (const ex of exercises) {
    const id = await generateUUID();
    await database.runAsync(
      `INSERT INTO workout_template_exercises
       (id, workout_template_id, exercise_id, order_index, superset_group, target_sets, target_reps, target_rpe, rest_seconds, tempo, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        templateId,
        ex.exercise_id,
        ex.order_index,
        ex.superset_group || null,
        ex.target_sets,
        ex.target_reps,
        ex.target_rpe || null,
        ex.rest_seconds,
        ex.tempo || null,
        ex.notes || null,
      ]
    );
  }

  await addToSyncQueue('update', 'workout_template_exercises', templateId, { replaced: true });
};

// Add exercise to workout template
export const addExerciseToTemplate = async (
  templateExercise: Omit<WorkoutTemplateExercise, 'id' | 'created_at'>
): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    `INSERT INTO workout_template_exercises
     (id, workout_template_id, exercise_id, order_index, superset_group, target_sets, target_reps, target_rpe, rest_seconds, tempo, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      templateExercise.workout_template_id,
      templateExercise.exercise_id,
      templateExercise.order_index,
      templateExercise.superset_group || null,
      templateExercise.target_sets,
      templateExercise.target_reps,
      templateExercise.target_rpe || null,
      templateExercise.rest_seconds,
      templateExercise.tempo || null,
      templateExercise.notes || null,
    ]
  );

  await addToSyncQueue('insert', 'workout_template_exercises', id, templateExercise);
  return id;
};

// Workout session queries
export const createWorkoutSession = async (
  session: Omit<WorkoutSession, 'id' | 'created_at'>
): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    `INSERT INTO workout_sessions (id, user_id, workout_template_id, template_snapshot, started_at, completed_at, duration_seconds, notes, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      session.user_id,
      session.workout_template_id || null,
      JSON.stringify(session.template_snapshot),
      session.started_at,
      session.completed_at || null,
      session.duration_seconds || null,
      session.notes || null,
      session.rating || null,
    ]
  );

  await addToSyncQueue('insert', 'workout_sessions', id, session);
  return id;
};

export const completeWorkoutSession = async (
  sessionId: string,
  completedAt: string,
  durationSeconds: number,
  rating?: number,
  notes?: string,
  templateSnapshot?: Record<string, unknown>
): Promise<void> => {
  const database = await getDatabase();

  if (templateSnapshot) {
    await database.runAsync(
      `UPDATE workout_sessions SET completed_at = ?, duration_seconds = ?, rating = ?, notes = ?, template_snapshot = ? WHERE id = ?`,
      [completedAt, durationSeconds, rating || null, notes || null, JSON.stringify(templateSnapshot), sessionId]
    );
  } else {
    await database.runAsync(
      `UPDATE workout_sessions SET completed_at = ?, duration_seconds = ?, rating = ?, notes = ? WHERE id = ?`,
      [completedAt, durationSeconds, rating || null, notes || null, sessionId]
    );
  }

  await addToSyncQueue('update', 'workout_sessions', sessionId, {
    completed_at: completedAt,
    duration_seconds: durationSeconds,
    rating,
    notes,
    ...(templateSnapshot ? { template_snapshot: templateSnapshot } : {}),
  });
};

export const getRecentWorkoutSessions = async (
  userId?: string,
  limit: number = 10
): Promise<WorkoutSession[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    userId
      ? 'SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?'
      : 'SELECT * FROM workout_sessions ORDER BY started_at DESC LIMIT ?',
    userId ? [userId, limit] : [limit]
  );
  return rows.map(mapRowToWorkoutSession);
};

// Set log queries
export const logSet = async (setLog: Omit<SetLog, 'logged_at'>): Promise<void> => {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO set_logs
     (id, workout_session_id, exercise_id, set_number, reps, weight, weight_unit, rpe, rest_seconds, tempo, notes, is_warmup, is_dropset, is_failure, skipped, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      setLog.id,
      setLog.workout_session_id,
      setLog.exercise_id,
      setLog.set_number,
      setLog.reps,
      setLog.weight,
      setLog.weight_unit,
      setLog.rpe || null,
      setLog.rest_seconds || null,
      setLog.tempo || null,
      setLog.notes || null,
      setLog.is_warmup ? 1 : 0,
      setLog.is_dropset ? 1 : 0,
      setLog.is_failure ? 1 : 0,
      setLog.skipped ? 1 : 0,
    ]
  );

  await addToSyncQueue('insert', 'set_logs', setLog.id, setLog);
};

export const getSetLogsForSession = async (sessionId: string): Promise<SetLog[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM set_logs WHERE workout_session_id = ? ORDER BY logged_at',
    [sessionId]
  );
  return rows.map(mapRowToSetLog);
};

export const getLastExerciseSets = async (
  exerciseId: string,
  limit: number = 1
): Promise<{ session_date: string; sets: SetLog[] }[]> => {
  const database = await getDatabase();

  // Get last N sessions that include this exercise
  const sessions = await database.getAllAsync<{ id: string; started_at: string }>(
    `SELECT DISTINCT ws.id, ws.started_at
     FROM workout_sessions ws
     JOIN set_logs sl ON sl.workout_session_id = ws.id
     WHERE sl.exercise_id = ? AND ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    [exerciseId, limit]
  );

  const result = [];
  for (const session of sessions) {
    const sets = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM set_logs WHERE workout_session_id = ? AND exercise_id = ? ORDER BY set_number',
      [session.id, exerciseId]
    );
    result.push({
      session_date: session.started_at,
      sets: sets.map(mapRowToSetLog),
    });
  }

  return result;
};

// Exercise PR queries
export const getExercisePRs = async (
  exerciseId: string,
  userId?: string
): Promise<{ maxWeight: number | null; maxReps: number | null }> => {
  const database = await getDatabase();

  const weightResult = await database.getFirstAsync<{ max_weight: number | null }>(
    `SELECT MAX(sl.weight) as max_weight
     FROM set_logs sl
     JOIN workout_sessions ws ON sl.workout_session_id = ws.id
     WHERE sl.exercise_id = ?
       AND sl.is_warmup = 0
       AND sl.skipped = 0
       AND ws.completed_at IS NOT NULL
       ${userId ? 'AND ws.user_id = ?' : ''}`,
    userId ? [exerciseId, userId] : [exerciseId]
  );

  const repsResult = await database.getFirstAsync<{ max_reps: number | null }>(
    `SELECT MAX(sl.reps) as max_reps
     FROM set_logs sl
     JOIN workout_sessions ws ON sl.workout_session_id = ws.id
     WHERE sl.exercise_id = ?
       AND sl.is_warmup = 0
       AND sl.skipped = 0
       AND ws.completed_at IS NOT NULL
       ${userId ? 'AND ws.user_id = ?' : ''}`,
    userId ? [exerciseId, userId] : [exerciseId]
  );

  return {
    maxWeight: weightResult?.max_weight ?? null,
    maxReps: repsResult?.max_reps ?? null,
  };
};

// Exercise history queries
export const getExerciseHistory = async (
  exerciseId: string,
  userId?: string,
  limit: number = 20
): Promise<{
  sessions: {
    sessionId: string;
    date: string;
    sets: SetLog[];
    totalVolume: number;
    estimated1RM: number;
  }[];
}> => {
  const database = await getDatabase();

  const sessions = await database.getAllAsync<{ id: string; started_at: string }>(
    `SELECT DISTINCT ws.id, ws.started_at
     FROM workout_sessions ws
     JOIN set_logs sl ON sl.workout_session_id = ws.id
     WHERE sl.exercise_id = ? AND ws.completed_at IS NOT NULL
     ${userId ? 'AND ws.user_id = ?' : ''}
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    userId ? [exerciseId, userId, limit] : [exerciseId, limit]
  );

  const result = [];
  for (const session of sessions) {
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM set_logs WHERE workout_session_id = ? AND exercise_id = ? ORDER BY set_number',
      [session.id, exerciseId]
    );
    const sets = rows.map(mapRowToSetLog);
    const workingSets = sets.filter((s) => !s.is_warmup && !s.skipped);
    const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

    // Find best set for e1RM estimate
    let estimated1RM = 0;
    for (const s of workingSets) {
      if (s.reps > 0 && s.weight > 0) {
        const e1rm = s.reps === 1 ? s.weight : s.weight * (36 / (37 - s.reps));
        if (e1rm > estimated1RM) estimated1RM = e1rm;
      }
    }

    result.push({
      sessionId: session.id,
      date: session.started_at,
      sets,
      totalVolume: Math.round(totalVolume),
      estimated1RM: Math.round(estimated1RM * 10) / 10,
    });
  }

  return { sessions: result };
};

// Weekly stats queries
export const getWeeklyStats = async (
  userId: string,
  weekStartDate: string
): Promise<{
  sessions_completed: number;
  total_volume: number;
  total_duration_seconds: number;
}> => {
  const database = await getDatabase();

  // Compute week end (7 days after start)
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const weekEndDate = end.toISOString().split('T')[0];

  const sessionResult = await database.getFirstAsync<{
    session_count: number;
    total_duration: number;
  }>(
    `SELECT COUNT(*) as session_count, COALESCE(SUM(duration_seconds), 0) as total_duration
     FROM workout_sessions
     WHERE user_id = ?
       AND completed_at IS NOT NULL
       AND date(started_at) >= ?
       AND date(started_at) < ?`,
    [userId, weekStartDate, weekEndDate]
  );

  const volumeResult = await database.getFirstAsync<{ total_volume: number }>(
    `SELECT COALESCE(SUM(sl.weight * sl.reps), 0) as total_volume
     FROM set_logs sl
     JOIN workout_sessions ws ON sl.workout_session_id = ws.id
     WHERE ws.user_id = ?
       AND ws.completed_at IS NOT NULL
       AND date(ws.started_at) >= ?
       AND date(ws.started_at) < ?
       AND sl.is_warmup = 0
       AND sl.skipped = 0`,
    [userId, weekStartDate, weekEndDate]
  );

  return {
    sessions_completed: sessionResult?.session_count ?? 0,
    total_volume: Math.round(volumeResult?.total_volume ?? 0),
    total_duration_seconds: sessionResult?.total_duration ?? 0,
  };
};

// Weekly volume trend
export const getWeeklyVolumeTrend = async (
  userId: string,
  weeks: number = 8
): Promise<{ weekStart: string; volume: number; sessions: number }[]> => {
  const database = await getDatabase();

  // Calculate the start date (N weeks ago, aligned to Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  thisMonday.setHours(0, 0, 0, 0);

  const startDate = new Date(thisMonday);
  startDate.setDate(thisMonday.getDate() - (weeks - 1) * 7);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rows = await database.getAllAsync<{
    week_start: string;
    total_volume: number;
    session_count: number;
  }>(
    `SELECT
       date(ws.started_at, 'weekday 1', '-7 days') as week_start,
       COALESCE(SUM(sl.weight * sl.reps), 0) as total_volume,
       COUNT(DISTINCT ws.id) as session_count
     FROM workout_sessions ws
     LEFT JOIN set_logs sl ON sl.workout_session_id = ws.id
       AND sl.is_warmup = 0 AND sl.skipped = 0
     WHERE ws.user_id = ?
       AND ws.completed_at IS NOT NULL
       AND date(ws.started_at) >= ?
     GROUP BY week_start
     ORDER BY week_start ASC`,
    [userId, startDateStr]
  );

  // Build complete array with zeros for missing weeks
  const result: { weekStart: string; volume: number; sessions: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + i * 7);
    const weekStr = weekDate.toISOString().split('T')[0];

    const match = rows.find((r) => r.week_start === weekStr);
    result.push({
      weekStart: weekStr,
      volume: Math.round(match?.total_volume ?? 0),
      sessions: match?.session_count ?? 0,
    });
  }

  return result;
};

// Nutrition queries
export const getOrCreateNutritionDay = async (
  userId: string,
  date: string,
  targets?: { calories: number; protein: number; carbs: number; fat: number; water_ml: number }
): Promise<NutritionDay> => {
  const database = await getDatabase();

  let day = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM nutrition_days WHERE user_id = ? AND date = ?',
    [userId, date]
  );

  if (!day) {
    const id = await generateUUID();
    await database.runAsync(
      `INSERT INTO nutrition_days (id, user_id, date, target_calories, target_protein, target_carbs, target_fat, target_water_ml)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        date,
        targets?.calories || null,
        targets?.protein || null,
        targets?.carbs || null,
        targets?.fat || null,
        targets?.water_ml || null,
      ]
    );
    day = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM nutrition_days WHERE id = ?',
      [id]
    );
  }

  return mapRowToNutritionDay(day!);
};

export const addNutritionEntry = async (
  entry: Omit<NutritionEntry, 'id' | 'logged_at'>
): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    `INSERT INTO nutrition_entries (id, nutrition_day_id, user_id, label, calories, protein, carbs, fat, water_ml, meal_template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.nutrition_day_id,
      entry.user_id,
      entry.label || null,
      entry.calories,
      entry.protein || null,
      entry.carbs || null,
      entry.fat || null,
      entry.water_ml,
      entry.meal_template_id || null,
    ]
  );

  await addToSyncQueue('insert', 'nutrition_entries', id, entry);
  return id;
};

export const getNutritionEntriesForDay = async (dayId: string): Promise<NutritionEntry[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM nutrition_entries WHERE nutrition_day_id = ? ORDER BY logged_at',
    [dayId]
  );
  return rows.map(mapRowToNutritionEntry);
};

// Nutrition entry edit/delete
export const deleteNutritionEntry = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM nutrition_entries WHERE id = ?', [id]);
  await addToSyncQueue('delete', 'nutrition_entries', id, {});
};

export const updateNutritionEntry = async (
  id: string,
  fields: { label?: string | null; calories?: number; protein?: number | null; carbs?: number | null; fat?: number | null }
): Promise<void> => {
  const database = await getDatabase();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.label !== undefined) { sets.push('label = ?'); values.push(fields.label ?? null); }
  if (fields.calories !== undefined) { sets.push('calories = ?'); values.push(fields.calories); }
  if (fields.protein !== undefined) { sets.push('protein = ?'); values.push(fields.protein ?? null); }
  if (fields.carbs !== undefined) { sets.push('carbs = ?'); values.push(fields.carbs ?? null); }
  if (fields.fat !== undefined) { sets.push('fat = ?'); values.push(fields.fat ?? null); }

  if (sets.length === 0) return;
  values.push(id);

  await database.runAsync(
    `UPDATE nutrition_entries SET ${sets.join(', ')} WHERE id = ?`,
    values as (string | number | null)[]
  );
  await addToSyncQueue('update', 'nutrition_entries', id, fields as Record<string, unknown>);
};

// Meal template CRUD
export const saveMealTemplate = async (
  userId: string,
  name: string,
  calories: number,
  protein: number | null,
  carbs: number | null,
  fat: number | null
): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    `INSERT INTO meal_templates (id, user_id, name, calories, protein, carbs, fat, water_ml, is_favorite, use_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
    [id, userId, name, calories, protein, carbs, fat]
  );

  await addToSyncQueue('insert', 'meal_templates', id, { user_id: userId, name, calories, protein, carbs, fat });
  return id;
};

export const getMealTemplates = async (userId: string): Promise<MealTemplate[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM meal_templates WHERE user_id = ? ORDER BY use_count DESC, name ASC',
    [userId]
  );
  return rows.map(mapRowToMealTemplate);
};

export const deleteMealTemplate = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM meal_templates WHERE id = ?', [id]);
  await addToSyncQueue('delete', 'meal_templates', id, {});
};

export const incrementMealTemplateUseCount = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('UPDATE meal_templates SET use_count = use_count + 1 WHERE id = ?', [id]);
};

// Nutrition history for analytics
export const getNutritionHistory = async (
  userId: string,
  days: number = 7
): Promise<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
  }>(
    `SELECT nd.date,
       COALESCE(SUM(ne.calories), 0) as total_calories,
       COALESCE(SUM(ne.protein), 0) as total_protein,
       COALESCE(SUM(ne.carbs), 0) as total_carbs,
       COALESCE(SUM(ne.fat), 0) as total_fat
     FROM nutrition_days nd
     LEFT JOIN nutrition_entries ne ON ne.nutrition_day_id = nd.id
     WHERE nd.user_id = ?
       AND nd.date >= date('now', '-' || ? || ' days')
     GROUP BY nd.date
     ORDER BY nd.date ASC`,
    [userId, days]
  );

  return rows.map((r) => ({
    date: r.date,
    calories: Math.round(r.total_calories),
    protein: Math.round(r.total_protein),
    carbs: Math.round(r.total_carbs),
    fat: Math.round(r.total_fat),
  }));
};

// Water logging
export const logWater = async (userId: string, date: string, amountMl: number): Promise<string> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    'INSERT INTO water_logs (id, user_id, date, amount_ml) VALUES (?, ?, ?, ?)',
    [id, userId, date, amountMl]
  );

  await addToSyncQueue('insert', 'water_logs', id, { user_id: userId, date, amount_ml: amountMl });
  return id;
};

export const getWaterForDay = async (userId: string, date: string): Promise<number> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount_ml), 0) as total FROM water_logs WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  return result?.total || 0;
};

// Body weight queries
export const logBodyWeight = async (
  userId: string,
  date: string,
  weightKg: number,
  notes?: string
): Promise<string> => {
  const database = await getDatabase();
  const now = new Date().toISOString();

  // Check if entry exists for this date
  const existing = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM body_weight_logs WHERE user_id = ? AND date = ?',
    [userId, date]
  );

  if (existing) {
    await database.runAsync(
      'UPDATE body_weight_logs SET weight_kg = ?, notes = ?, updated_at = ? WHERE id = ?',
      [weightKg, notes || null, now, existing.id]
    );
    await addToSyncQueue('update', 'body_weight_logs', existing.id, {
      weight_kg: weightKg,
      notes,
      updated_at: now,
    });
    return existing.id;
  }

  const id = await generateUUID();
  await database.runAsync(
    'INSERT INTO body_weight_logs (id, user_id, date, weight_kg, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, date, weightKg, notes || null, now, now]
  );
  await addToSyncQueue('insert', 'body_weight_logs', id, {
    user_id: userId,
    date,
    weight_kg: weightKg,
    notes,
  });
  return id;
};

export const getBodyWeightForDate = async (
  userId: string,
  date: string
): Promise<BodyWeightLog | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM body_weight_logs WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  return row ? mapRowToBodyWeightLog(row) : null;
};

export const getBodyWeightHistory = async (
  userId: string,
  days: number = 30
): Promise<BodyWeightLog[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM body_weight_logs
     WHERE user_id = ?
     AND date >= date('now', '-' || ? || ' days')
     ORDER BY date ASC`,
    [userId, days]
  );
  return rows.map(mapRowToBodyWeightLog);
};

export const getBodyWeightFirst = async (
  userId: string
): Promise<BodyWeightLog | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM body_weight_logs WHERE user_id = ? ORDER BY date ASC LIMIT 1',
    [userId]
  );
  return row ? mapRowToBodyWeightLog(row) : null;
};

export const deleteBodyWeightLog = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM body_weight_logs WHERE id = ?', [id]);
  await addToSyncQueue('delete', 'body_weight_logs', id, {});
};

// Sync queue
export const addToSyncQueue = async (
  type: 'insert' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const database = await getDatabase();
  const id = await generateUUID();

  await database.runAsync(
    'INSERT INTO sync_queue (id, type, table_name, record_id, payload) VALUES (?, ?, ?, ?, ?)',
    [id, type, tableName, recordId, JSON.stringify(payload)]
  );
};

export const getSyncQueue = async (): Promise<SyncOperation[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sync_queue ORDER BY created_at'
  );
  return rows.map((row) => ({
    id: row.id as string,
    type: row.type as 'insert' | 'update' | 'delete',
    table: row.table_name as string,
    record_id: row.record_id as string,
    payload: JSON.parse(row.payload as string),
    created_at: row.created_at as string,
    attempts: row.attempts as number,
    last_error: row.last_error as string | null,
  }));
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

// User settings
export const setSetting = async (key: string, value: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    [key, value]
  );
};

export const getSetting = async (key: string): Promise<string | null> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
};

// Row mappers
function mapRowToExercise(row: Record<string, unknown>): Exercise {
  return {
    id: row.id as string,
    name: row.name as string,
    primary_muscle: row.primary_muscle as Exercise['primary_muscle'],
    secondary_muscles: row.secondary_muscles
      ? JSON.parse(row.secondary_muscles as string)
      : null,
    equipment: row.equipment as Exercise['equipment'],
    movement_pattern: row.movement_pattern as Exercise['movement_pattern'],
    is_compound: row.is_compound === 1,
    is_unilateral: row.is_unilateral === 1,
    instructions: row.instructions as string | null,
    video_url: row.video_url as string | null,
    is_system: row.is_system === 1,
    user_id: row.user_id as string | null,
    created_at: row.created_at as string,
  };
}

function mapRowToWorkoutTemplate(row: Record<string, unknown>): WorkoutTemplate {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    program_id: row.program_id as string | null,
    name: row.name as string,
    day_of_week: row.day_of_week as number | null,
    order_index: row.order_index as number,
    target_duration_minutes: row.target_duration_minutes as number | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapRowToWorkoutTemplateExercise(row: Record<string, unknown>): WorkoutTemplateExercise {
  return {
    id: row.id as string,
    workout_template_id: row.workout_template_id as string,
    exercise_id: row.exercise_id as string,
    order_index: row.order_index as number,
    superset_group: row.superset_group as number | null,
    target_sets: row.target_sets as number,
    target_reps: row.target_reps as string,
    target_rpe: row.target_rpe as number | null,
    rest_seconds: row.rest_seconds as number,
    tempo: row.tempo as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
  };
}

function mapRowToWorkoutSession(row: Record<string, unknown>): WorkoutSession {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    workout_template_id: row.workout_template_id as string | null,
    template_snapshot: JSON.parse(row.template_snapshot as string),
    started_at: row.started_at as string,
    completed_at: row.completed_at as string | null,
    duration_seconds: row.duration_seconds as number | null,
    notes: row.notes as string | null,
    rating: row.rating as number | null,
    created_at: row.created_at as string,
  };
}

function mapRowToSetLog(row: Record<string, unknown>): SetLog {
  return {
    id: row.id as string,
    workout_session_id: row.workout_session_id as string,
    exercise_id: row.exercise_id as string,
    set_number: row.set_number as number,
    reps: row.reps as number,
    weight: row.weight as number,
    weight_unit: row.weight_unit as SetLog['weight_unit'],
    rpe: row.rpe as number | null,
    rest_seconds: row.rest_seconds as number | null,
    tempo: row.tempo as string | null,
    notes: row.notes as string | null,
    is_warmup: row.is_warmup === 1,
    is_dropset: row.is_dropset === 1,
    is_failure: row.is_failure === 1,
    skipped: row.skipped === 1,
    logged_at: row.logged_at as string,
  };
}

function mapRowToNutritionDay(row: Record<string, unknown>): NutritionDay {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    date: row.date as string,
    target_calories: row.target_calories as number | null,
    target_protein: row.target_protein as number | null,
    target_carbs: row.target_carbs as number | null,
    target_fat: row.target_fat as number | null,
    target_water_ml: row.target_water_ml as number | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapRowToNutritionEntry(row: Record<string, unknown>): NutritionEntry {
  return {
    id: row.id as string,
    nutrition_day_id: row.nutrition_day_id as string,
    user_id: row.user_id as string,
    label: row.label as string | null,
    calories: row.calories as number,
    protein: row.protein as number | null,
    carbs: row.carbs as number | null,
    fat: row.fat as number | null,
    water_ml: row.water_ml as number,
    meal_template_id: row.meal_template_id as string | null,
    logged_at: row.logged_at as string,
  };
}

function mapRowToMealTemplate(row: Record<string, unknown>): MealTemplate {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    calories: row.calories as number,
    protein: row.protein as number | null,
    carbs: row.carbs as number | null,
    fat: row.fat as number | null,
    water_ml: row.water_ml as number,
    is_favorite: row.is_favorite === 1,
    use_count: row.use_count as number,
    created_at: row.created_at as string,
  };
}

function mapRowToBodyWeightLog(row: Record<string, unknown>): BodyWeightLog {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    date: row.date as string,
    weight_kg: row.weight_kg as number,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
