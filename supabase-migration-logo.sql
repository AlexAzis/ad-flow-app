-- Migration: schedule logos + schedule settings
-- Run this in the Supabase SQL Editor on a database that already has the
-- tables from supabase-schema.sql. Safe to run more than once.

alter table public.schedules add column if not exists logo_url text;

-- Logos live in a public bucket so schedule cards can render them directly.
-- Files are stored under <schedule_id>/<filename>; only schedule owners can
-- write, matching the update policy on public.schedules.
insert into storage.buckets (id, name, public)
values ('schedule-logos', 'schedule-logos', true)
on conflict (id) do nothing;

drop policy if exists "owners can upload schedule logos" on storage.objects;
create policy "owners can upload schedule logos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'schedule-logos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.schedule_role((storage.foldername(name))[1]::uuid) = 'owner'
  );

drop policy if exists "owners can change schedule logos" on storage.objects;
create policy "owners can change schedule logos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'schedule-logos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.schedule_role((storage.foldername(name))[1]::uuid) = 'owner'
  );

drop policy if exists "owners can remove schedule logos" on storage.objects;
create policy "owners can remove schedule logos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'schedule-logos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.schedule_role((storage.foldername(name))[1]::uuid) = 'owner'
  );
