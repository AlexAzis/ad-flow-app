-- Migration: schedule invites + member management
-- Run this in the Supabase SQL Editor on a database that already has the
-- tables from supabase-schema.sql. Safe to run more than once.

create table if not exists public.schedule_invites (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (schedule_id, email)
);

create index if not exists schedule_invites_email_idx on public.schedule_invites (lower(email));

-- Converts the signed-in user's pending invites into memberships.
-- Called by the app when the schedules dashboard loads.
create or replace function public.accept_schedule_invites()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = (select auth.uid());
  if user_email is null then
    return;
  end if;
  insert into public.schedule_members (schedule_id, user_id, role, email)
  select schedule_id, (select auth.uid()), role, email
  from public.schedule_invites
  where lower(email) = lower(user_email)
  on conflict (schedule_id, user_id) do nothing;
  delete from public.schedule_invites where lower(email) = lower(user_email);
end;
$$;

revoke execute on function public.accept_schedule_invites() from public, anon;
grant execute on function public.accept_schedule_invites() to authenticated;

alter table public.schedule_invites enable row level security;

drop policy if exists "members can view invites" on public.schedule_invites;
create policy "members can view invites" on public.schedule_invites
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);

drop policy if exists "owners can create invites" on public.schedule_invites;
create policy "owners can create invites" on public.schedule_invites
  for insert to authenticated
  with check (public.schedule_role(schedule_id) = 'owner');

drop policy if exists "owners can change invites" on public.schedule_invites;
create policy "owners can change invites" on public.schedule_invites
  for update to authenticated
  using (public.schedule_role(schedule_id) = 'owner')
  with check (public.schedule_role(schedule_id) = 'owner');

drop policy if exists "owners can cancel invites" on public.schedule_invites;
create policy "owners can cancel invites" on public.schedule_invites
  for delete to authenticated
  using (public.schedule_role(schedule_id) = 'owner');
