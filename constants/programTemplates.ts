// Pre-built popular program templates

export interface ProgramTemplateExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface ProgramTemplateWorkout {
  name: string;
  dayOfWeek?: string;
  targetDuration: number;
  exercises: ProgramTemplateExercise[];
}

export interface ProgramTemplate {
  key: string;
  name: string;
  description: string;
  weeklySchedule: string;
  tips: string[];
  workouts: ProgramTemplateWorkout[];
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  // ─── Push / Pull / Legs ───────────────────────────
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Classic 6-day bodybuilding split. Each muscle group is trained twice per week through push, pull, and leg movement patterns.',
    weeklySchedule: '6 days/week (Push-Pull-Legs repeated)',
    tips: [
      'Follow the Push-Pull-Legs order, then repeat. Take one rest day per week.',
      'Focus on progressive overload — add weight or reps each week.',
      'Keep rest times strict to maintain workout intensity.',
      'If 6 days feels like too much, run it as 3 days/week instead.',
    ],
    workouts: [
      {
        name: 'Push A',
        dayOfWeek: 'Monday',
        targetDuration: 60,
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '6-8', restSeconds: 120 },
          { name: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Cable Fly', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Tricep Pushdown', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Lateral Raise', sets: 3, reps: '12-15', restSeconds: 60 },
        ],
      },
      {
        name: 'Pull A',
        dayOfWeek: 'Tuesday',
        targetDuration: 60,
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '5-6', restSeconds: 150 },
          { name: 'Pull Up', sets: 3, reps: '6-10', restSeconds: 90 },
          { name: 'Barbell Row', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Face Pull', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Barbell Curl', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'Hammer Curl', sets: 3, reps: '10-12', restSeconds: 60 },
        ],
      },
      {
        name: 'Legs A',
        dayOfWeek: 'Wednesday',
        targetDuration: 60,
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '6-8', restSeconds: 150 },
          { name: 'Romanian Deadlift', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Leg Press', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Leg Curl', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Leg Extension', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Calf Raise', sets: 4, reps: '12-15', restSeconds: 60 },
        ],
      },
      {
        name: 'Push B',
        dayOfWeek: 'Thursday',
        targetDuration: 60,
        exercises: [
          { name: 'Dumbbell Shoulder Press', sets: 4, reps: '8-10', restSeconds: 90 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Barbell Bench Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Dumbbell Fly', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Skull Crusher', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Lateral Raise', sets: 4, reps: '12-15', restSeconds: 60 },
        ],
      },
      {
        name: 'Pull B',
        dayOfWeek: 'Friday',
        targetDuration: 60,
        exercises: [
          { name: 'Barbell Row', sets: 4, reps: '6-8', restSeconds: 120 },
          { name: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Dumbbell Row', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Seated Cable Row', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Rear Delt Fly', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Dumbbell Curl', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'Hammer Curl', sets: 3, reps: '10-12', restSeconds: 60 },
        ],
      },
      {
        name: 'Legs B',
        dayOfWeek: 'Saturday',
        targetDuration: 60,
        exercises: [
          { name: 'Leg Press', sets: 4, reps: '8-10', restSeconds: 120 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Hip Thrust', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Leg Curl', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Walking Lunge', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Calf Raise', sets: 4, reps: '15-20', restSeconds: 60 },
        ],
      },
    ],
  },

  // ─── Upper / Lower ────────────────────────────────
  {
    key: 'upper_lower',
    name: 'Upper / Lower',
    description: 'Balanced 4-day split alternating upper and lower body. Great for building strength and muscle with adequate recovery time between sessions.',
    weeklySchedule: '4 days/week (Upper-Lower-Rest-Upper-Lower-Rest-Rest)',
    tips: [
      'Train Monday/Tuesday, rest Wednesday, train Thursday/Friday, rest weekend.',
      'Upper A is strength-focused (heavier), Upper B is hypertrophy-focused (higher reps).',
      'Increase weight when you can complete all sets at the top of the rep range.',
      'Perfect for intermediate lifters transitioning from full body programs.',
    ],
    workouts: [
      {
        name: 'Upper A (Strength)',
        dayOfWeek: 'Monday',
        targetDuration: 55,
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '5-6', restSeconds: 150 },
          { name: 'Barbell Row', sets: 4, reps: '5-6', restSeconds: 120 },
          { name: 'Overhead Press', sets: 3, reps: '6-8', restSeconds: 90 },
          { name: 'Lat Pulldown', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Dumbbell Curl', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'Skull Crusher', sets: 3, reps: '8-10', restSeconds: 60 },
        ],
      },
      {
        name: 'Lower A (Strength)',
        dayOfWeek: 'Tuesday',
        targetDuration: 55,
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '5-6', restSeconds: 150 },
          { name: 'Romanian Deadlift', sets: 4, reps: '6-8', restSeconds: 120 },
          { name: 'Leg Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Leg Curl', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'Calf Raise', sets: 4, reps: '10-12', restSeconds: 60 },
          { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', restSeconds: 60 },
        ],
      },
      {
        name: 'Upper B (Hypertrophy)',
        dayOfWeek: 'Thursday',
        targetDuration: 55,
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, reps: '8-12', restSeconds: 90 },
          { name: 'Seated Cable Row', sets: 4, reps: '10-12', restSeconds: 90 },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Cable Fly', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Face Pull', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Hammer Curl', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Tricep Pushdown', sets: 3, reps: '10-12', restSeconds: 60 },
        ],
      },
      {
        name: 'Lower B (Hypertrophy)',
        dayOfWeek: 'Friday',
        targetDuration: 55,
        exercises: [
          { name: 'Leg Press', sets: 4, reps: '10-12', restSeconds: 90 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Hip Thrust', sets: 4, reps: '10-12', restSeconds: 90 },
          { name: 'Leg Extension', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Leg Curl', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Calf Raise', sets: 4, reps: '15-20', restSeconds: 60 },
          { name: 'Cable Crunch', sets: 3, reps: '12-15', restSeconds: 60 },
        ],
      },
    ],
  },

  // ─── Full Body ─────────────────────────────────────
  {
    key: 'full_body',
    name: 'Full Body',
    description: 'Efficient 3-day program hitting every major muscle group each session. Ideal for beginners or those with limited training days.',
    weeklySchedule: '3 days/week (e.g., Mon-Wed-Fri)',
    tips: [
      'Always take at least one rest day between sessions for recovery.',
      'Start with the big compound lifts when you have the most energy.',
      'Focus on learning proper form before adding heavy weight.',
      'This program is perfect for beginners — expect fast progress in the first 3-6 months.',
    ],
    workouts: [
      {
        name: 'Full Body A',
        dayOfWeek: 'Monday',
        targetDuration: 50,
        exercises: [
          { name: 'Barbell Squat', sets: 3, reps: '6-8', restSeconds: 120 },
          { name: 'Barbell Bench Press', sets: 3, reps: '6-8', restSeconds: 120 },
          { name: 'Barbell Row', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Dumbbell Curl', sets: 2, reps: '10-12', restSeconds: 60 },
          { name: 'Tricep Pushdown', sets: 2, reps: '10-12', restSeconds: 60 },
          { name: 'Plank', sets: 3, reps: '30-45s', restSeconds: 60 },
        ],
      },
      {
        name: 'Full Body B',
        dayOfWeek: 'Wednesday',
        targetDuration: 50,
        exercises: [
          { name: 'Deadlift', sets: 3, reps: '5-6', restSeconds: 150 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Lat Pulldown', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Leg Press', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Lateral Raise', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Hammer Curl', sets: 2, reps: '10-12', restSeconds: 60 },
          { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', restSeconds: 60 },
        ],
      },
      {
        name: 'Full Body C',
        dayOfWeek: 'Friday',
        targetDuration: 50,
        exercises: [
          { name: 'Barbell Squat', sets: 3, reps: '8-10', restSeconds: 120 },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', restSeconds: 90 },
          { name: 'Romanian Deadlift', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'Dumbbell Fly', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'Barbell Curl', sets: 2, reps: '10-12', restSeconds: 60 },
          { name: 'Cable Crunch', sets: 3, reps: '12-15', restSeconds: 60 },
        ],
      },
    ],
  },
];
