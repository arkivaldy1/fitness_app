// Web-specific database implementation using localStorage
// This is a simplified version for web preview - full functionality on native

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_EXERCISES } from '../constants/exercises';
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutSession,
  SetLog,
  NutritionDay,
  NutritionEntry,
  SyncOperation,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from '../types';

// Storage keys
const KEYS = {
  exercises: 'db_exercises',
  templates: 'db_templates',
  templateExercises: 'db_template_exercises',
  sessions: 'db_sessions',
  setLogs: 'db_set_logs',
  nutritionDays: 'db_nutrition_days',
  nutritionEntries: 'db_nutrition_entries',
  waterLogs: 'db_water_logs',
  settings: 'db_settings',
  syncQueue: 'db_sync_queue',
};

// Generate UUID
export const generateUUID = async (): Promise<string> => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to get/set JSON from AsyncStorage
async function getJSON<T>(key: string): Promise<T[]> {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

async function setJSON<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

// Initialize database (seed exercises)
export const initializeDatabase = async (): Promise<void> => {
  const exercises = await getJSON<Exercise>(KEYS.exercises);

  if (exercises.length === 0) {
    // Seed exercises
    const seeded: Exercise[] = [];
    for (const ex of SEED_EXERCISES) {
      const id = await generateUUID();
      seeded.push({
        id,
        name: ex.name,
        primary_muscle: ex.primary_muscle as MuscleGroup,
        secondary_muscles: ex.secondary_muscles as MuscleGroup[] | null,
        equipment: ex.equipment as Equipment,
        movement_pattern: ex.movement_pattern as MovementPattern | null,
        is_compound: ex.is_compound,
        is_unilateral: ex.is_unilateral,
        instructions: null,
        video_url: null,
        is_system: true,
        user_id: null,
        created_at: new Date().toISOString(),
      });
    }
    await setJSON(KEYS.exercises, seeded);
  }
};

// Exercise queries
export const getAllExercises = async (): Promise<Exercise[]> => {
  const exercises = await getJSON<Exercise>(KEYS.exercises);
  return exercises.sort((a, b) => a.name.localeCompare(b.name));
};

export const getExercisesByMuscle = async (muscle: string): Promise<Exercise[]> => {
  const exercises = await getAllExercises();
  return exercises.filter((e) => e.primary_muscle === muscle);
};

export const searchExercises = async (query: string): Promise<Exercise[]> => {
  const exercises = await getAllExercises();
  const lower = query.toLowerCase();
  return exercises.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 50);
};

export const getExerciseById = async (id: string): Promise<Exercise | null> => {
  const exercises = await getAllExercises();
  return exercises.find((e) => e.id === id) || null;
};

// Workout template queries
export const createWorkoutTemplate = async (
  template: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const templates = await getJSON<WorkoutTemplate>(KEYS.templates);
  const id = await generateUUID();
  const now = new Date().toISOString();

  templates.push({
    id,
    ...template,
    created_at: now,
    updated_at: now,
  });

  await setJSON(KEYS.templates, templates);
  return id;
};

export const getWorkoutTemplates = async (userId?: string): Promise<WorkoutTemplate[]> => {
  const templates = await getJSON<WorkoutTemplate>(KEYS.templates);
  if (userId) {
    return templates.filter((t) => t.user_id === userId);
  }
  return templates;
};

export const getWorkoutTemplateWithExercises = async (templateId: string) => {
  const templates = await getJSON<WorkoutTemplate>(KEYS.templates);
  const template = templates.find((t) => t.id === templateId);

  if (!template) return null;

  const allTemplateExercises = await getJSON<WorkoutTemplateExercise & { exercise?: Exercise }>(KEYS.templateExercises);
  const exercises = allTemplateExercises
    .filter((te) => te.workout_template_id === templateId)
    .sort((a, b) => a.order_index - b.order_index);

  // Join with exercise data
  const allExercises = await getAllExercises();
  const exercisesWithData = exercises.map((te) => ({
    ...te,
    exercise: allExercises.find((e) => e.id === te.exercise_id) || {
      id: te.exercise_id,
      name: 'Unknown',
      primary_muscle: 'chest',
      equipment: 'other',
      is_compound: false,
    },
  }));

  return {
    ...template,
    exercises: exercisesWithData,
  };
};

export const addExerciseToTemplate = async (
  templateExercise: Omit<WorkoutTemplateExercise, 'id' | 'created_at'>
): Promise<string> => {
  const templateExercises = await getJSON<WorkoutTemplateExercise>(KEYS.templateExercises);
  const id = await generateUUID();

  templateExercises.push({
    id,
    ...templateExercise,
    created_at: new Date().toISOString(),
  });

  await setJSON(KEYS.templateExercises, templateExercises);
  return id;
};

// Workout session queries
export const createWorkoutSession = async (
  session: Omit<WorkoutSession, 'id' | 'created_at'>
): Promise<string> => {
  const sessions = await getJSON<WorkoutSession>(KEYS.sessions);
  const id = await generateUUID();

  sessions.push({
    id,
    ...session,
    created_at: new Date().toISOString(),
  });

  await setJSON(KEYS.sessions, sessions);
  return id;
};

