-- Jalankan di SQL Editor (tambahan fitur Coach)

create table if not exists coach_profile (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  goal text,
  gym_experience text,
  run_experience text,
  gym_days int,
  run_days int,
  session_minutes int,
  age int,
  height_cm numeric,
  bodyweight_kg numeric,
  gym_target text,
  run_target text,
  equipment text,
  injuries text,
  notes text,
  updated_at timestamptz default now()
);

alter table coach_profile enable row level security;
create policy "coach_profile own" on coach_profile for all using (user_id = auth.uid()) with check (user_id = auth.uid());
