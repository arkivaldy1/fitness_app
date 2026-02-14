// Exercise constants and seed data

import type { MuscleGroup, Equipment, MovementPattern } from '../types';

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'forearms', label: 'Forearms' },
  { value: 'quads', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'abs', label: 'Abs' },
  { value: 'obliques', label: 'Obliques' },
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'traps', label: 'Traps' },
];

export const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band', label: 'Resistance Band' },
  { value: 'other', label: 'Other' },
];

export const MOVEMENT_PATTERNS: { value: MovementPattern; label: string }[] = [
  { value: 'horizontal_push', label: 'Horizontal Push' },
  { value: 'horizontal_pull', label: 'Horizontal Pull' },
  { value: 'vertical_push', label: 'Vertical Push' },
  { value: 'vertical_pull', label: 'Vertical Pull' },
  { value: 'hip_hinge', label: 'Hip Hinge' },
  { value: 'squat', label: 'Squat' },
  { value: 'lunge', label: 'Lunge' },
  { value: 'carry', label: 'Carry' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'core', label: 'Core' },
];

// Default rest times by experience level (seconds)
export const DEFAULT_REST_TIMES = {
  beginner: {
    compound: 120,
    isolation: 90,
  },
  intermediate: {
    compound: 90,
    isolation: 60,
  },
  advanced: {
    compound: 90,
    isolation: 60,
  },
} as const;

// Default rep ranges by goal
export const DEFAULT_REP_RANGES = {
  strength: { min: 3, max: 5, typical: '3-5' },
  hypertrophy: { min: 8, max: 12, typical: '8-12' },
  endurance: { min: 15, max: 20, typical: '15-20' },
  power: { min: 1, max: 3, typical: '1-3' },
} as const;

