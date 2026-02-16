// Core database types - mirrors Supabase schema

export type UUID = string;

// Enums
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'kg' | 'lb';
export type Sex = 'male' | 'female' | 'other';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'obliques'
  | 'lower_back'
  | 'traps';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'squat'
  | 'lunge'
  | 'carry'
  | 'isolation'
  | 'core';

export type Goal =
  | 'hypertrophy'
  | 'strength'
  | 'power'
  | 'endurance'
  | 'fat_loss'
  | 'general_fitness';

// User Profile
export interface UserProfile {
  id: UUID;
  display_name: string | null;
  experience_level: ExperienceLevel;
  weight_unit: WeightUnit;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  sex: Sex | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Exercise Library
export interface Exercise {
  id: UUID;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[] | null;
  equipment: Equipment;
  movement_pattern: MovementPattern | null;
  is_compound: boolean;
  is_unilateral: boolean;
  instructions: string | null;
  video_url: string | null;
  is_system: boolean;
  user_id: UUID | null;
  created_at: string;
}

// Programs
export interface Program {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  is_ai_generated: boolean;
  ai_generation_inputs: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Workout Templates
export interface WorkoutTemplate {
  id: UUID;
  user_id: UUID;
  program_id: UUID | null;
  name: string;
  day_of_week: number | null;
  order_index: number;
  target_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateExercise {
  id: UUID;
  workout_template_id: UUID;
  exercise_id: UUID;
  order_index: number;
  superset_group: number | null;
  target_sets: number;
  target_reps: string;
  target_rpe: number | null;
  rest_seconds: number;
  tempo: string | null;
  notes: string | null;
  created_at: string;
}

// With joined exercise data (from database queries)
export interface WorkoutTemplateExerciseWithJoin extends WorkoutTemplateExercise {
  exercise?: {
    id: string;
    name: string;
    primary_muscle?: string;
    equipment?: string;
    is_compound?: boolean;
  };
}

// Workout Sessions (logged workouts)
export interface WorkoutSession {
  id: UUID;
  user_id: UUID;
  workout_template_id: UUID | null;
  template_snapshot: WorkoutTemplateSnapshot;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  rating: number | null;
  created_at: string;
}

export interface WorkoutTemplateSnapshot {
  name: string;
  exercises: WorkoutTemplateExerciseWithJoin[];
}

// Set Logs
export interface SetLog {
  id: UUID;
  workout_session_id: UUID;
  exercise_id: UUID;
  set_number: number;
  reps: number;
  weight: number;
  weight_unit: WeightUnit;
  rpe: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  is_warmup: boolean;
  is_dropset: boolean;
  is_failure: boolean;
  skipped: boolean;
  logged_at: string;
}

// Nutrition
export interface NutritionDay {
  id: UUID;
  user_id: UUID;
  date: string;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  target_water_ml: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionEntry {
  id: UUID;
  nutrition_day_id: UUID;
  user_id: UUID;
  label: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  water_ml: number;
  meal_template_id: UUID | null;
  logged_at: string;
}

export interface MealTemplate {
  id: UUID;
  user_id: UUID;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  water_ml: number;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
}

export interface NutritionTargets {
  id: UUID;
  user_id: UUID;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
  is_active: boolean;
  calculation_method: 'manual' | 'tdee_calculated';
  calculation_inputs: Record<string, unknown> | null;
  created_at: string;
}

export interface WaterLog {
  id: UUID;
  user_id: UUID;
  date: string;
  amount_ml: number;
  logged_at: string;
}

// Body Weight
export interface BodyWeightLog {
  id: UUID;
  user_id: UUID;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Sync types
export interface SyncOperation {
  id: UUID;
  type: 'insert' | 'update' | 'delete';
  table: string;
  record_id: UUID;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_error: string | null;
}
