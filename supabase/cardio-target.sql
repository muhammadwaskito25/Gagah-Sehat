-- Jalankan sekali di Supabase > SQL Editor (target km/menit untuk cardio di routine gym)
alter table routine_exercises add column if not exists target_distance_m numeric;
alter table routine_exercises add column if not exists target_duration_s int;

-- "Lari Outdoor" jadi "Lari"
update exercises set name = 'Lari' where user_id is null and name = 'Lari Outdoor';
