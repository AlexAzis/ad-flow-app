// invite-user: platform-level invite for onboarding a new customer.
// Only site admins (ADMIN_EMAILS secret, comma-separated) may call POST.
// GET returns whether the caller is a site admin, so the UI can hide the button.
//
// Deploy:  supabase functions deploy invite-user
// Secrets: supabase secrets set ADMIN_EMAILS=you@example.com

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
  const isAdmin = adminEmails().includes(user.email.toLowerCase());

  if (req.method === 'GET') return json({ admin: isAdmin });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isAdmin) return json({ error: 'Not a site admin' }, 403);

  let body: { email?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  if (!email.includes('@')) return json({ error: 'A valid email is required' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.inviteUserByEmail(
    email,
    body.redirectTo ? { redirectTo: body.redirectTo } : undefined
  );
  if (error) {
    console.log(`Could not invite ${email}: ${error.message}`);
    return json({ status: error.message.toLowerCase().includes('already') ? 'exists' : 'error' });
  }
  return json({ status: 'emailed' });
});
