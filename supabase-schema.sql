-- Argus scheduling app: database schema
-- Run this once in the Supabase SQL Editor on an empty project.
--
-- Access model: a user only sees schedules they are a member of.
--   owner  - full control, manages members
--   editor - can change campaigns, events, people and event types
--   viewer - read only

-- ---------------------------------------------------------------- tables

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.schedule_members (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  email text,
  created_at timestamptz not null default now(),
  primary key (schedule_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  name text not null,
  client text not null default '',
  color text not null,
  locked boolean not null default false,
  locked_by uuid references auth.users(id) on delete set null,
  locked_by_name text,
  people uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  name text not null,
  role text not null default 'Team Member',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  title text not null,
  stage text not null,
  start_date date not null,
  end_date date not null,
  assignees uuid[] not null default '{}',
  notes text,
  is_misc boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (is_misc or campaign_id is not null)
);

create table public.custom_event_types (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  stage text not null,
  titles text[] not null default '{}',
  primary key (schedule_id, stage)
);

-- Pending invitations. Owners invite an email address with a role; when a user
-- with that email signs in, accept_schedule_invites() turns the invite into a
-- schedule_members row. Owners can only be made by promoting an existing member.
create table public.schedule_invites (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (schedule_id, email)
);

create index campaigns_schedule_id_idx on public.campaigns (schedule_id);
create index people_schedule_id_idx on public.people (schedule_id);
create index events_schedule_id_idx on public.events (schedule_id);
create index events_campaign_id_idx on public.events (campaign_id);
create index schedule_members_user_id_idx on public.schedule_members (user_id);
create index schedule_invites_email_idx on public.schedule_invites (lower(email));

-- ------------------------------------------------------------- functions

-- The signed-in user's role on a schedule, or null if they are not a member.
-- Security definer so policies on schedule_members can use it without recursing.
create function public.schedule_role(sid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.schedule_members
  where schedule_id = sid and user_id = (select auth.uid())
$$;

revoke execute on function public.schedule_role(uuid) from public, anon;
grant execute on function public.schedule_role(uuid) to authenticated;

-- Whoever creates a schedule becomes its owner.
create function public.add_schedule_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.schedule_members (schedule_id, user_id, role, email)
  values (
    new.id,
    new.created_by,
    'owner',
    (select email from auth.users where id = new.created_by)
  );
  return new;
end;
$$;

revoke execute on function public.add_schedule_owner() from public, anon, authenticated;

create trigger add_schedule_owner
  after insert on public.schedules
  for each row execute function public.add_schedule_owner();

-- Converts the signed-in user's pending invites into memberships.
-- Called by the app when the schedules dashboard loads.
create function public.accept_schedule_invites()
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

-- ---------------------------------------------------- row level security

alter table public.schedules enable row level security;
alter table public.schedule_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.people enable row level security;
alter table public.events enable row level security;
alter table public.custom_event_types enable row level security;
alter table public.schedule_invites enable row level security;

-- schedules
create policy "members can view schedules" on public.schedules
  for select to authenticated
  using (created_by = (select auth.uid()) or public.schedule_role(id) is not null);

create policy "users can create their own schedules" on public.schedules
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "owners can update schedules" on public.schedules
  for update to authenticated
  using (public.schedule_role(id) = 'owner')
  with check (public.schedule_role(id) = 'owner');

create policy "owners can delete schedules" on public.schedules
  for delete to authenticated
  using (public.schedule_role(id) = 'owner');

-- schedule_members
create policy "members can view members" on public.schedule_members
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);

create policy "owners can add members" on public.schedule_members
  for insert to authenticated
  with check (public.schedule_role(schedule_id) = 'owner');

create policy "owners can change members" on public.schedule_members
  for update to authenticated
  using (public.schedule_role(schedule_id) = 'owner')
  with check (public.schedule_role(schedule_id) = 'owner');

create policy "owners can remove members" on public.schedule_members
  for delete to authenticated
  using (public.schedule_role(schedule_id) = 'owner');

-- schedule_invites: members can see pending invites, only owners manage them
create policy "members can view invites" on public.schedule_invites
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);

create policy "owners can create invites" on public.schedule_invites
  for insert to authenticated
  with check (public.schedule_role(schedule_id) = 'owner');

create policy "owners can change invites" on public.schedule_invites
  for update to authenticated
  using (public.schedule_role(schedule_id) = 'owner')
  with check (public.schedule_role(schedule_id) = 'owner');

create policy "owners can cancel invites" on public.schedule_invites
  for delete to authenticated
  using (public.schedule_role(schedule_id) = 'owner');

-- schedule content: members read, owners and editors write
create policy "members can view campaigns" on public.campaigns
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);
create policy "editors can add campaigns" on public.campaigns
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can change campaigns" on public.campaigns
  for update to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'))
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can delete campaigns" on public.campaigns
  for delete to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'));

create policy "members can view people" on public.people
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);
create policy "editors can add people" on public.people
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can change people" on public.people
  for update to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'))
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can delete people" on public.people
  for delete to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'));

create policy "members can view events" on public.events
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);
create policy "editors can add events" on public.events
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can change events" on public.events
  for update to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'))
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can delete events" on public.events
  for delete to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'));

create policy "members can view event types" on public.custom_event_types
  for select to authenticated
  using (public.schedule_role(schedule_id) is not null);
create policy "editors can add event types" on public.custom_event_types
  for insert to authenticated
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can change event types" on public.custom_event_types
  for update to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'))
  with check (public.schedule_role(schedule_id) in ('owner', 'editor'));
create policy "editors can delete event types" on public.custom_event_types
  for delete to authenticated
  using (public.schedule_role(schedule_id) in ('owner', 'editor'));
