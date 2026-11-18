import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';
import { Campaign, Event, Person } from './types';

export interface ScheduleData {
  campaigns: Campaign[];
  events: Event[];
  people: Person[];
  customEventTypes: Record<string, string[]>;
}

export const isRemoteEnabled = supabase !== null;

const toDateString = (date: Date) => format(new Date(date), 'yyyy-MM-dd');

const campaignToRow = (c: Campaign) => ({
  id: c.id,
  name: c.name,
  client: c.client,
  color: c.color,
  locked: c.locked ?? false,
  locked_by: c.lockedBy ?? null,
  people: c.people ?? [],
});

const rowToCampaign = (r: any): Campaign => ({
  id: r.id,
  name: r.name,
  client: r.client,
  color: r.color,
  locked: r.locked || undefined,
  lockedBy: r.locked_by ?? undefined,
  people: r.people?.length ? r.people : undefined,
});

const personToRow = (p: Person) => ({
  id: p.id,
  name: p.name,
  role: p.role,
  avatar: p.avatar ?? null,
});

const rowToPerson = (r: any): Person => ({
  id: r.id,
  name: r.name,
  role: r.role,
  avatar: r.avatar ?? undefined,
});

const eventToRow = (e: Event) => ({
  id: e.id,
  title: e.title,
  campaign_id: e.campaignId || null,
  stage: e.stage,
  start_date: toDateString(e.startDate),
  end_date: toDateString(e.endDate),
  assignee: e.assignee ?? null,
  assignees: e.assignees ?? [],
  notes: e.notes ?? null,
  color: e.color,
  is_misc: e.isMisc ?? false,
});

const rowToEvent = (r: any): Event => ({
  id: r.id,
  title: r.title,
  campaignId: r.campaign_id ?? '',
  stage: r.stage,
  startDate: parseISO(r.start_date),
  endDate: parseISO(r.end_date),
  assignee: r.assignee ?? undefined,
  assignees: r.assignees?.length ? r.assignees : undefined,
  notes: r.notes ?? undefined,
  color: r.color,
  isMisc: r.is_misc || undefined,
});

const customTypesToRows = (types: Record<string, string[]>) =>
  Object.entries(types).map(([stage, names]) => ({ stage, names }));

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function loadSchedule(): Promise<ScheduleData | null> {
  if (!supabase) return null;
  const [campaigns, events, people, customTypes] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at'),
    supabase.from('events').select('*').order('created_at'),
    supabase.from('people').select('*').order('created_at'),
    supabase.from('custom_event_types').select('*'),
  ]);
  return {
    campaigns: check(campaigns)!.map(rowToCampaign),
    events: check(events)!.map(rowToEvent),
    people: check(people)!.map(rowToPerson),
    customEventTypes: Object.fromEntries(
      (check(customTypes) as any[]).map(r => [r.stage, r.names ?? []])
    ),
  };
}

// Rows in `next` that are new or changed compared with `prev`, plus ids removed from `prev`
function diff<T extends { id: string }, R>(prev: T[], next: T[], toRow: (item: T) => R) {
  const prevRows = new Map(prev.map(item => [item.id, JSON.stringify(toRow(item))]));
  const nextIds = new Set(next.map(item => item.id));
  const upserts = next.map(toRow).filter((row, i) => prevRows.get(next[i].id) !== JSON.stringify(row));
  const deletes = prev.filter(item => !nextIds.has(item.id)).map(item => item.id);
  return { upserts, deletes };
}

// Writes only what changed between two snapshots. Order respects the events -> campaigns foreign key.
export async function saveChanges(prev: ScheduleData, next: ScheduleData): Promise<void> {
  if (!supabase) return;
  const people = diff(prev.people, next.people, personToRow);
  const campaigns = diff(prev.campaigns, next.campaigns, campaignToRow);
  const events = diff(prev.events, next.events, eventToRow);

  const prevTypes = new Map(customTypesToRows(prev.customEventTypes).map(r => [r.stage, JSON.stringify(r)]));
  const nextTypes = customTypesToRows(next.customEventTypes);
  const typeUpserts = nextTypes.filter(r => prevTypes.get(r.stage) !== JSON.stringify(r));
  const typeDeletes = Array.from(prevTypes.keys()).filter(stage => !(stage in next.customEventTypes));

  if (people.upserts.length) check(await supabase.from('people').upsert(people.upserts));
  if (campaigns.upserts.length) check(await supabase.from('campaigns').upsert(campaigns.upserts));
  if (events.upserts.length) check(await supabase.from('events').upsert(events.upserts));
  if (events.deletes.length) check(await supabase.from('events').delete().in('id', events.deletes));
  if (campaigns.deletes.length) check(await supabase.from('campaigns').delete().in('id', campaigns.deletes));
  if (people.deletes.length) check(await supabase.from('people').delete().in('id', people.deletes));
  if (typeUpserts.length) check(await supabase.from('custom_event_types').upsert(typeUpserts));
  if (typeDeletes.length) check(await supabase.from('custom_event_types').delete().in('stage', typeDeletes));
}

export const emptySchedule: ScheduleData = { campaigns: [], events: [], people: [], customEventTypes: {} };
