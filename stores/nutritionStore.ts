import { create } from 'zustand';
import { format } from 'date-fns';
import {
  getOrCreateNutritionDay,
  getNutritionEntriesForDay,
  addNutritionEntry,
  logWater,
  getWaterForDay,
  getSetting,
  setSetting,
} from '../lib/database';
import type { NutritionDay, NutritionEntry, NutritionTargets } from '../types';

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
}

interface NutritionState {
  currentDate: string;
  day: NutritionDay | null;
  entries: NutritionEntry[];
  waterTotal: number;
  totals: NutritionTotals;
  targets: NutritionTargets | null;
  isLoading: boolean;

  // Actions
  loadDay: (userId: string, date?: string) => Promise<void>;
  setDate: (date: string) => void;
  addEntry: (entry: Omit<NutritionEntry, 'id' | 'logged_at' | 'nutrition_day_id'>) => Promise<void>;
  addWater: (userId: string, amountMl: number) => Promise<void>;
  loadTargets: (userId: string) => Promise<void>;
  updateTargets: (userId: string, targets: Omit<NutritionTargets, 'id' | 'user_id' | 'is_active' | 'created_at'>) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  day: null,
  entries: [],
  waterTotal: 0,
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 },
  targets: null,
  isLoading: false,

  loadDay: async (userId: string, date?: string) => {
    const targetDate = date || get().currentDate;
    set({ isLoading: true, currentDate: targetDate });

    try {
      // Load targets first
      await get().loadTargets(userId);
      const { targets } = get();

      // Get or create the nutrition day
      const day = await getOrCreateNutritionDay(
        userId,
        targetDate,
        targets
          ? {
              calories: targets.calories,
              protein: targets.protein,
              carbs: targets.carbs,
              fat: targets.fat,
              water_ml: targets.water_ml,
            }
          : undefined
      );

      // Load entries for the day
      const entries = await getNutritionEntriesForDay(day.id);

      // Load water total
      const waterTotal = await getWaterForDay(userId, targetDate);

      // Calculate totals
      const totals = calculateTotals(entries, waterTotal);

      set({
        day,
        entries,
        waterTotal,
        totals,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load nutrition day:', error);
      set({ isLoading: false });
    }
  },

  setDate: (date: string) => {
    set({ currentDate: date });
  },

  addEntry: async (entryData) => {
    const { day, entries, waterTotal } = get();
    if (!day) return;

    const entryId = await addNutritionEntry({
      ...entryData,
      nutrition_day_id: day.id,
    });

    const newEntry: NutritionEntry = {
      id: entryId,
      nutrition_day_id: day.id,
      user_id: entryData.user_id,
      label: entryData.label,
      calories: entryData.calories,
      protein: entryData.protein,
      carbs: entryData.carbs,
      fat: entryData.fat,
      water_ml: entryData.water_ml,
      meal_template_id: entryData.meal_template_id,
      logged_at: new Date().toISOString(),
    };

    const newEntries = [...entries, newEntry];
    const newTotals = calculateTotals(newEntries, waterTotal);

    set({
      entries: newEntries,
      totals: newTotals,
    });
  },

  addWater: async (userId: string, amountMl: number) => {
    const { currentDate, entries, waterTotal } = get();

    await logWater(userId, currentDate, amountMl);

    const newWaterTotal = waterTotal + amountMl;
    const newTotals = calculateTotals(entries, newWaterTotal);

    set({
      waterTotal: newWaterTotal,
      totals: newTotals,
    });
  },

  loadTargets: async (userId: string) => {
    try {
      const savedTargets = await getSetting(`nutrition_targets_${userId}`);
      if (savedTargets) {
        set({ targets: JSON.parse(savedTargets) });
      }
    } catch (error) {
      console.error('Failed to load nutrition targets:', error);
    }
  },

  updateTargets: async (userId: string, newTargets) => {
    const targets: NutritionTargets = {
      id: `${userId}_targets`,
      user_id: userId,
      calories: newTargets.calories,
      protein: newTargets.protein,
      carbs: newTargets.carbs,
      fat: newTargets.fat,
      water_ml: newTargets.water_ml,
      is_active: true,
      calculation_method: newTargets.calculation_method,
      calculation_inputs: newTargets.calculation_inputs,
      created_at: new Date().toISOString(),
    };

    await setSetting(`nutrition_targets_${userId}`, JSON.stringify(targets));
    set({ targets });
  },
}));

function calculateTotals(entries: NutritionEntry[], waterTotal: number): NutritionTotals {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fat: acc.fat + (entry.fat || 0),
      water_ml: acc.water_ml + (entry.water_ml || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: waterTotal }
  );
}

// Helper to calculate adherence percentage
export const calculateAdherence = (
  totals: NutritionTotals,
  targets: NutritionTargets | null
): Record<string, number> => {
  if (!targets) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
  }

  return {
    calories: Math.min(100, Math.round((totals.calories / targets.calories) * 100)),
    protein: Math.min(100, Math.round((totals.protein / targets.protein) * 100)),
    carbs: Math.min(100, Math.round((totals.carbs / targets.carbs) * 100)),
    fat: Math.min(100, Math.round((totals.fat / targets.fat) * 100)),
    water: Math.min(100, Math.round((totals.water_ml / targets.water_ml) * 100)),
  };
};

// TDEE Calculator
export const calculateTDEE = (
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): number => {
  // Mifflin-St Jeor formula
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
};

// Calculate macros based on goal
export const calculateMacros = (
  tdee: number,
  weightKg: number,
  goal: 'lose' | 'maintain' | 'gain'
): { calories: number; protein: number; carbs: number; fat: number } => {
  // Adjust calories based on goal
  let calories: number;
  switch (goal) {
    case 'lose':
      calories = tdee - 500; // ~0.5kg/week deficit
      break;
    case 'gain':
      calories = tdee + 300; // Lean bulk
      break;
    default:
      calories = tdee;
  }

  // Protein: 1.8-2.2g per kg bodyweight (use 2g)
  const protein = Math.round(weightKg * 2);

  // Fat: 0.8-1g per kg bodyweight (use 0.9g)
  const fat = Math.round(weightKg * 0.9);

  // Carbs: remaining calories
  // Protein: 4 cal/g, Fat: 9 cal/g, Carbs: 4 cal/g
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(carbCalories / 4);

  return { calories, protein, carbs: Math.max(0, carbs), fat };
};
