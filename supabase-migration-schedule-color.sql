-- Adds an optional accent colour to schedules. NULL falls back to the
-- deterministic colour derived from the schedule id.
alter table public.schedules
  add column if not exists color text;
