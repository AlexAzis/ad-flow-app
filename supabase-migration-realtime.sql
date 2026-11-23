-- Realtime: broadcast saved changes to everyone viewing the same schedule.
-- Idempotent - only adds tables that aren't already in the publication.
do $$
declare t text;
begin
  foreach t in array array['campaigns', 'people', 'events', 'custom_event_types'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