export const completeWorkoutSession = async (
  sessionId: string,
  completedAt: string,
  durationSeconds: number,
  rating?: number,
  notes?: string
): Promise<void> => {
  const sessions = await getJSON<WorkoutSession>(KEYS.sessions);
  const index = sessions.findIndex((s) => s.id === sessionId);

  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      rating: rating || null,
      notes: notes || null,
    };
    await setJSON(KEYS.sessions, sessions);
  }
};

export const getRecentWorkoutSessions = async (
  userId?: string,
  limit: number = 10
): Promise<WorkoutSession[]> => {
  const sessions = await getJSON<WorkoutSession>(KEYS.sessions);
  let filtered = userId ? sessions.filter((s) => s.user_id === userId) : sessions;
  return filtered
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);
};

// Set log queries
export const logSet = async (setLog: Omit<SetLog, 'logged_at'>): Promise<void> => {
  const setLogs = await getJSON<SetLog>(KEYS.setLogs);
  const existing = setLogs.findIndex((s) => s.id === setLog.id);

  const newLog: SetLog = {
    ...setLog,
    logged_at: new Date().toISOString(),
  };

  if (existing !== -1) {
    setLogs[existing] = newLog;
  } else {
    setLogs.push(newLog);
  }

  await setJSON(KEYS.setLogs, setLogs);
};

export const getSetLogsForSession = async (sessionId: string): Promise<SetLog[]> => {
  const setLogs = await getJSON<SetLog>(KEYS.setLogs);
  return setLogs
    .filter((s) => s.workout_session_id === sessionId)
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
};

export const getLastExerciseSets = async (
  exerciseId: string,
  limit: number = 1
): Promise<{ session_date: string; sets: SetLog[] }[]> => {
  const sessions = await getJSON<WorkoutSession>(KEYS.sessions);
  const setLogs = await getJSON<SetLog>(KEYS.setLogs);

  // Find sessions with this exercise
  const sessionIds = [...new Set(
    setLogs
      .filter((s) => s.exercise_id === exerciseId)
      .map((s) => s.workout_session_id)
  )];

  const relevantSessions = sessions
    .filter((s) => sessionIds.includes(s.id) && s.completed_at)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);

  return relevantSessions.map((session) => ({
    session_date: session.started_at,
    sets: setLogs
      .filter((s) => s.workout_session_id === session.id && s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number),
  }));
};

// Nutrition queries
export const getOrCreateNutritionDay = async (
  userId: string,
  date: string,
  targets?: { calories: number; protein: number; carbs: number; fat: number; water_ml: number }
): Promise<NutritionDay> => {
  const days = await getJSON<NutritionDay>(KEYS.nutritionDays);
  let day = days.find((d) => d.user_id === userId && d.date === date);

  if (!day) {
    const id = await generateUUID();
    day = {
      id,
      user_id: userId,
      date,
      target_calories: targets?.calories || null,
      target_protein: targets?.protein || null,
      target_carbs: targets?.carbs || null,
      target_fat: targets?.fat || null,
      target_water_ml: targets?.water_ml || null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    days.push(day);
    await setJSON(KEYS.nutritionDays, days);
  }

  return day;
};

export const addNutritionEntry = async (
  entry: Omit<NutritionEntry, 'id' | 'logged_at'>
): Promise<string> => {
  const entries = await getJSON<NutritionEntry>(KEYS.nutritionEntries);
  const id = await generateUUID();

  entries.push({
    id,
    ...entry,
    logged_at: new Date().toISOString(),
  });

  await setJSON(KEYS.nutritionEntries, entries);
  return id;
};

export const getNutritionEntriesForDay = async (dayId: string): Promise<NutritionEntry[]> => {
  const entries = await getJSON<NutritionEntry>(KEYS.nutritionEntries);
  return entries
    .filter((e) => e.nutrition_day_id === dayId)
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
};

// Water logging
export const logWater = async (userId: string, date: string, amountMl: number): Promise<string> => {
  const logs = await getJSON<{ id: string; user_id: string; date: string; amount_ml: number; logged_at: string }>(KEYS.waterLogs);
  const id = await generateUUID();

  logs.push({
    id,
    user_id: userId,
    date,
    amount_ml: amountMl,
    logged_at: new Date().toISOString(),
  });

  await setJSON(KEYS.waterLogs, logs);
  return id;
};

export const getWaterForDay = async (userId: string, date: string): Promise<number> => {
  const logs = await getJSON<{ user_id: string; date: string; amount_ml: number }>(KEYS.waterLogs);
  return logs
    .filter((l) => l.user_id === userId && l.date === date)
    .reduce((sum, l) => sum + l.amount_ml, 0);
};

// Sync queue (no-op for web)
export const addToSyncQueue = async (): Promise<void> => {};
export const getSyncQueue = async (): Promise<SyncOperation[]> => [];
export const removeSyncQueueItem = async (): Promise<void> => {};

// User settings
export const setSetting = async (key: string, value: string): Promise<void> => {
  await AsyncStorage.setItem(`setting_${key}`, value);
};

export const getSetting = async (key: string): Promise<string | null> => {
  return AsyncStorage.getItem(`setting_${key}`);
};
