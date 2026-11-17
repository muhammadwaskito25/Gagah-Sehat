-- Jalankan sekali di Supabase > SQL Editor (fitur cardio + routine lari)

-- 1. Latihan cardio di routine gym
alter table exercises add column if not exists kind text not null default 'strength'; -- strength | cardio
alter table workout_sets add column if not exists distance_m numeric;
alter table workout_sets add column if not exists duration_s int;

insert into exercises (user_id, name, muscle_group, equipment, kind)
select null, v.name, 'Cardio', v.equipment, 'cardio'
from (values
  ('Treadmill', 'Machine'),
  ('Treadmill Incline Walk', 'Machine'),
  ('Lari Outdoor', null),
  ('Sepeda Statis', 'Machine'),
  ('Elliptical', 'Machine'),
  ('Rowing Machine', 'Machine'),
  ('Stair Climber', 'Machine'),
  ('Lompat Tali', null)
) as v(name, equipment)
where not exists (select 1 from exercises e where e.user_id is null and e.name = v.name);

-- 2. Routine lari
create table if not exists run_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  run_type text not null default 'easy', -- easy | tempo | interval | long | recovery | race
  target_distance_m numeric,
  target_duration_s int,
  target_pace_s int, -- detik per km
  structure text,
  created_at timestamptz default now()
);
alter table run_routines enable row level security;
drop policy if exists "run_routines own" on run_routines;
create policy "run_routines own" on run_routines for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table runs add column if not exists run_routine_id uuid references run_routines on delete set null;
alter table runs add column if not exists notes text;
