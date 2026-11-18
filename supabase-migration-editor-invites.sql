-- Migration: let editors manage schedule invites
-- Run this in the Supabase SQL Editor on a database that already has the
-- invite policies from supabase-schema.sql / supabase-migration-invites.sql.
-- Safe to run more than once.

drop policy if exists "owners can create invites" on public.schedule_invites;
drop policy if exists "editors can create invites" on public.schedule_invites;
create policy "editors can create invites" on public.schedule_invites
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));

drop policy if exists "owners can change invites" on public.schedule_invites;
drop policy if exists "editors can change invites" on public.schedule_invites;
create policy "editors can change invites" on public.schedule_invites
  for update to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'))
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));

drop policy if exists "owners can cancel invites" on public.schedule_invites;
drop policy if exists "editors can cancel invites" on public.schedule_invites;
create policy "editors can cancel invites" on public.schedule_invites
  for delete to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'));
