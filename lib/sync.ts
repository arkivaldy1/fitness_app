import { supabase, isSupabaseConfigured } from './supabase';
import { getSyncQueue, removeSyncQueueItem } from './database';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Table name mapping from local to Supabase
const TABLE_MAP: Record<string, string> = {
  workout_templates: 'workout_templates',
  workout_template_exercises: 'workout_template_exercises',
  workout_sessions: 'workout_sessions',
  set_logs: 'set_logs',
  nutrition_days: 'nutrition_days',
  nutrition_entries: 'nutrition_entries',
  water_logs: 'water_logs',
  meal_templates: 'meal_templates',
  exercises: 'exercises',
  programs: 'programs',
};

export const syncToSupabase = async (): Promise<SyncResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, synced: 0, failed: 0, errors: ['Supabase not configured'] };
  }

  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const operation of queue) {
    const tableName = TABLE_MAP[operation.table];
    if (!tableName) {
      errors.push(`Unknown table: ${operation.table}`);
      failed++;
      continue;
    }

    try {
      switch (operation.type) {
        case 'insert': {
          const { error } = await supabase
            .from(tableName)
            .upsert(operation.payload);
          if (error) throw error;
          break;
        }
        case 'update': {
          const { error } = await supabase
            .from(tableName)
            .update(operation.payload)
            .eq('id', operation.record_id);
          if (error) throw error;
          break;
        }
        case 'delete': {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', operation.record_id);
          if (error) throw error;
          break;
        }
      }

      await removeSyncQueueItem(operation.id);
      synced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${operation.type} ${tableName}: ${message}`);
      failed++;
    }
  }

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
  };
};

// Pull data from Supabase to local
export const pullFromSupabase = async (userId: string): Promise<SyncResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, synced: 0, failed: 0, errors: ['Supabase not configured'] };
  }

  // This would be implemented to pull and merge remote data
  // For now, we primarily push local changes up
  return { success: true, synced: 0, failed: 0, errors: [] };
};

// Check if we have pending sync operations
export const hasPendingSync = async (): Promise<boolean> => {
  const queue = await getSyncQueue();
  return queue.length > 0;
};

// Get pending sync count
export const getPendingSyncCount = async (): Promise<number> => {
  const queue = await getSyncQueue();
  return queue.length;
};
