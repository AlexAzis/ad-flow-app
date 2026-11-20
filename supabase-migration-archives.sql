-- Campaign archives: deleted campaigns can be stored for owner review/reinstatement.
create table if not exists public.archived_campaigns (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  name text not null,
  color text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists archived_campaigns_schedule_id_idx on public.archived_campaigns (schedule_id);

alter table public.archived_campaigns enable row level security;

drop policy if exists "editors can archive campaigns" on public.archived_campaigns;
create policy "editors can archive campaigns" on public.archived_campaigns
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));

drop policy if exists "owners can view archives" on public.archived_campaigns;
create policy "owners can view archives" on public.archived_campaigns
  for select to authenticated
  using (public.schedule_role(schedule_id) = 'owner');

drop policy if exists "owners can delete archives" on public.archived_campaigns;
create policy "owners can delete archives" on public.archived_campaigns
  for delete to authenticated
  using (public.schedule_role(schedule_id) = 'owner');
