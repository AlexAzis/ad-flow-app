// invite-member: records a schedule invite and emails the person if they don't
// have an account yet (Supabase's built-in invite email, which also creates
// their login). Existing users just get the pending invite - the schedule
// appears next time they sign in.
//
// Deploy: supabase functions deploy invite-member
// The SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env vars are
// provided automatically by Supabase Edge Functions.

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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  let body: { scheduleId?: string; email?: string; role?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { scheduleId, role, redirectTo } = body;
  const email = body.email?.trim().toLowerCase() ?? '';
  if (!scheduleId || !email.includes('@') || !['editor', 'viewer'].includes(role ?? '')) {
    return json({ error: 'scheduleId, a valid email and role (editor|viewer) are required' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  // Client as the caller, to check who they are and what they may do
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  // Service role only used after the owner check below
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  const { data: membership } = await admin
    .from('schedule_members')
    .select('role')
    .eq('schedule_id', scheduleId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership?.role !== 'owner' && membership?.role !== 'editor') {
    return json({ error: 'Only owners and editors can invite' }, 403);
  }

  const { data: existingMember } = await admin
    .from('schedule_members')
    .select('user_id')
    .eq('schedule_id', scheduleId)
    .ilike('email', email)
    .maybeSingle();
  if (existingMember) return json({ status: 'already-member' });

  const { error: inviteError } = await admin
    .from('schedule_invites')
    .upsert(
      { schedule_id: scheduleId, email, role, invited_by: user.id },
      { onConflict: 'schedule_id,email' }
    );
  if (inviteError) return json({ error: inviteError.message }, 500);

  // Sends Supabase's invite email and creates the account. Fails if the email
  // already belongs to a user - the pending invite still takes effect on their
  // next sign-in, so that outcome is fine.
  const { error: authError } = await admin.auth.admin.inviteUserByEmail(
    email,
    redirectTo ? { redirectTo } : undefined
  );
  if (authError) {
    console.log(`No invite email for ${email}: ${authError.message}`);
    return json({ status: 'pending' });
  }
  return json({ status: 'emailed' });
});
