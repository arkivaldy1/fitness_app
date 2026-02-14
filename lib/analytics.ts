import type { SetLog } from '../types';

/**
 * Estimate one-rep max using Brzycki formula.
 * Returns 0 if reps is 0 or weight is 0.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
}

/**
 * Calculate total volume from a list of sets.
 * Excludes warmup sets and skipped sets.
 */
export function calculateVolume(sets: SetLog[]): number {
  return sets.reduce((total, set) => {
    if (set.is_warmup || set.skipped) return total;
    return total + set.weight * set.reps;
  }, 0);
}

/**
 * Check if a set achieves a personal record compared to historical bests.
 */
export function checkForPR(
  weight: number,
  reps: number,
  previousMaxWeight: number | null,
  previousMaxReps: number | null
): { isWeightPR: boolean; isRepsPR: boolean } {
  return {
    isWeightPR: previousMaxWeight !== null && weight > previousMaxWeight && weight > 0,
    isRepsPR: previousMaxReps !== null && reps > previousMaxReps && reps > 0,
  };
}

/**
 * Format duration in seconds to human-readable string.
 * e.g. 3120 -> "52m", 4320 -> "1h 12m"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Compare two weeks' stats, returning percentage changes.
 */
export function compareWeeks(
  thisWeek: { total_volume: number; total_duration_seconds: number; sessions_completed: number },
  lastWeek: { total_volume: number; total_duration_seconds: number; sessions_completed: number }
): { volumeChange: number; durationChange: number; sessionsChange: number } {
  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    volumeChange: pctChange(thisWeek.total_volume, lastWeek.total_volume),
    durationChange: pctChange(thisWeek.total_duration_seconds, lastWeek.total_duration_seconds),
    sessionsChange: pctChange(thisWeek.sessions_completed, lastWeek.sessions_completed),
  };
}
