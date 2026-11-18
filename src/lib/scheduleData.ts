import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';
import { Campaign, Event, Person } from './types';
import { getStageColor } from './colorUtils';

export type ScheduleRole = 'owner' | 'editor' | 'viewer';

export interface ScheduleSummary {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
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
    .select('id, name, description, logo_url, schedule_members(user_id, role)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(row => {
    const members = (row.schedule_members ?? []) as { user_id: string; role: ScheduleRole }[];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      logoUrl: row.logo_url,
      role: members.find(m => m.user_id === userId)?.role ?? 'viewer',
      memberCount: members.length,
    };
  });
}

// Returns the new schedule's id so a logo can be uploaded straight after.
export async function createSchedule(name: string): Promise<string> {
  const { data, error } = await supabase.from('schedules').insert({ name }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updateScheduleDetails(
  scheduleId: string,
  fields: { name: string; description: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .update({ name: fields.name, description: fields.description })
    .eq('id', scheduleId);
  if (error) throw error;
}

// ------------------------------------------------------------- logos

const LOGO_BUCKET = 'schedule-logos';

// Uploads a logo under <schedule_id>/<uuid>.<ext> and stores its public URL on
// the schedule. Older logo files for the schedule are cleared out best-effort.
export async function uploadScheduleLogo(scheduleId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${scheduleId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from('schedules')
    .update({ logo_url: data.publicUrl })
    .eq('id', scheduleId);
  if (updateError) throw updateError;

  supabase.storage
    .from(LOGO_BUCKET)
    .list(scheduleId)
    .then(({ data: files }) => {
      const stale = (files ?? [])
        .map(f => `${scheduleId}/${f.name}`)
        .filter(p => p !== path);
      if (stale.length) supabase.storage.from(LOGO_BUCKET).remove(stale);
    })
    .catch(() => {});

  return data.publicUrl;
}

export async function removeScheduleLogo(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .update({ logo_url: null })
    .eq('id', scheduleId);
  if (error) throw error;

  const { data: files } = await supabase.storage.from(LOGO_BUCKET).list(scheduleId);
  const paths = (files ?? []).map(f => `${scheduleId}/${f.name}`);
  if (paths.length) await supabase.storage.from(LOGO_BUCKET).remove(paths);
}

// Deletes the schedule and everything hanging off it. Logo files have to go
// first: once the schedule row is gone, storage policies can no longer prove
// the caller owns that folder.
export async function deleteSchedule(scheduleId: string): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage.from(LOGO_BUCKET).list(scheduleId);
    if (listError) throw listError;
    const paths = (files ?? []).map(f => `${scheduleId}/${f.name}`);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from(LOGO_BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
  } catch (err) {
    console.warn('Could not remove schedule logo files before delete', err);
  }

  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) throw error;
}

// ------------------------------------------------------------ members

export interface ScheduleMember {
  userId: string;
  email: string | null;
  role: ScheduleRole;
}

export interface ScheduleInvite {
  email: string;
  role: 'editor' | 'viewer';
}

export interface ScheduleAccess {
  members: ScheduleMember[];
  invites: ScheduleInvite[];
}

// Turns any pending invites addressed to the signed-in user into memberships.
export async function acceptScheduleInvites(): Promise<void> {
  const { error } = await supabase.rpc('accept_schedule_invites');
  if (error) throw error;
}

export async function listScheduleAccess(scheduleId: string): Promise<ScheduleAccess> {
  const [memberResult, inviteResult] = await Promise.all([
    supabase
      .from('schedule_members')
      .select('user_id, email, role')
      .eq('schedule_id', scheduleId)
      .order('created_at'),
    supabase
      .from('schedule_invites')
      .select('email, role')
      .eq('schedule_id', scheduleId)
      .order('created_at'),
  ]);
  if (memberResult.error) throw memberResult.error;
  if (inviteResult.error) throw inviteResult.error;
  return {
    members: (memberResult.data ?? []).map(row => ({
      userId: row.user_id,
      email: row.email,
      role: row.role as ScheduleRole,
    })),
    invites: (inviteResult.data ?? []).map(row => ({
      email: row.email,
      role: row.role as ScheduleInvite['role'],
    })),
  };
}

export type InviteOutcome = 'emailed' | 'pending' | 'already-member';

// Records the invite via the invite-member edge function, which also emails a
// new user their account invite. If the function isn't reachable (e.g. not
// deployed yet) the invite is written directly and just takes effect silently
// on the person's next sign-in.
export async function inviteToSchedule(scheduleId: string, email: string, role: ScheduleInvite['role']): Promise<InviteOutcome> {
  const normalized = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { scheduleId, email: normalized, role, redirectTo: window.location.origin },
    });
    if (!error && data?.status) return data.status as InviteOutcome;
    if (data?.error) throw new Error(data.error);
    if (error) console.warn('invite-member unavailable, recording invite directly', error);
  } catch (err) {
    console.warn('invite-member unavailable, recording invite directly', err);
  }
  const { error } = await supabase
    .from('schedule_invites')
    .upsert({ schedule_id: scheduleId, email: normalized, role }, { onConflict: 'schedule_id,email' });
  if (error) throw error;
  return 'pending';
}

