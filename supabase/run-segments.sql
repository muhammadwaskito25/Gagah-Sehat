-- Jalankan sekali di Supabase > SQL Editor (set / interval untuk routine lari)
alter table run_routines add column if not exists segments jsonb;
