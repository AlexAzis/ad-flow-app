import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';
import { Campaign, Event, Person } from './types';
import { getStageColor } from './colorUtils';

export type ScheduleRole = 'owner' | 'editor' | 'viewer';

export interface ScheduleSummary {
  id: string;
  name: string;
  description: string | null;
  role: ScheduleRole;
  memberCount: number;
}

export interface ScheduleContent {
  campaigns: Campaign[];
  events: Event[];
  people: Person[];
  customEventTypes: Record<string, string[]>;
}

const PAGE_SIZE = 1000;

export async function listSchedules(userId: string): Promise<ScheduleSummary[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, name, description, schedule_members(user_id, role)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(row => {
    const members = (row.schedule_members ?? []) as { user_id: string; role: ScheduleRole }[];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      role: members.find(m => m.user_id === userId)?.role ?? 'viewer',
      memberCount: members.length,
    };
  });
}

export async function createSchedule(name: string): Promise<void> {
  const { error } = await supabase.from('schedules').insert({ name });
  if (error) throw error;
}

// Supabase returns at most 1000 rows per request, so page through larger tables
async function fetchAll(table: string, scheduleId: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function loadSchedule(scheduleId: string): Promise<ScheduleContent> {
  const [campaignRows, peopleRows, eventRows, typeResult] = await Promise.all([
    fetchAll('campaigns', scheduleId),
    fetchAll('people', scheduleId),
    fetchAll('events', scheduleId),
    supabase.from('custom_event_types').select('stage, titles').eq('schedule_id', scheduleId),
  ]);
  if (typeResult.error) throw typeResult.error;

  const campaigns: Campaign[] = campaignRows.map(row => ({
    id: row.id,
    name: row.name,
    client: row.client,
    color: row.color,
    locked: row.locked || undefined,
    lockedBy: row.locked_by_name ?? undefined,
    people: row.people ?? [],
  }));
  const people: Person[] = peopleRows.map(row => ({ id: row.id, name: row.name, role: row.role }));
  const events: Event[] = eventRows.map(row => {
    const campaign = campaigns.find(c => c.id === row.campaign_id);
    const assignees: string[] = row.assignees ?? [];
    return {
      id: row.id,
      title: row.title,
      campaignId: row.campaign_id ?? '',
      stage: row.stage,
      startDate: parseISO(row.start_date),
      endDate: parseISO(row.end_date),
      assignee: assignees[0],
      assignees: assignees.length ? assignees : undefined,
      notes: row.notes ?? undefined,
      color: row.is_misc || !campaign ? '#E5E5E5' : getStageColor(campaign.color, row.stage),
      isMisc: row.is_misc || undefined,
    };
  });
  const customEventTypes: Record<string, string[]> = {};
  (typeResult.data ?? []).forEach(row => {
    customEventTypes[row.stage] = row.titles;
  });

  return { campaigns, events, people, customEventTypes };
}

type Row = Record<string, unknown>;

function toRows(scheduleId: string, content: ScheduleContent) {
  return {
    people: content.people.map<Row>(p => ({
      id: p.id,
      schedule_id: scheduleId,
      name: p.name,
      role: p.role,
    })),
    campaigns: content.campaigns.map<Row>(c => ({
      id: c.id,
      schedule_id: scheduleId,
      name: c.name,
      client: c.client,
      color: c.color,
      locked: !!c.locked,
      locked_by_name: c.locked ? c.lockedBy ?? null : null,
      people: c.people ?? [],
    })),
    events: content.events.map<Row>(e => ({
      id: e.id,
      schedule_id: scheduleId,
      campaign_id: e.isMisc || !e.campaignId ? null : e.campaignId,
      title: e.title,
      stage: e.stage,
      start_date: format(new Date(e.startDate), 'yyyy-MM-dd'),
      end_date: format(new Date(e.endDate), 'yyyy-MM-dd'),
      assignees: e.assignees?.length ? e.assignees : e.assignee ? [e.assignee] : [],
      notes: e.notes ?? null,
      is_misc: !!e.isMisc,
    })),
    custom_event_types: Object.entries(content.customEventTypes).map<Row>(([stage, titles]) => ({
      id: stage,
      schedule_id: scheduleId,
      stage,
      titles,
    })),
  };
}

type TableName = keyof ReturnType<typeof toRows>;
type Snapshot = Record<TableName, Map<string, string>>;

const snapshotOf = (rows: Row[]) => new Map(rows.map(row => [row.id as string, JSON.stringify(row)]));

// Keeps the database in step with the schedule held in the browser.
// Each call writes only the rows that changed since the last successful save.
export function createScheduleSync(scheduleId: string, initial: ScheduleContent) {
  const initialRows = toRows(scheduleId, initial);
  const saved: Snapshot = {
    people: snapshotOf(initialRows.people),
    campaigns: snapshotOf(initialRows.campaigns),
    events: snapshotOf(initialRows.events),
    custom_event_types: snapshotOf(initialRows.custom_event_types),
  };

  const changes = (table: TableName, rows: Row[]) => {
    const ids = new Set(rows.map(row => row.id as string));
    return {
      upserts: rows.filter(row => saved[table].get(row.id as string) !== JSON.stringify(row)),
      deletes: Array.from(saved[table].keys()).filter(id => !ids.has(id)),
    };
  };

  const upsert = async (table: TableName, rows: Row[]) => {
    const { upserts } = changes(table, rows);
    if (!upserts.length) return;
    const isTypes = table === 'custom_event_types';
    const payload = isTypes ? upserts.map(({ id, ...rest }) => rest) : upserts;
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: isTypes ? 'schedule_id,stage' : 'id' });
    if (error) throw error;
    upserts.forEach(row => saved[table].set(row.id as string, JSON.stringify(row)));
  };

  const remove = async (table: TableName, rows: Row[]) => {
    const { deletes } = changes(table, rows);
    if (!deletes.length) return;
    const query = supabase.from(table).delete().eq('schedule_id', scheduleId);
    const { error } = await (table === 'custom_event_types' ? query.in('stage', deletes) : query.in('id', deletes));
    if (error) throw error;
    deletes.forEach(id => saved[table].delete(id));
  };

  return {
    isDirty(content: ScheduleContent) {
      const rows = toRows(scheduleId, content);
      return (Object.keys(rows) as TableName[]).some(table => {
        const { upserts, deletes } = changes(table, rows[table]);
        return upserts.length > 0 || deletes.length > 0;
      });
    },
    // Order matters: events point at campaigns, so campaigns are written first and removed last
    async save(content: ScheduleContent) {
      const rows = toRows(scheduleId, content);
      await upsert('people', rows.people);
      await upsert('campaigns', rows.campaigns);
      await upsert('events', rows.events);
      await upsert('custom_event_types', rows.custom_event_types);
      await remove('events', rows.events);
      await remove('campaigns', rows.campaigns);
      await remove('people', rows.people);
      await remove('custom_event_types', rows.custom_event_types);
    },
  };
}