// Seed exercises with IDs
export const SEED_EXERCISES = [
  // Chest
  { id: 'ex_chest_01', name: 'Barbell Bench Press', primary_muscle: 'chest' as MuscleGroup, secondary_muscles: ['triceps', 'shoulders'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'horizontal_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_chest_02', name: 'Incline Dumbbell Press', primary_muscle: 'chest' as MuscleGroup, secondary_muscles: ['triceps', 'shoulders'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'horizontal_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_chest_03', name: 'Cable Fly', primary_muscle: 'chest' as MuscleGroup, secondary_muscles: null, equipment: 'cable' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_chest_04', name: 'Push Up', primary_muscle: 'chest' as MuscleGroup, secondary_muscles: ['triceps', 'shoulders'] as MuscleGroup[], equipment: 'bodyweight' as Equipment, movement_pattern: 'horizontal_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_chest_05', name: 'Dumbbell Fly', primary_muscle: 'chest' as MuscleGroup, secondary_muscles: null, equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },

  // Back
  { id: 'ex_back_01', name: 'Barbell Row', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['biceps'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'horizontal_pull' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_back_02', name: 'Pull Up', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['biceps'] as MuscleGroup[], equipment: 'bodyweight' as Equipment, movement_pattern: 'vertical_pull' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_back_03', name: 'Lat Pulldown', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['biceps'] as MuscleGroup[], equipment: 'cable' as Equipment, movement_pattern: 'vertical_pull' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_back_04', name: 'Seated Cable Row', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['biceps'] as MuscleGroup[], equipment: 'cable' as Equipment, movement_pattern: 'horizontal_pull' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_back_05', name: 'Dumbbell Row', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['biceps'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'horizontal_pull' as MovementPattern, is_compound: true, is_unilateral: true },
  { id: 'ex_back_06', name: 'Deadlift', primary_muscle: 'back' as MuscleGroup, secondary_muscles: ['hamstrings', 'glutes', 'lower_back'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'hip_hinge' as MovementPattern, is_compound: true, is_unilateral: false },

  // Shoulders
  { id: 'ex_shoulders_01', name: 'Overhead Press', primary_muscle: 'shoulders' as MuscleGroup, secondary_muscles: ['triceps'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'vertical_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_shoulders_02', name: 'Dumbbell Shoulder Press', primary_muscle: 'shoulders' as MuscleGroup, secondary_muscles: ['triceps'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'vertical_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_shoulders_03', name: 'Lateral Raise', primary_muscle: 'shoulders' as MuscleGroup, secondary_muscles: null, equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_shoulders_04', name: 'Face Pull', primary_muscle: 'shoulders' as MuscleGroup, secondary_muscles: ['traps'] as MuscleGroup[], equipment: 'cable' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_shoulders_05', name: 'Rear Delt Fly', primary_muscle: 'shoulders' as MuscleGroup, secondary_muscles: null, equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },

  // Legs
  { id: 'ex_legs_01', name: 'Barbell Squat', primary_muscle: 'quads' as MuscleGroup, secondary_muscles: ['glutes', 'hamstrings'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'squat' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_legs_02', name: 'Romanian Deadlift', primary_muscle: 'hamstrings' as MuscleGroup, secondary_muscles: ['glutes', 'lower_back'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'hip_hinge' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_legs_03', name: 'Leg Press', primary_muscle: 'quads' as MuscleGroup, secondary_muscles: ['glutes'] as MuscleGroup[], equipment: 'machine' as Equipment, movement_pattern: 'squat' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_legs_04', name: 'Leg Curl', primary_muscle: 'hamstrings' as MuscleGroup, secondary_muscles: null, equipment: 'machine' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_legs_05', name: 'Leg Extension', primary_muscle: 'quads' as MuscleGroup, secondary_muscles: null, equipment: 'machine' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_legs_06', name: 'Hip Thrust', primary_muscle: 'glutes' as MuscleGroup, secondary_muscles: ['hamstrings'] as MuscleGroup[], equipment: 'barbell' as Equipment, movement_pattern: 'hip_hinge' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_legs_07', name: 'Calf Raise', primary_muscle: 'calves' as MuscleGroup, secondary_muscles: null, equipment: 'machine' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_legs_08', name: 'Bulgarian Split Squat', primary_muscle: 'quads' as MuscleGroup, secondary_muscles: ['glutes'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'lunge' as MovementPattern, is_compound: true, is_unilateral: true },
  { id: 'ex_legs_09', name: 'Walking Lunge', primary_muscle: 'quads' as MuscleGroup, secondary_muscles: ['glutes', 'hamstrings'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'lunge' as MovementPattern, is_compound: true, is_unilateral: true },

  // Arms
  { id: 'ex_arms_01', name: 'Barbell Curl', primary_muscle: 'biceps' as MuscleGroup, secondary_muscles: null, equipment: 'barbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_arms_02', name: 'Dumbbell Curl', primary_muscle: 'biceps' as MuscleGroup, secondary_muscles: null, equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_arms_03', name: 'Hammer Curl', primary_muscle: 'biceps' as MuscleGroup, secondary_muscles: ['forearms'] as MuscleGroup[], equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_arms_04', name: 'Tricep Pushdown', primary_muscle: 'triceps' as MuscleGroup, secondary_muscles: null, equipment: 'cable' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_arms_05', name: 'Skull Crusher', primary_muscle: 'triceps' as MuscleGroup, secondary_muscles: null, equipment: 'barbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_arms_06', name: 'Tricep Dip', primary_muscle: 'triceps' as MuscleGroup, secondary_muscles: ['chest', 'shoulders'] as MuscleGroup[], equipment: 'bodyweight' as Equipment, movement_pattern: 'vertical_push' as MovementPattern, is_compound: true, is_unilateral: false },
  { id: 'ex_arms_07', name: 'Overhead Tricep Extension', primary_muscle: 'triceps' as MuscleGroup, secondary_muscles: null, equipment: 'dumbbell' as Equipment, movement_pattern: 'isolation' as MovementPattern, is_compound: false, is_unilateral: false },

  // Core
  { id: 'ex_core_01', name: 'Plank', primary_muscle: 'abs' as MuscleGroup, secondary_muscles: ['obliques'] as MuscleGroup[], equipment: 'bodyweight' as Equipment, movement_pattern: 'core' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_core_02', name: 'Cable Crunch', primary_muscle: 'abs' as MuscleGroup, secondary_muscles: null, equipment: 'cable' as Equipment, movement_pattern: 'core' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_core_03', name: 'Hanging Leg Raise', primary_muscle: 'abs' as MuscleGroup, secondary_muscles: null, equipment: 'bodyweight' as Equipment, movement_pattern: 'core' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_core_04', name: 'Russian Twist', primary_muscle: 'obliques' as MuscleGroup, secondary_muscles: ['abs'] as MuscleGroup[], equipment: 'bodyweight' as Equipment, movement_pattern: 'core' as MovementPattern, is_compound: false, is_unilateral: false },
  { id: 'ex_core_05', name: 'Ab Wheel Rollout', primary_muscle: 'abs' as MuscleGroup, secondary_muscles: null, equipment: 'other' as Equipment, movement_pattern: 'core' as MovementPattern, is_compound: false, is_unilateral: false },
];
