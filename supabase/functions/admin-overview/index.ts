// admin-overview: read-only platform stats for site admins.
// Returns every account and every schedule with member counts by role, so an
// admin can see who owns what and how many seats each customer is using.
// Only metadata is returned - never schedule contents.
//
// Deploy:  supabase functions deploy admin-overview
// Secrets: same ADMIN_EMAILS used by invite-user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const adminEmails = () =>
  (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

const PAGE_SIZE = 1000;

// PostgREST caps responses at 1000 rows - page through to get everything.
async function fetchAll(admin: ReturnType<typeof createClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await caller.auth.getUser();
  if (!user?.email) return json({ error: 'Not signed in' }, 401);
  if (!adminEmails().includes(user.email.toLowerCase())) {
    return json({ error: 'Not a site admin' }, 403);
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Every auth account, paged (listUsers maxes at 1000 per call).
  const authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string; invited_at?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return json({ error: error.message }, 500);
    authUsers.push(...(data?.users ?? []));
    if (!data || data.users.length < PAGE_SIZE) break;
  }

  let schedules, members, invites;
  try {
    [schedules, members, invites] = await Promise.all([
      fetchAll(admin, 'schedules', 'id, name, created_at, created_by'),
      fetchAll(admin, 'schedule_members', 'schedule_id, user_id, role, email'),
      fetchAll(admin, 'schedule_invites', 'schedule_id, email, role, created_at'),
    ]);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  const emailById = new Map(authUsers.map(u => [u.id, u.email ?? '']));

  const ownedCountByUser = new Map<string, number>();
  const scheduleRows = schedules.map(s => {
    const scheduleMembers = members.filter(m => m.schedule_id === s.id);
    const scheduleInvites = invites.filter(i => i.schedule_id === s.id);
    const owner = scheduleMembers.find(m => m.role === 'owner');
    const ownerEmail =
      owner?.email ??
      emailById.get(s.created_by as string) ??
      '';
    if (owner?.user_id) {
      ownedCountByUser.set(
        owner.user_id as string,
        (ownedCountByUser.get(owner.user_id as string) ?? 0) + 1
      );
    }
    return {
      id: s.id,
      name: s.name,
      createdAt: s.created_at,
      ownerEmail,
      editors: scheduleMembers.filter(m => m.role === 'editor').length,
      viewers: scheduleMembers.filter(m => m.role === 'viewer').length,
      totalMembers: scheduleMembers.length,
      pendingInvites: scheduleInvites.map(i => ({ email: i.email, role: i.role })),
    };
  });

  const userRows = authUsers.map(u => ({
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    invitedAt: u.invited_at ?? null,
    ownedSchedules: ownedCountByUser.get(u.id) ?? 0,
  }));

  return json({ users: userRows, schedules: scheduleRows });
});