export async function cancelScheduleInvite(scheduleId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_invites')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('email', email);
  if (error) throw error;
}

export async function updateMemberRole(scheduleId: string, userId: string, role: ScheduleRole): Promise<void> {
  const { error } = await supabase
    .from('schedule_members')
    .update({ role })
    .eq('schedule_id', scheduleId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removeScheduleMember(scheduleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_members')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ------------------------------------------------------- site admin

// Site admins (ADMIN_EMAILS secret on the invite-user function) can onboard new
// customers by inviting an email that has no account yet.
export async function checkIsSiteAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('invite-user', { method: 'GET' });
    return !error && !!data?.admin;
  } catch {
    return false;
  }
}

export type PlatformInviteOutcome = 'emailed' | 'exists' | 'error';

export async function inviteNewUser(email: string): Promise<PlatformInviteOutcome> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { email: email.trim().toLowerCase(), redirectTo: window.location.origin },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.status ?? 'error') as PlatformInviteOutcome;
}

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  invitedAt: string | null;
  ownedSchedules: number;
}

export interface AdminScheduleMember {
  userId: string;
  email: string;
  role: ScheduleRole;
}

export interface AdminScheduleRow {
  id: string;
  name: string;
  createdAt: string;
  ownerUserId: string | null;
  ownerEmail: string;
  editors: number;
  viewers: number;
  totalMembers: number;
  // Absent if the deployed admin-overview predates member management - the UI
  // falls back to counts and asks for a redeploy.
  members?: AdminScheduleMember[];
  pendingInvites: { email: string; role: 'editor' | 'viewer' }[];
}

export interface AdminOverview {
  users: AdminUserRow[];
  schedules: AdminScheduleRow[];
}

// On a non-2xx reply supabase-js gives a generic "non-2xx status code" error
// and the function's real {error: ...} body is only on error.context. Pull it
// out so admin actions show the actual reason.
async function functionErrorMessage(error: unknown): Promise<Error> {
  try {
    const context = (error as { context?: unknown })?.context;
    if (context instanceof Response) {
      const payload = await context.json();
      if (payload?.error) return new Error(payload.error);
    }
  } catch {
    // fall through to the generic message
  }
  return error instanceof Error ? error : new Error(String(error));
}

// Read-only platform stats for site admins (admin-overview function). Only
// returns account and schedule metadata - never schedule contents.
export async function loadAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.functions.invoke('admin-overview', { method: 'GET' });
  if (error) throw await functionErrorMessage(error);
  if (data?.error) throw new Error(data.error);
  return data as AdminOverview;
}

// Management actions for site admins, all POSTed to admin-overview.
async function adminAction(body: Record<string, string>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-overview', { body });
  if (error) throw await functionErrorMessage(error);
  if (data?.error) throw new Error(data.error);
}

export async function adminSetMemberRole(scheduleId: string, userId: string, role: ScheduleRole): Promise<void> {
  await adminAction({ action: 'set-role', scheduleId, userId, role });
}

export async function adminRemoveMember(scheduleId: string, userId: string): Promise<void> {
  await adminAction({ action: 'remove-member', scheduleId, userId });
}

export async function adminCancelInvite(scheduleId: string, email: string): Promise<void> {
  await adminAction({ action: 'cancel-invite', scheduleId, email });
}

export async function adminDeleteUser(userId: string): Promise<void> {
  await adminAction({ action: 'delete-user', userId });
}

export async function adminDeleteSchedule(scheduleId: string): Promise<void> {
  await adminAction({ action: 'delete-schedule', scheduleId });
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
    logoUrl: row.logo_url ?? undefined,
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
      logo_url: c.logoUrl ?? null,
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
