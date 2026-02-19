import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from './database';

interface ExportData {
  exported_at: string;
  app: string;
  version: string;
  workouts: {
    date: string;
    name: string;
    duration_minutes: number | null;
    rating: number | null;
    exercises: {
      name: string;
      sets: {
        set_number: number;
        reps: number;
        weight: number;
        weight_unit: string;
        rpe: number | null;
        is_warmup: boolean;
      }[];
    }[];
  }[];
  nutrition: {
    date: string;
    entries: {
      label: string | null;
      calories: number;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
    }[];
    water_ml: number;
  }[];
  body_weight: {
    date: string;
    weight_kg: number;
    notes: string | null;
  }[];
}

export async function exportAllData(userId: string): Promise<void> {
  const database = await getDatabase();

  // Workout sessions with sets
  const sessions = await database.getAllAsync<Record<string, unknown>>(
    `SELECT ws.*, wt.name as template_name
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.workout_template_id = wt.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC`
  );

  const workouts = [];
  for (const session of sessions) {
    const sets = await database.getAllAsync<Record<string, unknown>>(
      `SELECT sl.*, e.name as exercise_name
       FROM set_logs sl
       JOIN exercises e ON sl.exercise_id = e.id
       WHERE sl.workout_session_id = ?
       ORDER BY e.name, sl.set_number`,
      [session.id as string]
    );

    // Group sets by exercise
    const exerciseMap = new Map<string, { name: string; sets: any[] }>();
    for (const set of sets) {
      const name = set.exercise_name as string;
      if (!exerciseMap.has(name)) {
        exerciseMap.set(name, { name, sets: [] });
      }
      exerciseMap.get(name)!.sets.push({
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        weight_unit: set.weight_unit,
        rpe: set.rpe,
        is_warmup: set.is_warmup === 1,
      });
    }

    const snapshot = session.template_snapshot
      ? JSON.parse(session.template_snapshot as string)
      : null;

    workouts.push({
      date: session.started_at as string,
      name: (session.template_name as string) || snapshot?.name || 'Quick Workout',
      duration_minutes: session.duration_seconds
        ? Math.round((session.duration_seconds as number) / 60)
        : null,
      rating: session.rating as number | null,
      exercises: Array.from(exerciseMap.values()),
    });
  }

  // Nutrition
  const nutritionDays = await database.getAllAsync<Record<string, unknown>>(
    `SELECT nd.id, nd.date,
       COALESCE((SELECT SUM(wl.amount_ml) FROM water_logs wl WHERE wl.date = nd.date AND wl.user_id = ?), 0) as water_ml
     FROM nutrition_days nd
     WHERE nd.user_id = ?
     ORDER BY nd.date DESC`,
    [userId, userId]
  );

  const nutrition = [];
  for (const day of nutritionDays) {
    const entries = await database.getAllAsync<Record<string, unknown>>(
      'SELECT label, calories, protein, carbs, fat FROM nutrition_entries WHERE nutrition_day_id = ? ORDER BY logged_at',
      [day.id as string]
    );

    if (entries.length === 0) continue;

    nutrition.push({
      date: day.date as string,
      entries: entries.map((e) => ({
        label: e.label as string | null,
        calories: e.calories as number,
        protein: e.protein as number | null,
        carbs: e.carbs as number | null,
        fat: e.fat as number | null,
      })),
      water_ml: day.water_ml as number,
    });
  }

  // Body weight
  const weightRows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT date, weight_kg, notes FROM body_weight_logs WHERE user_id = ? ORDER BY date DESC',
    [userId]
  );

  const body_weight = weightRows.map((w) => ({
    date: w.date as string,
    weight_kg: w.weight_kg as number,
    notes: w.notes as string | null,
  }));

  const exportData: ExportData = {
    exported_at: new Date().toISOString(),
    app: 'Forge Fitness',
    version: '1.0.0',
    workouts,
    nutrition,
    body_weight,
  };

  const json = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().split('T')[0];
  const filename = `forge-fitness-export-${date}.json`;
  const file = new File(Paths.cache, filename);

  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Forge Fitness Data',
      UTI: 'public.json',
    });
  }
}

export async function exportAsCSV(userId: string): Promise<void> {
  const database = await getDatabase();

  // Build CSV for workout sets
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT
       ws.started_at as date,
       COALESCE(wt.name, 'Quick Workout') as workout_name,
       e.name as exercise_name,
       sl.set_number,
       sl.reps,
       sl.weight,
       sl.weight_unit,
       sl.rpe,
       sl.is_warmup
     FROM set_logs sl
     JOIN workout_sessions ws ON sl.workout_session_id = ws.id
     JOIN exercises e ON sl.exercise_id = e.id
     LEFT JOIN workout_templates wt ON ws.workout_template_id = wt.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC, e.name, sl.set_number`
  );

  let csv = 'Date,Workout,Exercise,Set,Reps,Weight,Unit,RPE,Warmup\n';
  for (const row of rows) {
    const date = (row.date as string).split('T')[0];
    const workout = escapeCsv(row.workout_name as string);
    const exercise = escapeCsv(row.exercise_name as string);
    csv += `${date},${workout},${exercise},${row.set_number},${row.reps},${row.weight},${row.weight_unit},${row.rpe || ''},${row.is_warmup === 1 ? 'Yes' : 'No'}\n`;
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `forge-fitness-workouts-${date}.csv`;
  const file = new File(Paths.cache, filename);

  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Workout Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
