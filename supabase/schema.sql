-- Jalankan sekali di Supabase > SQL Editor

create extension if not exists pgcrypto;

-- ========== TABEL ==========
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade default auth.uid(), -- null = bawaan
  name text not null,
  muscle_group text,
  equipment text,
  created_at timestamptz default now()
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position int not null default 0,
  target_sets int not null default 3,
  target_reps text default '8-12',
  rest_seconds int not null default 90
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  routine_id uuid references routines on delete set null,
  name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  workout_id uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position int not null default 0,     -- urutan latihan di sesi
  set_index int not null default 0,    -- urutan set
  weight numeric not null default 0,
  reps int not null default 0,
  set_type text not null default 'normal', -- normal | warmup | drop | failure
  created_at timestamptz default now()
);
create index if not exists workout_sets_ex_idx on workout_sets (exercise_id, created_at desc);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  strava_id bigint unique,
  source text not null default 'manual', -- manual | strava
  name text,
  sport_type text default 'Run',
  start_date timestamptz not null,
  distance_m numeric not null default 0,
  moving_time_s int not null default 0,
  elapsed_time_s int,
  elevation_gain_m numeric,
  avg_hr numeric,
  created_at timestamptz default now()
);
create index if not exists runs_date_idx on runs (user_id, start_date desc);

create table if not exists strava_tokens (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null
);

-- ========== RLS ==========
alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table runs enable row level security;
alter table strava_tokens enable row level security;

create policy "exercises read" on exercises for select using (user_id is null or user_id = auth.uid());
create policy "exercises write" on exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "routines own" on routines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "routine_ex own" on routine_exercises for all
  using (exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid()));

create policy "workouts own" on workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sets own" on workout_sets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "runs own" on runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "strava own" on strava_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== SEED LATIHAN BAWAAN ==========
insert into exercises (user_id, name, muscle_group, equipment) values
 (null,'Bench Press','Dada','Barbell'),
 (null,'Incline Bench Press','Dada','Dumbbell'),
 (null,'Chest Press','Dada','Machine'),
 (null,'Chest Fly','Dada','Cable'),
 (null,'Dips','Dada','Bodyweight'),
 (null,'Squat','Kaki','Barbell'),
 (null,'Leg Press','Kaki','Machine'),
 (null,'Leg Extension','Kaki','Machine'),
 (null,'Leg Curl','Kaki','Machine'),
 (null,'Romanian Deadlift','Kaki','Barbell'),
 (null,'Lunge','Kaki','Dumbbell'),
 (null,'Hip Thrust','Kaki','Barbell'),
 (null,'Calf Raise','Kaki','Machine'),
 (null,'Deadlift','Punggung','Barbell'),
 (null,'Pull Up','Punggung','Bodyweight'),
 (null,'Lat Pulldown','Punggung','Cable'),
 (null,'Barbell Row','Punggung','Barbell'),
 (null,'Seated Cable Row','Punggung','Cable'),
 (null,'Shrug','Punggung','Dumbbell'),
 (null,'Overhead Press','Bahu','Barbell'),
 (null,'Shoulder Press','Bahu','Dumbbell'),
 (null,'Lateral Raise','Bahu','Dumbbell'),
 (null,'Rear Delt Fly','Bahu','Machine'),
 (null,'Face Pull','Bahu','Cable'),
 (null,'Bicep Curl','Lengan','Dumbbell'),
 (null,'Hammer Curl','Lengan','Dumbbell'),
 (null,'Tricep Pushdown','Lengan','Cable'),
 (null,'Skull Crusher','Lengan','Barbell'),
 (null,'Plank','Core','Bodyweight'),
 (null,'Crunch','Core','Bodyweight');
