import { create } from 'zustand';
import { format } from 'date-fns';
import {
  logBodyWeight,
  getBodyWeightForDate,
  getBodyWeightHistory,
  getBodyWeightFirst,
  deleteBodyWeightLog,
  getSetting,
  setSetting,
} from '../lib/database';
import type { BodyWeightLog } from '../types';

interface WeightState {
  currentDate: string;
  todayEntry: BodyWeightLog | null;
  history: BodyWeightLog[];
  firstEntry: BodyWeightLog | null;
  goalWeightKg: number | null;
  isLoading: boolean;

  // Actions
  loadDay: (userId: string, date?: string) => Promise<void>;
  setDate: (date: string) => void;
  logWeight: (userId: string, weightKg: number, notes?: string) => Promise<void>;
  deleteEntry: (userId: string) => Promise<void>;
  setGoalWeight: (userId: string, weightKg: number | null) => Promise<void>;
  loadHistory: (userId: string) => Promise<void>;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  todayEntry: null,
  history: [],
  firstEntry: null,
  goalWeightKg: null,
  isLoading: false,

  loadDay: async (userId: string, date?: string) => {
    const targetDate = date || get().currentDate;
    set({ isLoading: true, currentDate: targetDate });

    try {
      // Load goal weight
      const savedGoal = await getSetting(`goal_weight_kg_${userId}`);
      const goalWeightKg = savedGoal ? parseFloat(savedGoal) : null;

      // Load entry for this date
      const todayEntry = await getBodyWeightForDate(userId, targetDate);

      // Load history (30 days)
      const history = await getBodyWeightHistory(userId, 30);

      // Load first ever entry
      const firstEntry = await getBodyWeightFirst(userId);

      set({
        todayEntry,
        history,
        firstEntry,
        goalWeightKg,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load weight day:', error);
      set({ isLoading: false });
    }
  },

  setDate: (date: string) => {
    set({ currentDate: date });
  },

  logWeight: async (userId: string, weightKg: number, notes?: string) => {
    const { currentDate } = get();

    await logBodyWeight(userId, currentDate, weightKg, notes);

    // Reload to get fresh data
    await get().loadDay(userId, currentDate);
  },

  deleteEntry: async (userId: string) => {
    const { todayEntry, currentDate } = get();
    if (!todayEntry) return;

    await deleteBodyWeightLog(todayEntry.id);
    await get().loadDay(userId, currentDate);
  },

  setGoalWeight: async (userId: string, weightKg: number | null) => {
    if (weightKg !== null) {
      await setSetting(`goal_weight_kg_${userId}`, String(weightKg));
    } else {
      await setSetting(`goal_weight_kg_${userId}`, '');
    }
    set({ goalWeightKg: weightKg });
  },

  loadHistory: async (userId: string) => {
    const history = await getBodyWeightHistory(userId, 30);
    set({ history });
  },
}));
