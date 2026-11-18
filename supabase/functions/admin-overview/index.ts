// admin-overview: read-only platform stats and member management for site admins.
//
// GET  - every account and every schedule with its members, invites and role
//        counts. Only metadata is returned - never schedule contents.
// POST - { action: 'set-role',       scheduleId, userId, role } change a member's role
//        { action: 'remove-member',  scheduleId, userId }       remove from a schedule
//        { action: 'cancel-invite',  scheduleId, email }        cancel a pending invite
//        { action: 'delete-user',    userId }                   delete the Argus account
//
// Only site admins (ADMIN_EMAILS secret, comma-separated) may call either.
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
const ROLES = ['owner', 'editor', 'viewer'];

// PostgREST caps responses at 1000 rows - page through to get everything.
async function fetchAll(admin: ReturnType<typeof createClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .order('created_at')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function handleGet(admin: ReturnType<typeof createClient>) {
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
      ownerUserId: owner?.user_id ?? null,
      ownerEmail,
      editors: scheduleMembers.filter(m => m.role === 'editor').length,
      viewers: scheduleMembers.filter(m => m.role === 'viewer').length,
      totalMembers: scheduleMembers.length,
      members: scheduleMembers.map(m => ({
        userId: m.user_id,
        email: m.email ?? emailById.get(m.user_id as string) ?? '',
        role: m.role,
      })),
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
}

async function handlePost(admin: ReturnType<typeof createClient>, req: Request) {
  let body: {
    action?: string;
    scheduleId?: string;
    userId?: string;
    email?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  switch (body.action) {
    case 'set-role': {
      if (!body.scheduleId || !body.userId || !ROLES.includes(body.role ?? '')) {
        return json({ error: 'scheduleId, userId and role (owner|editor|viewer) are required' }, 400);
      }
      const { error } = await admin
        .from('schedule_members')
        .update({ role: body.role })
        .eq('schedule_id', body.scheduleId)
        .eq('user_id', body.userId);
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'ok' });
    }

    case 'remove-member': {
      if (!body.scheduleId || !body.userId) {
        return json({ error: 'scheduleId and userId are required' }, 400);
      }
      const { error } = await admin
        .from('schedule_members')
        .delete()
        .eq('schedule_id', body.scheduleId)
        .eq('user_id', body.userId);
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'ok' });
    }

    case 'cancel-invite': {
      const email = body.email?.trim().toLowerCase() ?? '';
      if (!body.scheduleId || !email) {
        return json({ error: 'scheduleId and email are required' }, 400);
      }
      const { error } = await admin
        .from('schedule_invites')
        .delete()
        .eq('schedule_id', body.scheduleId)
        .eq('email', email);
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'ok' });
    }

    case 'delete-schedule': {
      if (!body.scheduleId) return json({ error: 'scheduleId is required' }, 400);
      // All schedule content cascades from the schedules row. Storage logo
      // files are left behind harmlessly.
      const { error } = await admin
        .from('schedules')
        .delete()
        .eq('id', body.scheduleId);
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'ok' });
    }

    case 'delete-user': {
      if (!body.userId) return json({ error: 'userId is required' }, 400);

      // schedules.created_by references auth.users without a cascade, so an
      // account that created schedules can't be deleted while they exist -
      // whether or not the account still holds a member role on them.
      const { data: created } = await admin
        .from('schedules')
        .select('id, name')
        .eq('created_by', body.userId);
      if (created && created.length > 0) {
        const names = created.map(s => s.name).filter(Boolean).join(', ');
        return json(
          { error: `They created ${created.length} schedule(s)${names ? ` (${names})` : ''}. Delete those schedules from this overview first.` },
          400
        );
      }

      const { error } = await admin.auth.admin.deleteUser(body.userId);
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'ok' });
    }

    default:
      return json({ error: 'Unknown action' }, 400);
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

  if (req.method === 'GET') return handleGet(admin);
  if (req.method === 'POST') return handlePost(admin, req);
  return json({ error: 'Method not allowed' }, 405);
});
