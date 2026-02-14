-- Forge Fitness Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User Profiles (extends Supabase Auth)
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  experience_level text default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  weight_unit text default 'kg' check (weight_unit in ('kg', 'lb')),
  height_cm numeric,
  weight_kg numeric,
  birth_date date,
  sex text check (sex in ('male', 'female', 'other')),
  timezone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Exercises Library
create table if not exists public.exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  primary_muscle text not null,
  secondary_muscles jsonb,
  equipment text not null,
  movement_pattern text,
  is_compound boolean default false,
  is_unilateral boolean default false,
  instructions text,
  video_url text,
  is_system boolean default false,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- Programs (AI-generated or custom)
create table if not exists public.programs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  duration_weeks integer,
  weekly_schedule text,
  is_ai_generated boolean default false,
  ai_generation_inputs jsonb,
  tips jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout Templates
create table if not exists public.workout_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  program_id uuid references public.programs on delete cascade,
  name text not null,
  day_of_week integer,
  order_index integer default 0,
  target_duration_minutes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout Template Exercises
create table if not exists public.workout_template_exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_template_id uuid references public.workout_templates on delete cascade not null,
  exercise_id uuid references public.exercises on delete set null,
  exercise_name text not null, -- Store name in case exercise is deleted
  order_index integer not null,
  superset_group integer,
  target_sets integer not null,
  target_reps text not null,
  target_rpe numeric,
  rest_seconds integer default 90,
  tempo text,
  notes text,
  created_at timestamptz default now()
);

-- Workout Sessions (logged workouts)
create table if not exists public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  workout_template_id uuid references public.workout_templates on delete set null,
  template_snapshot jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds integer,
  notes text,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamptz default now()
);

-- Set Logs
create table if not exists public.set_logs (
  id uuid default uuid_generate_v4() primary key,
  workout_session_id uuid references public.workout_sessions on delete cascade not null,
  exercise_id uuid references public.exercises on delete set null,
  exercise_name text not null,
  set_number integer not null,
  reps integer not null,
  weight numeric not null,
  weight_unit text not null check (weight_unit in ('kg', 'lb')),
  rpe numeric,
  rest_seconds integer,
  tempo text,
  notes text,
  is_warmup boolean default false,
  is_dropset boolean default false,
  is_failure boolean default false,
  skipped boolean default false,
  logged_at timestamptz default now()
);

-- Nutrition Days
create table if not exists public.nutrition_days (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  target_calories integer,
  target_protein numeric,
  target_carbs numeric,
  target_fat numeric,
  target_water_ml integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Nutrition Entries
create table if not exists public.nutrition_entries (
  id uuid default uuid_generate_v4() primary key,
  nutrition_day_id uuid references public.nutrition_days on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  label text,
  calories integer not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  water_ml integer default 0,
  meal_template_id uuid,
  logged_at timestamptz default now()
);

-- Nutrition Targets
create table if not exists public.nutrition_targets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  calories integer not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  water_ml integer default 2000,
  is_active boolean default true,
  calculation_method text default 'manual',
  calculation_inputs jsonb,
  created_at timestamptz default now()
);

-- Water Logs
create table if not exists public.water_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  amount_ml integer not null,
  logged_at timestamptz default now()
);

-- Meal Templates
create table if not exists public.meal_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  calories integer not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  water_ml integer default 0,
  is_favorite boolean default false,
  use_count integer default 0,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_exercises_muscle on public.exercises(primary_muscle);
create index if not exists idx_exercises_user on public.exercises(user_id);
create index if not exists idx_programs_user on public.programs(user_id);
create index if not exists idx_workout_templates_user on public.workout_templates(user_id);
create index if not exists idx_workout_templates_program on public.workout_templates(program_id);
create index if not exists idx_workout_sessions_user on public.workout_sessions(user_id);
create index if not exists idx_workout_sessions_date on public.workout_sessions(started_at);
create index if not exists idx_set_logs_session on public.set_logs(workout_session_id);
create index if not exists idx_nutrition_days_user_date on public.nutrition_days(user_id, date);
create index if not exists idx_nutrition_entries_day on public.nutrition_entries(nutrition_day_id);
create index if not exists idx_water_logs_user_date on public.water_logs(user_id, date);

-- Row Level Security (RLS)
alter table public.user_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.programs enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.nutrition_days enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.water_logs enable row level security;
alter table public.meal_templates enable row level security;

-- RLS Policies

-- User Profiles: users can only access their own profile
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);

-- Exercises: users can see system exercises and their own
create policy "Users can view system and own exercises" on public.exercises
  for select using (is_system = true or auth.uid() = user_id);
create policy "Users can create own exercises" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "Users can update own exercises" on public.exercises
  for update using (auth.uid() = user_id and is_system = false);
create policy "Users can delete own exercises" on public.exercises
  for delete using (auth.uid() = user_id and is_system = false);

-- Programs: users can only access their own
create policy "Users can manage own programs" on public.programs
  for all using (auth.uid() = user_id);

-- Workout Templates: users can only access their own
create policy "Users can manage own workout templates" on public.workout_templates
  for all using (auth.uid() = user_id);

-- Workout Template Exercises: access through template ownership
create policy "Users can manage own template exercises" on public.workout_template_exercises
  for all using (
    exists (
      select 1 from public.workout_templates
      where id = workout_template_id and user_id = auth.uid()
    )
  );

-- Workout Sessions: users can only access their own
create policy "Users can manage own workout sessions" on public.workout_sessions
  for all using (auth.uid() = user_id);

-- Set Logs: access through session ownership
create policy "Users can manage own set logs" on public.set_logs
  for all using (
    exists (
      select 1 from public.workout_sessions
      where id = workout_session_id and user_id = auth.uid()
    )
  );

-- Nutrition tables: users can only access their own
create policy "Users can manage own nutrition days" on public.nutrition_days
  for all using (auth.uid() = user_id);
create policy "Users can manage own nutrition entries" on public.nutrition_entries
  for all using (auth.uid() = user_id);
create policy "Users can manage own nutrition targets" on public.nutrition_targets
  for all using (auth.uid() = user_id);
create policy "Users can manage own water logs" on public.water_logs
  for all using (auth.uid() = user_id);
create policy "Users can manage own meal templates" on public.meal_templates
  for all using (auth.uid() = user_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_user_profiles_updated_at before update on public.user_profiles
  for each row execute procedure public.update_updated_at();
create trigger update_programs_updated_at before update on public.programs
  for each row execute procedure public.update_updated_at();
create trigger update_workout_templates_updated_at before update on public.workout_templates
  for each row execute procedure public.update_updated_at();
create trigger update_nutrition_days_updated_at before update on public.nutrition_days
  for each row execute procedure public.update_updated_at();
