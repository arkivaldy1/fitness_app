# Gym + Nutrition App — Technical Design Document

**Version**: 1.0
**Author**: System Design
**Stack**: React Native (Expo) + Supabase + Claude API
**Target**: Solo Developer, 12-16 Week MVP

---

## Table of Contents

1. [Core Concept & User Journeys](#1-core-concept--user-journeys)
2. [Workout Builder (Manual)](#2-workout-builder-manual)
3. [Workout Logging & Analytics](#3-workout-logging--analytics)
4. [AI Weekly Program Generator](#4-ai-weekly-program-generator)
5. [Nutrition & Hydration Module](#5-nutrition--hydration-module)
6. [System Architecture](#6-system-architecture)
7. [Database Schema](#7-database-schema)
8. [Engineering Principles & Hard Problems](#8-engineering-principles--hard-problems)
9. [UX Philosophy](#9-ux-philosophy)
10. [MVP Scope vs V2 Roadmap](#10-mvp-scope-vs-v2-roadmap)

---

## 1. Core Concept & User Journeys

### 1.1 Product Vision

A focused, no-nonsense training workstation. Not a social network with fitness features—a professional tool that happens to be accessible to beginners. The app should feel like a coach's clipboard: fast, reliable, and invisible when you're mid-set.

### 1.2 Primary User Loops

#### Workout Logging Loop (Core Loop — 90% of app usage)

```
Open App
    ↓
Today's Workout Shown (or choose from schedule)
    ↓
Start Workout → Timer begins
    ↓
For each exercise:
    → See target (last session's weights pre-filled)
    → Log set (tap to confirm, or modify weight/reps)
    → Rest timer auto-starts
    → Repeat for all sets
    ↓
Finish Workout
    ↓
Session Summary (volume, PRs hit, duration)
    ↓
Done (auto-saved, synced)
```

**Key Insight**: The logging loop must be optimized for one-handed use between sets. Target: <3 taps to log a set with same weight as last time.

#### Nutrition Tracking Loop

```
Open App → Nutrition Tab
    ↓
See today's progress (ring charts: calories, protein, water)
    ↓
Log entry:
    → Quick add (just macros)
    → Search food
    → Use saved meal template
    ↓
Totals update in real-time
    ↓
End of day: summary notification (optional)
```

**Key Insight**: Nutrition logging has higher friction than workout logging. Provide multiple speed levels: quick-add for experienced users, search for accuracy.

### 1.3 User Personas & Adaptive Behavior

| Persona | Characteristics | App Adaptations |
|---------|-----------------|-----------------|
| **Beginner** | New to lifting, needs guidance, doesn't know exercises | Default to AI-generated programs, exercise demo links, conservative progression, more rest time defaults |
| **Intermediate** | 1-3 years training, understands basics, wants structure | Balanced AI suggestions, can modify programs, sees more metrics (volume, e1RM) |
| **Advanced** | 3+ years, specific goals, knows what works for them | Full manual control, AI as optional tool, detailed analytics, RPE tracking enabled |
| **Athlete** | Sport-specific needs, periodization, peaking cycles | Custom periodization support, sport-specific templates, fatigue management |

**Implementation**: User selects experience level during onboarding. This sets:
- Default rest times (beginner: 90-120s, advanced: 60-90s)
- Progression rate suggestions
- UI complexity (hide RPE/tempo for beginners)
- AI prompt context for program generation

---

## 2. Workout Builder (Manual)

### 2.1 Data Model

```
Program (optional container)
├── id: uuid
├── name: string
├── description: string
├── duration_weeks: int
├── created_at: timestamp
├── user_id: uuid
└── workouts: Workout[]

Workout (template — reusable design)
├── id: uuid
├── name: string (e.g., "Push Day A")
├── target_duration_minutes: int (optional)
├── user_id: uuid
├── program_id: uuid (optional)
├── day_of_week: int (optional, for scheduling)
├── order_index: int (position in program)
├── created_at: timestamp
├── updated_at: timestamp
└── workout_exercises: WorkoutExercise[]

WorkoutExercise (exercise within a workout template)
├── id: uuid
├── workout_id: uuid
├── exercise_id: uuid
├── order_index: int
├── superset_group: int (nullable — same number = same superset)
├── target_sets: int
├── target_reps: string (e.g., "8-12" or "5")
├── target_rpe: float (optional, 6.0-10.0)
├── target_weight: float (optional, as reference)
├── rest_seconds: int
├── tempo: string (optional, e.g., "3-1-2-0")
├── notes: string (optional)
└── exercise: Exercise (joined)

Exercise (library item)
├── id: uuid
├── name: string
├── primary_muscle: enum
├── secondary_muscles: enum[]
├── equipment: enum
├── movement_pattern: enum (push/pull/hinge/squat/carry/isolation)
├── is_compound: boolean
├── is_unilateral: boolean
├── instructions: string (optional)
├── video_url: string (optional)
├── is_custom: boolean
├── user_id: uuid (nullable — null for system exercises)
└── created_at: timestamp
```

### 2.2 Field Definitions

#### Per-Set Fields (during logging)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `reps` | int | Yes | Completed reps |
| `weight` | float | Yes | In user's preferred unit (kg/lb) |
| `weight_unit` | enum | Yes | `kg` or `lb`, from user settings |
| `rpe` | float | No | 6.0-10.0, half-point increments |
| `rest_seconds` | int | No | Actual rest taken (auto-tracked) |
| `tempo` | string | No | Format: "eccentric-pause-concentric-pause" |
| `notes` | string | No | Freeform (e.g., "felt easy", "grip slipping") |
| `is_warmup` | boolean | No | Excluded from volume calculations |
| `is_dropset` | boolean | No | Marks as part of dropset sequence |
| `is_failure` | boolean | No | Reached muscular failure |

### 2.3 Exercise Library Approach

**Seed Data**: ~250 curated exercises covering:
- All major compound movements
- Common isolation exercises
- Bodyweight variations
- Cable/machine standards
- Dumbbell/barbell variants

**Structure**:
```typescript
enum MuscleGroup {
  CHEST, BACK, SHOULDERS, BICEPS, TRICEPS,
  FOREARMS, QUADS, HAMSTRINGS, GLUTES, CALVES,
  ABS, OBLIQUES, LOWER_BACK, TRAPS
}

enum Equipment {
  BARBELL, DUMBBELL, CABLE, MACHINE,
  BODYWEIGHT, KETTLEBELL, BAND, OTHER
}

enum MovementPattern {
  HORIZONTAL_PUSH, HORIZONTAL_PULL,
  VERTICAL_PUSH, VERTICAL_PULL,
  HIP_HINGE, SQUAT, LUNGE,
  CARRY, ISOLATION, CORE
}
```

**Custom Exercises**: Users can create custom exercises. These are:
- Private to the user
- Require: name, primary muscle, equipment
- Optional: secondary muscles, instructions

### 2.4 Supersets & Circuits

**Representation**: `superset_group` integer field on `WorkoutExercise`.

```
Workout: "Push Day"
├── Bench Press (superset_group: null) — standalone
├── Incline DB Press (superset_group: null) — standalone
├── Cable Fly (superset_group: 1) ─┐
├── Pushups (superset_group: 1) ───┘ Superset
├── Lateral Raise (superset_group: 2) ─┐
├── Front Raise (superset_group: 2) ───┤ Tri-set
├── Rear Delt Fly (superset_group: 2) ─┘
```

**UI Rendering**: Group exercises with same `superset_group` visually. Show connecting line/bracket.

**Logging Behavior**: When in a superset:
- After logging set for Exercise A, immediately prompt for Exercise B
- Rest timer starts only after completing all exercises in the group

### 2.5 Edit Flows & Versioning

**Problem**: Users edit workout templates, but we must preserve historical accuracy.

**Solution**: Copy-on-write for logged sessions.

```
WorkoutTemplate (mutable — user can edit freely)
    ↓ (when starting a workout)
WorkoutSession (immutable snapshot)
    ↓
SetLogs (immutable)
```

**Implementation**:
1. `WorkoutTemplate` is freely editable
2. When user starts a workout, create `WorkoutSession` with:
   - `template_id` reference (for linking)
   - `template_snapshot` JSONB (full copy of template at that moment)
3. All logged sets reference `WorkoutSession`, not `WorkoutTemplate`
4. Historical sessions remain accurate even if template changes

**Edit Scenarios**:
| Action | Effect |
|--------|--------|
| Edit template | Future sessions use new version |
| View past session | Shows snapshot from that day |
| "Copy workout" | Creates new template from historical snapshot |
| Delete template | Sessions preserved, template_id becomes orphaned (OK) |

---

## 3. Workout Logging & Analytics

### 3.1 Fast Logging UX Principles

#### Minimize Taps Philosophy

**Standard set log (unchanged from last session)**: 1 tap
- Show last session's weight/reps as default
- Single "Complete Set" button confirms
- Swipe to modify if needed

**Modified set log**: 3-4 taps
- Tap weight field → number pad appears → enter → done
- Or use +/- steppers for small adjustments

#### UI Components

```
┌─────────────────────────────────────┐
│ Bench Press                     3/4 │  ← Exercise name, set progress
│ ─────────────────────────────────── │
│  Last: 80kg × 8                     │  ← Reference from previous session
│                                     │
│  ┌─────────┐    ┌─────────┐        │
│  │  80 kg  │    │  8 reps │        │  ← Editable fields (tap to change)
│  │  [-][+] │    │  [-][+] │        │
│  └─────────┘    └─────────┘        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      ✓ COMPLETE SET         │   │  ← Primary action
│  └─────────────────────────────┘   │
│                                     │
│  [Skip Set]           [Add Note]    │  ← Secondary actions
└─────────────────────────────────────┘
```

#### Smart Defaults

1. **Weight**: Last session's weight for this exercise/set number
2. **Reps**: Last session's reps (or target if first time)
3. **Rest timer**: Starts automatically after completing set
4. **Next exercise**: Auto-advances when all sets complete

#### Quick Actions

- **Double-tap set**: Log with defaults (1 tap effective)
- **Long-press exercise**: Show recent history (last 4 sessions)
- **Swipe set left**: Mark as skipped
- **Swipe set right**: Add note

### 3.2 Progress Tracking Metrics

#### Core Metrics (MVP)

| Metric | Calculation | Display |
|--------|-------------|---------|
| **Volume** | Sets × Reps × Weight | Per exercise, per session, per week |
| **Estimated 1RM** | Brzycki formula: `weight × (36 / (37 - reps))` | Per exercise, trend over time |
| **Rep PRs** | Max reps at given weight | Badges/notifications |
| **Weight PRs** | Max weight at given rep range | Badges/notifications |
| **Adherence** | Completed sessions / Planned sessions | Weekly/monthly percentage |

#### Advanced Metrics (V2)

| Metric | Calculation | Use |
|--------|-------------|-----|
| **Tonnage** | Total weight moved (all sets × reps × weight) | Weekly load tracking |
| **Relative Intensity** | Average %1RM across session | Fatigue indicator |
| **Frequency** | Sessions per muscle group per week | Volume distribution |
| **SFR (Stimulus to Fatigue)** | Subjective rating post-session | Recovery tracking |

#### Estimated 1RM Formula

```typescript
function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + reps / 30); // Less accurate for high reps

  // Brzycki formula (most accurate for 1-10 reps)
  return weight * (36 / (37 - reps));
}
```

### 3.3 History & Comparisons

#### Exercise History View

```
┌─────────────────────────────────────┐
│ Bench Press — History               │
│ ─────────────────────────────────── │
│ Est. 1RM: 102kg (+3kg this month)   │
│                                     │
│ [Graph: 1RM trend over 8 weeks]     │
│  📈 ─────────────────────────────   │
│                                     │
│ Recent Sessions:                    │
│ ─────────────────────────────────── │
│ Feb 12  │ 85kg × 6,6,5  │ Vol: 1445 │
│ Feb 9   │ 82.5kg × 7,6,6│ Vol: 1567 │
│ Feb 5   │ 82.5kg × 6,6,6│ Vol: 1485 │
│ Feb 2   │ 80kg × 8,7,6  │ Vol: 1680 │
└─────────────────────────────────────┘
```

#### Week-over-Week Comparison

```
This Week vs Last Week:
─────────────────────────────────
Total Volume:    42,350 kg  (+8%)
Sessions:        5/5        (100%)
Avg Duration:    58 min     (-3 min)
PRs Hit:         2
─────────────────────────────────
```

### 3.4 Edge Cases

#### Skipped Sets

- Mark with `skipped: true` flag
- Excluded from volume calculations
- Preserved in history (shows pattern of fatigue/issues)
- Prompt: "Skip remaining sets for this exercise?" after first skip

#### Deload Weeks

- User can mark week as "Deload" in program settings
- AI suggestions reduce volume by 40-50%
- Analytics exclude deload weeks from progression trends
- Visual indicator on calendar/history

#### Mid-Cycle Goal Changes

- If user changes goal (e.g., hypertrophy → strength):
  1. Current program continues until natural end, OR
  2. User can request new AI program immediately
  3. Historical data preserved with original context
  4. New program starts fresh week numbering

#### Partial Workouts

- Session marked complete even if not all exercises done
- Calculate adherence as exercises_completed / exercises_planned
- Flag sessions <50% complete for review

---

## 4. AI Weekly Program Generator

### 4.1 User Inputs

#### Required Inputs

| Input | Type | Options |
|-------|------|---------|
| **Primary Goal** | enum | `hypertrophy`, `strength`, `power`, `endurance`, `fat_loss`, `general_fitness` |
| **Days Available** | int | 2-7 days per week |
| **Experience Level** | enum | `beginner`, `intermediate`, `advanced` |
| **Session Length** | int | 30-120 minutes |

#### Optional Inputs

| Input | Type | Default |
|-------|------|---------|
| **Equipment Available** | enum[] | All equipment |
| **Injuries/Limitations** | string[] | None |
| **Preferred Split** | enum | AI decides (or: `ppl`, `upper_lower`, `full_body`, `bro_split`) |
| **Weak Points** | muscle_group[] | None (balanced) |
| **Exercises to Include** | exercise_id[] | None |
| **Exercises to Exclude** | exercise_id[] | None |

### 4.2 AI Prompt Engineering

#### System Prompt Structure

```
You are an expert strength and conditioning coach creating a personalized
training program. You have deep knowledge of exercise science, periodization,
and practical gym training.

USER PROFILE:
- Experience: {experience_level}
- Goal: {primary_goal}
- Days available: {days_per_week}
- Session length: {session_length} minutes
- Equipment: {equipment_list}
- Limitations: {injuries}
- Weak points: {weak_points}

CONSTRAINTS:
- Select exercises only from the approved list provided
- Stay within evidence-based volume recommendations
- Account for recovery between sessions targeting same muscles
- Beginner: 10-15 sets per muscle group per week
- Intermediate: 15-20 sets per muscle group per week
- Advanced: 20-25 sets per muscle group per week

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
  "program_name": "string",
  "program_description": "string",
  "duration_weeks": number,
  "workouts": [
    {
      "name": "string",
      "day_of_week": number,
      "focus": "string",
      "exercises": [
        {
          "exercise_id": "uuid",
          "sets": number,
          "reps": "string",
          "rpe_target": number,
          "rest_seconds": number,
          "notes": "string",
          "rationale": "string"  // Why this exercise was chosen
        }
      ]
    }
  ],
  "progression_scheme": "string",
  "deload_protocol": "string",
  "weekly_volume_summary": {
    "muscle_group": "sets_per_week"
  }
}
```

### 4.3 Expected Outputs

#### Generated Program Structure

```typescript
interface GeneratedProgram {
  program_name: string;           // "4-Day Upper/Lower Hypertrophy"
  program_description: string;    // Overview and philosophy
  duration_weeks: number;         // 4-12 typically

  workouts: GeneratedWorkout[];

  progression_scheme: {
    type: 'linear' | 'double_progression' | 'wave' | 'rpe_based';
    description: string;
    rules: string[];              // e.g., "Add 2.5kg when you hit 3x10"
  };

  deload_protocol: {
    frequency: string;            // "Every 4th week" or "As needed based on fatigue"
    volume_reduction: number;     // 0.4-0.6 (40-60%)
    intensity_reduction: number;  // 0-0.2 (0-20%)
  };

  rationale: {
    split_choice: string;
    volume_distribution: string;
    exercise_selection: string;
  };
}
```

### 4.4 Explainability

Every generated program includes human-readable explanations:

```
┌─────────────────────────────────────────────────────────────┐
│ Why This Program?                                           │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ SPLIT: Upper/Lower (4 days)                                 │
│ With 4 days available and a hypertrophy goal, an upper/     │
│ lower split allows optimal frequency (2x/week per muscle)   │
│ while providing adequate recovery.                          │
│                                                             │
│ VOLUME: 16-20 sets per major muscle group                   │
│ As an intermediate lifter, this volume sits in the          │
│ productive range for hypertrophy while managing fatigue.    │
│                                                             │
│ EXERCISE SELECTION:                                         │
│ • Bench Press: Primary horizontal push, compounds first     │
│ • Incline DB Press: Upper chest emphasis (weak point)       │
│ • Cable Fly: Stretch-focused isolation to complement        │
│                                                             │
│ PROGRESSION: Double Progression                             │
│ Aim to add reps within 8-12 range. Once you hit 12 reps    │
│ on all sets, increase weight by 2.5kg and restart at 8.    │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Safety Constraints

#### Hard Limits (Enforced in Validation)

```typescript
const SAFETY_LIMITS = {
  // Maximum sets per muscle group per week
  maxWeeklySets: {
    beginner: 15,
    intermediate: 22,
    advanced: 28
  },

  // Maximum sets per muscle group per session
  maxSessionSets: {
    beginner: 8,
    intermediate: 12,
    advanced: 16
  },

  // Minimum rest days between same muscle groups
  minRestDays: {
    compounds: 2,     // 48 hours between heavy compounds
    isolation: 1      // 24 hours OK for isolation
  },

  // RPE caps by experience
  maxRPE: {
    beginner: 8,      // Never to failure
    intermediate: 9,
    advanced: 10
  },

  // Progression caps (% increase per week)
  maxWeeklyProgression: {
    weight: 0.05,     // 5% max
    volume: 0.10      // 10% max
  }
};
```

#### Injury-Aware Filtering

```typescript
const INJURY_MAPPINGS = {
  'lower_back': {
    exclude_patterns: ['deadlift', 'good_morning', 'bent_over'],
    substitute_with: ['leg_press', 'hip_thrust', 'cable_row'],
    reduce_load_on: ['squat', 'row']
  },
  'shoulder': {
    exclude_patterns: ['overhead_press', 'upright_row'],
    substitute_with: ['landmine_press', 'lateral_raise'],
    reduce_load_on: ['bench_press', 'incline_press']
  },
  // ... more mappings
};
```

### 4.6 Personalization Over Time

#### Feedback Loop

```
Week 1-4: Initial program runs
    ↓
Collect data:
- Adherence rate per exercise
- Progression achieved vs expected
- RPE consistency (over/underestimating?)
- Exercises frequently skipped
- Session duration vs target
    ↓
Week 5+: Adjusted recommendations
- Reduce volume if adherence <80%
- Adjust progression rate based on actual gains
- Swap out frequently-skipped exercises
- Re-estimate session timing
```

#### Implementation

```typescript
interface UserTrainingProfile {
  // Calculated from historical data
  actual_progression_rate: {
    [exercise_id: string]: number;  // % per week achieved
  };

  preferred_exercises: string[];      // High adherence
  avoided_exercises: string[];        // Frequently skipped

  typical_session_duration: number;   // Actual vs planned

  volume_tolerance: {
    [muscle_group: string]: 'low' | 'medium' | 'high';
  };

  recovery_indicators: {
    days_between_sessions: number[];
    reported_fatigue: number[];       // If using SFR tracking
  };
}
```

### 4.7 Technical Considerations

#### Server-Based Generation (Recommended)

**Pros**:
- Full context available (exercise library, user history)
- Consistent outputs (prompt versioning)
- Usage tracking and cost management
- Can update prompts without app update

**Cons**:
- Requires connectivity
- Latency (2-5 seconds typical)
- API costs ($0.01-0.05 per generation)

**Architecture**:
```
Mobile App → Supabase Edge Function → Claude API
                    ↓
            Validate response
                    ↓
            Save to database
                    ↓
            Return to client
```

#### Cost Management

```typescript
// Estimated costs per AI generation
const AI_COSTS = {
  input_tokens: 2000,    // ~$0.003 (system prompt + context)
  output_tokens: 3000,   // ~$0.015 (full program JSON)
  total_per_generation: 0.02  // ~$0.02 per program
};

// Rate limiting
const RATE_LIMITS = {
  free_tier: 1,           // 1 generation per month
  premium: 10,            // 10 generations per month
  unlimited: Infinity     // Higher tier
};
```

#### Caching Strategy

- Cache generated programs by input hash
- If same inputs → return cached program (with freshness check)
- Reduces costs for common configurations

---

## 5. Nutrition & Hydration Module

### 5.1 Daily Tracking Fields

#### Core Fields (MVP)

| Field | Type | Unit | Required |
|-------|------|------|----------|
| `calories` | int | kcal | Yes |
| `protein` | float | grams | Yes |
| `carbohydrates` | float | grams | Yes |
| `fat` | float | grams | Yes |
| `water` | float | liters | Yes |

#### Extended Fields (V2)

| Field | Type | Unit |
|-------|------|------|
| `fiber` | float | grams |
| `sodium` | int | mg |
| `sugar` | float | grams |
| `saturated_fat` | float | grams |

### 5.2 Target Setup

#### Option A: Manual Entry

User directly enters daily targets:
- Calories: 2500 kcal
- Protein: 180g
- Carbs: 280g
- Fat: 85g
- Water: 3L

#### Option B: Goal-Based Calculator

```typescript
interface TDEECalculation {
  // Inputs
  weight: number;           // kg
  height: number;           // cm
  age: number;
  sex: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';

  // Calculated
  bmr: number;              // Mifflin-St Jeor
  tdee: number;             // BMR × activity multiplier
  target_calories: number;  // TDEE ± deficit/surplus

  // Macro split based on goal
  protein_g: number;        // 1.6-2.2g per kg bodyweight
  fat_g: number;            // 0.8-1g per kg bodyweight
  carbs_g: number;          // Remaining calories
}
```

**Formulas**:
```typescript
function calculateBMR(profile: UserProfile): number {
  // Mifflin-St Jeor (more accurate than Harris-Benedict)
  if (profile.sex === 'male') {
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

function calculateTargetCalories(tdee: number, goal: string): number {
  switch (goal) {
    case 'lose': return tdee - 500;   // ~0.5kg/week loss
    case 'gain': return tdee + 300;   // Lean bulk
    default: return tdee;
  }
}
```

### 5.3 Logging Methods

#### Method 1: Quick Add (Fastest)

Direct macro entry without food selection:
```
┌─────────────────────────────────────┐
│ Quick Add                           │
│ ─────────────────────────────────── │
│ Calories: [____] kcal               │
│ Protein:  [____] g                  │
│ Carbs:    [____] g                  │
│ Fat:      [____] g                  │
│                                     │
│ Label (optional): [____________]    │
│                                     │
│ [Add Entry]                         │
└─────────────────────────────────────┘
```

#### Method 2: Saved Meals (Templates)

```typescript
interface MealTemplate {
  id: string;
  name: string;            // "Post-workout shake"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;        // Optional

  is_favorite: boolean;
  use_count: number;       // Sort by frequency
}
```

User taps saved meal → One tap to log.

#### Method 3: Food Search (V2)

Integration with USDA FoodData Central (free API):
```typescript
// Search endpoint
GET https://api.nal.usda.gov/fdc/v1/foods/search?query=chicken+breast

// Returns
{
  "foods": [
    {
      "description": "Chicken breast, raw",
      "foodNutrients": [
        { "nutrientName": "Energy", "value": 120, "unitName": "KCAL" },
        { "nutrientName": "Protein", "value": 22.5, "unitName": "G" },
        ...
      ],
      "servingSize": 100,
      "servingSizeUnit": "g"
    }
  ]
}
```

#### Method 4: Barcode Scan (V2+)

Requires: Open Food Facts API (free) or Nutritionix (paid).
Deferred to post-MVP due to implementation complexity.

### 5.4 Water Tracking

**Simple UI**:
```
┌─────────────────────────────────────┐
│ Water Today: 1.5 / 3.0 L            │
│ ████████████░░░░░░░░░░░░░ 50%       │
│                                     │
│ [+250ml] [+500ml] [+Custom]         │
│                                     │
│ History:                            │
│ 08:30 - 500ml                       │
│ 10:15 - 250ml                       │
│ 12:00 - 500ml                       │
│ 14:30 - 250ml                       │
└─────────────────────────────────────┘
```

Quick buttons for common amounts. Tap to log instantly.

### 5.5 Weekly Trends

```
┌─────────────────────────────────────────────────────────────┐
│ This Week's Nutrition                                       │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Average Daily:                                              │
│ Calories: 2,450 / 2,500 target (98%)  ✓                    │
│ Protein:  165g / 180g target (92%)    ⚠️ Slightly low      │
│ Water:    2.8L / 3.0L target (93%)    ✓                    │
│                                                             │
│ Adherence: 6/7 days logged (86%)                           │
│                                                             │
│ [Bar chart: daily calories M-Su]                           │
│ Mon: ████████████████████ 2,500                            │
│ Tue: ███████████████████  2,380                            │
│ Wed: ████████████████████ 2,520                            │
│ Thu: ██████████████       1,850  ← Low day                 │
│ Fri: █████████████████████ 2,650                           │
│ Sat: ████████████████████ 2,480                            │
│ Sun: ████████████████████ 2,500                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. System Architecture

### 6.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE APP (React Native/Expo)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Workout    │  │  Nutrition  │  │  Programs   │  │  Profile   │ │
│  │  Logger     │  │  Tracker    │  │  & AI Gen   │  │  Settings  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                              │                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    LOCAL STATE (Zustand)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │ Active      │  │ Today's     │  │ Pending Sync Queue  │   │  │
│  │  │ Session     │  │ Nutrition   │  │ (offline changes)   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 LOCAL DB (SQLite via expo-sqlite)             │  │
│  │         Offline-first storage, syncs to Supabase              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   SYNC ENGINE     │
                          │ (Realtime + REST) │
                          └─────────┬─────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE BACKEND                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │    Auth     │  │  PostgreSQL │  │   Storage   │  │   Edge     │ │
│  │  (built-in) │  │  (database) │  │  (if media) │  │  Functions │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                            │        │
│                                         ┌──────────────────┘        │
│                                         ▼                           │
│                              ┌─────────────────────┐                │
│                              │  AI Generation      │                │
│                              │  (Claude API call)  │                │
│                              └─────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Frontend Architecture

#### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React Native + Expo | Cross-platform, fast iteration, good DX |
| Navigation | Expo Router | File-based routing, familiar patterns |
| State | Zustand | Simple, performant, minimal boilerplate |
| Local DB | expo-sqlite | Offline-first, direct SQL, fast |
| Styling | NativeWind (Tailwind) | Consistent styling, rapid development |
| Forms | React Hook Form + Zod | Type-safe validation |

#### State Management Strategy

```typescript
// Global state (Zustand)
interface AppState {
  // Active workout session (survives app backgrounding)
  activeSession: WorkoutSession | null;

  // Today's nutrition (quick access)
  todayNutrition: NutritionDay;

  // Sync state
  pendingSyncs: SyncOperation[];
  lastSyncAt: Date | null;
  isOnline: boolean;

  // User preferences (cached)
  userSettings: UserSettings;
}

// Local-first approach
// 1. Write to SQLite immediately
// 2. Add to pendingSyncs queue
// 3. Sync to Supabase when online
// 4. Remove from queue on success
```

### 6.3 Backend Services

#### Supabase Configuration

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_exercise_library.sql
│   └── 003_rls_policies.sql
├── functions/
│   ├── generate-program/
│   │   └── index.ts          # AI program generation
│   └── sync-workout/
│       └── index.ts          # Conflict resolution
└── seed/
    └── exercises.sql         # Initial exercise library
```

#### Edge Functions

**1. AI Program Generation**
```typescript
// supabase/functions/generate-program/index.ts
import { Anthropic } from '@anthropic-ai/sdk';

export async function handler(req: Request) {
  const { userId, inputs } = await req.json();

  // Validate user has generation credits
  const user = await supabase.from('users').select('ai_credits').eq('id', userId).single();
  if (user.ai_credits <= 0) {
    return new Response('No credits remaining', { status: 402 });
  }

  // Fetch exercise library for context
  const exercises = await supabase.from('exercises').select('*');

  // Call Claude API
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(exercises),
    messages: [{ role: 'user', content: buildUserPrompt(inputs) }]
  });

  // Parse and validate response
  const program = parseAndValidateProgram(response.content);

  // Save to database
  await supabase.from('programs').insert(program);

  // Deduct credit
  await supabase.from('users').update({ ai_credits: user.ai_credits - 1 }).eq('id', userId);

  return new Response(JSON.stringify(program));
}
```

### 6.4 Offline-First Sync Strategy

#### Core Principles

1. **Write locally first**: All user actions write to SQLite immediately
2. **Queue for sync**: Changes added to sync queue with timestamp
3. **Background sync**: When online, process queue in order
4. **Conflict resolution**: Last-write-wins with server timestamp authority

#### Sync Implementation

```typescript
interface SyncOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  record_id: string;
  payload: object;
  created_at: Date;
  attempts: number;
  last_error?: string;
}

async function processSyncQueue() {
  const queue = await db.selectFrom('sync_queue').orderBy('created_at').execute();

  for (const operation of queue) {
    try {
      await syncToSupabase(operation);
      await db.deleteFrom('sync_queue').where('id', operation.id).execute();
    } catch (error) {
      if (isConflict(error)) {
        await resolveConflict(operation);
      } else {
        await db.update('sync_queue')
          .set({ attempts: operation.attempts + 1, last_error: error.message })
          .where('id', operation.id)
          .execute();
      }
    }
  }
}
```

#### Conflict Resolution Rules

| Scenario | Resolution |
|----------|------------|
| Same record modified locally and remotely | Server wins, merge local notes |
| Local delete, remote update | Keep remote (user may have updated on other device) |
| Local create, ID collision | Regenerate local UUID |
| Template modified, session in progress | Session keeps snapshot, template updates apply to future |

---

## 7. Database Schema

### 7.1 Core Tables

```sql
-- Users and Authentication (Supabase Auth handles most of this)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  birth_date DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise Library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT NOT NULL,
  movement_pattern TEXT,
  is_compound BOOLEAN DEFAULT false,
  is_unilateral BOOLEAN DEFAULT false,
  instructions TEXT,
  video_url TEXT,
  is_system BOOLEAN DEFAULT true,  -- System-provided vs user-created
  user_id UUID REFERENCES user_profiles(id),  -- NULL for system exercises
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (collection of workouts)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_generation_inputs JSONB,  -- Store inputs for regeneration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Templates
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  program_id UUID REFERENCES programs(id),
  name TEXT NOT NULL,
  day_of_week INTEGER,  -- 0=Sunday, 1=Monday, etc.
  order_index INTEGER DEFAULT 0,
  target_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a workout template
CREATE TABLE workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,
  superset_group INTEGER,  -- NULL = standalone, same number = same superset
  target_sets INTEGER NOT NULL,
  target_reps TEXT NOT NULL,  -- "8-12" or "5" or "AMRAP"
  target_rpe NUMERIC(3,1),
  rest_seconds INTEGER DEFAULT 90,
  tempo TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logged workout sessions (immutable after creation)
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  workout_template_id UUID REFERENCES workout_templates(id),  -- Can be null for ad-hoc
  template_snapshot JSONB NOT NULL,  -- Full copy of template at time of session
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),  -- Session rating
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual set logs (append-only)
CREATE TABLE set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC(6,2) NOT NULL,
  weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lb')),
  rpe NUMERIC(3,1),
  rest_seconds INTEGER,
  tempo TEXT,
  notes TEXT,
  is_warmup BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition daily logs
CREATE TABLE nutrition_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  date DATE NOT NULL,
  target_calories INTEGER,
  target_protein NUMERIC(5,1),
  target_carbs NUMERIC(5,1),
  target_fat NUMERIC(5,1),
  target_water_ml INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Individual nutrition entries (append-only)
CREATE TABLE nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_day_id UUID NOT NULL REFERENCES nutrition_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  label TEXT,  -- "Lunch", "Post-workout shake", etc.
  calories INTEGER NOT NULL,
  protein NUMERIC(5,1),
  carbs NUMERIC(5,1),
  fat NUMERIC(5,1),
  water_ml INTEGER DEFAULT 0,
  meal_template_id UUID,  -- If logged from a template
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved meal templates
CREATE TABLE meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein NUMERIC(5,1),
  carbs NUMERIC(5,1),
  fat NUMERIC(5,1),
  water_ml INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User nutrition targets
CREATE TABLE nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  calories INTEGER NOT NULL,
  protein NUMERIC(5,1) NOT NULL,
  carbs NUMERIC(5,1) NOT NULL,
  fat NUMERIC(5,1) NOT NULL,
  water_ml INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  calculation_method TEXT,  -- 'manual' or 'tdee_calculated'
  calculation_inputs JSONB,  -- Store TDEE inputs if calculated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, is_active) -- Only one active target per user (partial unique)
);

-- Water logs (separate for quick logging)
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_set_logs_session ON set_logs(workout_session_id);
CREATE INDEX idx_set_logs_exercise ON set_logs(exercise_id, logged_at DESC);
CREATE INDEX idx_nutrition_days_user_date ON nutrition_days(user_id, date DESC);
CREATE INDEX idx_nutrition_entries_day ON nutrition_entries(nutrition_day_id);
CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle);
CREATE INDEX idx_exercises_user ON exercises(user_id) WHERE user_id IS NOT NULL;
```

### 7.3 Row Level Security

```sql
-- Enable RLS on all user-facing tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own workouts"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Exercises: users see system exercises + their own custom
CREATE POLICY "Users can view exercises"
  ON exercises FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create custom exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);
```

---

## 8. Engineering Principles & Hard Problems

### 8.1 Data Integrity for Workout Logs

**Principle**: Workout sessions and set logs are append-only and immutable.

**Why**: Historical accuracy is paramount. If a user looks at their bench press from 3 months ago, it must show exactly what they lifted, regardless of subsequent template edits.

**Implementation**:
```typescript
// set_logs table has no UPDATE policy in RLS
// API only exposes insert, not update

// For "corrections", use a compensation pattern:
interface SetCorrection {
  original_set_id: string;
  corrected_reps?: number;
  corrected_weight?: number;
  reason: string;
  corrected_at: Date;
}

// Or simpler: allow delete + re-insert within 24-hour window
const canModifySet = (set: SetLog) => {
  const hoursSinceLogged = (Date.now() - set.logged_at) / 3600000;
  return hoursSinceLogged < 24;
};
```

### 8.2 Idempotency

**Problem**: Network issues can cause duplicate submissions.

**Solution**: Client-generated UUIDs + upsert semantics.

```typescript
// Client generates UUID before sending
const newSet: SetLog = {
  id: crypto.randomUUID(),  // Generated client-side
  workout_session_id: session.id,
  // ... rest of data
};

// Server uses upsert
await supabase
  .from('set_logs')
  .upsert(newSet, { onConflict: 'id' });

// Duplicate submissions are no-ops (same ID = same record)
```

### 8.3 Timezone Handling

**Problem**: Nutrition tracking is date-based, but users travel.

**Principles**:
1. Store all timestamps in UTC
2. Store user's timezone preference
3. Calculate "today" using user's timezone, not server's
4. When traveling, prompt user to update timezone

```typescript
// User profile stores timezone
interface UserSettings {
  timezone: string;  // "America/New_York", "Europe/London", etc.
}

// Get "today" in user's timezone
function getUserToday(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  // Returns "2025-02-13" format
}

// Nutrition queries use user's date
const todayNutrition = await supabase
  .from('nutrition_days')
  .select('*')
  .eq('user_id', userId)
  .eq('date', getUserToday(userTimezone))
  .single();
```

### 8.4 Privacy & Security

**Data Classification**:
| Data Type | Sensitivity | Handling |
|-----------|-------------|----------|
| Email/password | High | Handled by Supabase Auth (bcrypt) |
| Weight/height | Medium | Encrypted at rest (Supabase default) |
| Workout logs | Low-Medium | Standard protection |
| Nutrition logs | Medium | May indicate medical conditions |

**Security Measures**:
1. **Row Level Security**: Every table has RLS policies
2. **API Key Protection**: Supabase anon key in app, service key only in Edge Functions
3. **HTTPS Only**: All traffic encrypted in transit
4. **Input Validation**: Zod schemas on all inputs
5. **No PII in Logs**: Workout analytics exclude personal identifiers

**Data Export/Deletion** (GDPR compliance):
```typescript
// Edge function for data export
async function exportUserData(userId: string) {
  const data = {
    profile: await supabase.from('user_profiles').select().eq('id', userId),
    workouts: await supabase.from('workout_sessions').select().eq('user_id', userId),
    nutrition: await supabase.from('nutrition_days').select().eq('user_id', userId),
    // ... all user tables
  };
  return data;  // Return as JSON download
}

// Account deletion cascade
// Tables have ON DELETE CASCADE, so deleting user_profile cleans everything
```

### 8.5 Scalability Considerations

**Current Scale (MVP)**: Hundreds to low thousands of users

**Bottleneck Analysis**:
| Component | Concern | Mitigation |
|-----------|---------|------------|
| Database reads | Exercise history queries | Index on (exercise_id, logged_at), pagination |
| Database writes | Set logging spikes | Batch writes, connection pooling (Supabase handles) |
| AI generation | API latency and cost | Queue system, caching by input hash |
| Analytics | Aggregate calculations | Materialized views for weekly/monthly stats |

**Future Scaling** (if needed):
```sql
-- Materialized view for weekly stats (refresh nightly)
CREATE MATERIALIZED VIEW user_weekly_stats AS
SELECT
  user_id,
  date_trunc('week', started_at) as week,
  COUNT(*) as sessions,
  SUM(duration_seconds) as total_duration,
  SUM((SELECT SUM(reps * weight) FROM set_logs WHERE workout_session_id = ws.id)) as total_volume
FROM workout_sessions ws
GROUP BY user_id, date_trunc('week', started_at);

-- Refresh schedule
SELECT cron.schedule('refresh-weekly-stats', '0 3 * * 1', 'REFRESH MATERIALIZED VIEW user_weekly_stats');
```

---

## 9. UX Philosophy

### 9.1 Core Principles

#### "Training Workstation" Mentality

The app should feel like a well-worn clipboard—functional, fast, and invisible when you're working hard. Every tap should have purpose.

**Anti-patterns to avoid**:
- Gamification that interrupts flow (badges after every set)
- Social features in the workout view
- Animations that delay interaction
- Modals that require dismissal

#### Speed Hierarchy

1. **<1 tap**: Complete set with same weight/reps as last time
2. **2-3 taps**: Modify weight or reps slightly
3. **4-5 taps**: Add notes, skip set, or change exercise

### 9.2 Design System

#### Typography
- **Headings**: SF Pro Display (iOS) / Roboto (Android) — Bold, high contrast
- **Body**: System default — Legible at gym distance
- **Numbers**: Tabular/monospace for weights/reps — Alignment matters

#### Color Palette
```
Primary:     #2563EB (Blue 600) — Actions, progress
Success:     #16A34A (Green 600) — PRs, completed
Warning:     #EAB308 (Yellow 500) — Deload, caution
Error:       #DC2626 (Red 600) — Failures, alerts
Background:  #0F172A (Slate 900) — Dark mode default
Surface:     #1E293B (Slate 800) — Cards, inputs
Text:        #F8FAFC (Slate 50) — Primary text
```

**Rationale**: Dark mode default (gyms are visually busy environments, dark UI reduces distraction).

#### Information Density

```
Workout Logging: HIGH DENSITY
┌─────────────────────────────────────┐
│ Bench Press            3 of 4 sets │  <- Always visible: exercise, progress
│ Last: 85kg × 8         Target: 8-10│  <- Context: previous + target
│ ┌───────┐ ┌───────┐                │
│ │ 85 kg │ │ 8 reps│    [✓ Log]     │  <- Action: minimal taps
│ └───────┘ └───────┘                │
└─────────────────────────────────────┘

Analytics: MEDIUM DENSITY
- Charts with clear labels
- Summaries before details
- Drill-down available but not forced

Nutrition: MEDIUM-HIGH DENSITY
- Ring charts for quick macro view
- List of entries scannable
- Totals always visible
```

### 9.3 Onboarding Flow

**Goal**: First logged workout within 3 minutes of install.

```
Screen 1: Welcome
"Track your training. Build your strength."
[Get Started]

Screen 2: Quick Profile (30 sec)
- Name
- Experience level (Beginner/Intermediate/Advanced)
- Primary goal (Strength/Muscle/General Fitness)
[Continue]

Screen 3: Choice
"How do you want to start?"
[Create My Own Workout]  ← Manual flow
[Generate a Program]     ← AI flow (requires account)
[Try a Sample Workout]   ← Instant gratification

Screen 4a (Sample): Instant workout loads
Pre-built "Full Body Basics" workout
User can start logging immediately
Account creation prompted after completion

Screen 4b (Create): Simple builder
Add 3-5 exercises from quick search
Set basic rep/set scheme
Start logging

Screen 4c (AI): Account + brief questionnaire
Create account (email/Google)
Answer 5 questions
Generate program (5-10 sec)
Start first workout
```

**Key Insight**: Defer account creation until the user has experienced value. The "Sample Workout" path lets users log a complete session before signing up.

### 9.4 Interaction Patterns

#### Haptic Feedback
- Set completed: Light tap
- PR achieved: Strong double-tap
- Rest timer done: Medium pulse

#### Gestures
| Gesture | Action |
|---------|--------|
| Tap set | Log with defaults |
| Long-press set | Quick history view |
| Swipe left | Skip set |
| Swipe right | Add note |
| Pull down | Refresh / sync |

#### Sound (Optional, Off by Default)
- Rest timer completion: Subtle ping
- Workout complete: Satisfying chime

---

## 10. MVP Scope vs V2 Roadmap

### 10.1 MVP Feature Set (12-16 Weeks)

#### Core (Must Have)

| Feature | Priority | Weeks |
|---------|----------|-------|
| User auth (email + Google) | P0 | 1 |
| Exercise library (200 exercises) | P0 | 1 |
| Workout template builder | P0 | 2 |
| Workout logging (full UX) | P0 | 3 |
| Session history & basic analytics | P0 | 2 |
| Nutrition quick-add + targets | P0 | 2 |
| Water tracking | P0 | 0.5 |
| Offline support + sync | P0 | 2 |
| Settings & profile | P0 | 1 |

**MVP Total: ~14.5 weeks**

#### AI Generation (P1 — Can be gated behind waitlist)

| Feature | Priority | Weeks |
|---------|----------|-------|
| AI program generation | P1 | 2 |
| Program explanation UI | P1 | 0.5 |

### 10.2 V2 Roadmap (Post-Launch)

#### Phase 1: Nutrition Depth (4-6 weeks)

- [ ] Food search (USDA API integration)
- [ ] Barcode scanning
- [ ] Meal template library
- [ ] Weekly nutrition reports

#### Phase 2: Analytics & Insights (4-6 weeks)

- [ ] Estimated 1RM tracking
- [ ] Volume per muscle group charts
- [ ] PR history and notifications
- [ ] Training frequency analysis
- [ ] Fatigue indicators (optional RPE trends)

#### Phase 3: AI Enhancement (3-4 weeks)

- [ ] AI adapts based on logged performance
- [ ] Mid-program adjustments
- [ ] Exercise substitution suggestions
- [ ] Deload recommendations

#### Phase 4: Polish & Expansion (Ongoing)

- [ ] Apple Watch / Wear OS companion
- [ ] Widget support (iOS/Android)
- [ ] Export data (CSV, JSON)
- [ ] Import from other apps
- [ ] Apple Health / Google Fit sync

### 10.3 Explicitly Deferred

| Feature | Reason |
|---------|--------|
| Social features | Distracts from core value prop |
| Coaching/trainer mode | Different user type, different UX |
| Video exercise demos | Content creation burden |
| Wearables integration | Platform complexity |
| Challenges/leaderboards | Gamification not aligned with "workstation" philosophy |
| Supplement tracking | Regulatory concerns, limited value |
| Body measurements | Can be added later, not core |
| Progress photos | Storage costs, privacy concerns |

---

## Appendix A: File Structure

```
fitness-app/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Auth screens (login, register)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── workout/              # Workout tab
│   │   │   ├── index.tsx         # Today's workout / workout list
│   │   │   ├── [id]/             # Specific workout
│   │   │   │   ├── index.tsx     # Workout detail
│   │   │   │   └── log.tsx       # Active logging session
│   │   │   ├── builder.tsx       # Create/edit workout
│   │   │   └── history.tsx       # Session history
│   │   ├── nutrition/            # Nutrition tab
│   │   │   ├── index.tsx         # Today's nutrition
│   │   │   ├── log.tsx           # Add entry
│   │   │   └── history.tsx       # Weekly view
│   │   ├── programs/             # Programs tab
│   │   │   ├── index.tsx         # My programs
│   │   │   ├── generate.tsx      # AI generation flow
│   │   │   └── [id].tsx          # Program detail
│   │   └── profile/              # Profile tab
│   │       ├── index.tsx         # Settings & profile
│   │       └── targets.tsx       # Nutrition targets
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point (redirect)
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── workout/                  # Workout-specific components
│   │   ├── SetLogger.tsx
│   │   ├── ExerciseCard.tsx
│   │   ├── RestTimer.tsx
│   │   └── ...
│   └── nutrition/                # Nutrition-specific components
│       ├── MacroRings.tsx
│       ├── EntryCard.tsx
│       └── ...
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── database.ts               # SQLite setup
│   ├── sync.ts                   # Sync engine
│   └── ai.ts                     # AI generation helpers
├── stores/
│   ├── authStore.ts              # Auth state
│   ├── workoutStore.ts           # Active workout state
│   ├── nutritionStore.ts         # Today's nutrition state
│   └── syncStore.ts              # Sync queue state
├── hooks/
│   ├── useExercises.ts
│   ├── useWorkoutHistory.ts
│   ├── useNutritionDay.ts
│   └── ...
├── types/
│   ├── database.ts               # DB schema types (generated)
│   ├── workout.ts                # Workout domain types
│   └── nutrition.ts              # Nutrition domain types
├── constants/
│   ├── exercises.ts              # Exercise enums
│   └── theme.ts                  # Design tokens
├── supabase/
│   ├── migrations/               # SQL migrations
│   ├── functions/                # Edge functions
│   └── seed/                     # Seed data
└── scripts/
    ├── generate-types.ts         # Supabase type generation
    └── seed-exercises.ts         # Exercise library seeding
```

---

## Appendix B: API Contracts

### Workout Session Lifecycle

```typescript
// Start a workout
POST /rest/v1/workout_sessions
{
  "user_id": "uuid",
  "workout_template_id": "uuid",
  "template_snapshot": { /* full template JSON */ },
  "started_at": "2025-02-13T14:30:00Z"
}

// Log a set (can be called many times)
POST /rest/v1/set_logs
{
  "id": "uuid",  // Client-generated for idempotency
  "workout_session_id": "uuid",
  "exercise_id": "uuid",
  "set_number": 1,
  "reps": 8,
  "weight": 80,
  "weight_unit": "kg",
  "logged_at": "2025-02-13T14:35:00Z"
}

// Complete the workout
PATCH /rest/v1/workout_sessions?id=eq.{id}
{
  "completed_at": "2025-02-13T15:30:00Z",
  "duration_seconds": 3600,
  "rating": 4
}
```

### AI Program Generation

```typescript
// Request generation
POST /functions/v1/generate-program
{
  "goal": "hypertrophy",
  "days_per_week": 4,
  "experience_level": "intermediate",
  "session_length_minutes": 60,
  "equipment": ["barbell", "dumbbell", "cable", "machine"],
  "injuries": [],
  "preferred_split": null,  // Let AI decide
  "weak_points": ["chest", "shoulders"]
}

// Response
{
  "program_id": "uuid",
  "program_name": "4-Day Upper/Lower Hypertrophy",
  "workouts": [...],
  "rationale": {...},
  "progression_scheme": {...}
}
```

---

## Appendix C: Exercise Library Seed (Sample)

```sql
INSERT INTO exercises (name, primary_muscle, secondary_muscles, equipment, movement_pattern, is_compound) VALUES
-- Chest
('Barbell Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'horizontal_push', true),
('Incline Dumbbell Press', 'chest', ARRAY['triceps', 'shoulders'], 'dumbbell', 'horizontal_push', true),
('Cable Fly', 'chest', NULL, 'cable', 'isolation', false),
('Push Up', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'horizontal_push', true),
('Dumbbell Fly', 'chest', NULL, 'dumbbell', 'isolation', false),

-- Back
('Barbell Row', 'back', ARRAY['biceps'], 'barbell', 'horizontal_pull', true),
('Pull Up', 'back', ARRAY['biceps'], 'bodyweight', 'vertical_pull', true),
('Lat Pulldown', 'back', ARRAY['biceps'], 'cable', 'vertical_pull', true),
('Seated Cable Row', 'back', ARRAY['biceps'], 'cable', 'horizontal_pull', true),
('Dumbbell Row', 'back', ARRAY['biceps'], 'dumbbell', 'horizontal_pull', true),

-- Shoulders
('Overhead Press', 'shoulders', ARRAY['triceps'], 'barbell', 'vertical_push', true),
('Lateral Raise', 'shoulders', NULL, 'dumbbell', 'isolation', false),
('Face Pull', 'shoulders', ARRAY['traps'], 'cable', 'isolation', false),
('Arnold Press', 'shoulders', ARRAY['triceps'], 'dumbbell', 'vertical_push', true),

-- Legs
('Barbell Squat', 'quads', ARRAY['glutes', 'hamstrings'], 'barbell', 'squat', true),
('Romanian Deadlift', 'hamstrings', ARRAY['glutes', 'lower_back'], 'barbell', 'hip_hinge', true),
('Leg Press', 'quads', ARRAY['glutes'], 'machine', 'squat', true),
('Leg Curl', 'hamstrings', NULL, 'machine', 'isolation', false),
('Leg Extension', 'quads', NULL, 'machine', 'isolation', false),
('Hip Thrust', 'glutes', ARRAY['hamstrings'], 'barbell', 'hip_hinge', true),
('Calf Raise', 'calves', NULL, 'machine', 'isolation', false),

-- Arms
('Barbell Curl', 'biceps', NULL, 'barbell', 'isolation', false),
('Tricep Pushdown', 'triceps', NULL, 'cable', 'isolation', false),
('Hammer Curl', 'biceps', ARRAY['forearms'], 'dumbbell', 'isolation', false),
('Skull Crusher', 'triceps', NULL, 'barbell', 'isolation', false),

-- Core
('Plank', 'abs', ARRAY['obliques'], 'bodyweight', 'core', false),
('Cable Crunch', 'abs', NULL, 'cable', 'core', false),
('Hanging Leg Raise', 'abs', NULL, 'bodyweight', 'core', false);

-- ... (200+ total exercises)
```

---

## Summary

This design document outlines a focused, professional fitness application built for a solo developer. Key decisions:

1. **Stack**: React Native + Expo + Supabase — minimal ops, maximum velocity
2. **Offline-first**: SQLite local storage with background sync — gym-proof reliability
3. **AI Integration**: Claude API via Edge Functions — high-quality program generation without ML infrastructure
4. **Data Model**: Append-only logs with template snapshots — historical integrity guaranteed
5. **MVP Focus**: 14-16 weeks to core workout logging + basic nutrition + AI generation
6. **UX Philosophy**: Training workstation, not social app — speed and clarity over engagement tricks

The architecture is designed to scale from hundreds to tens of thousands of users without major rewrites, while keeping the initial build achievable for a single developer.
