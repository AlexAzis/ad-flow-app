// invite-user: platform-level invite for onboarding a new customer.
// Only site admins (ADMIN_EMAILS secret, comma-separated) may call POST.
// GET returns whether the caller is a site admin, so the UI can hide the button.
//
// Sends an Argus-branded email via SMTP when configured; the link signs the
// new user in and flags the account so the app walks them through choosing a
// password. Without SMTP it falls back to Supabase's built-in invite email.
//
// Deploy:  supabase functions deploy invite-user
// Secrets: ADMIN_EMAILS, plus SMTP_USER / SMTP_PASS (optional
//          SMTP_HOST, SMTP_PORT, SMTP_FROM) - shared with invite-member.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inviteEmailHtml = (inviter: string, actionUrl: string) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <div style="width:28px;height:28px;background:#111827;border-radius:6px;color:#ffffff;font-weight:bold;font-size:13px;line-height:28px;text-align:center">A</div>
      <span style="font-weight:bold;color:#111827;letter-spacing:0.05em">ARGUS</span>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px"><strong>${escapeHtml(inviter)}</strong> has invited you to Argus. Set up your account to get started.</p>
    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px">Set up your account</a>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0">If the button doesn’t work, paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(actionUrl)}</span></p>
  </div>
</body></html>`;

async function sendInviteEmail(to: string, inviter: string, actionUrl: string) {
  const host = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com';
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  const username = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASS');
  if (!username || !password) return false;

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: port === 465,
      auth: { username, password },
    },
  });
  await client.send({
    from: Deno.env.get('SMTP_FROM') ?? username,
    to,
    subject: 'You’ve been invited to Argus',
    content: `${inviter} has invited you to Argus. Set up your account to get started.\n\n${actionUrl}`,
    html: inviteEmailHtml(inviter, actionUrl),
  });
  await client.close();
  return true;
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
  const smtpConfigured = !!(Deno.env.get('SMTP_USER') && Deno.env.get('SMTP_PASS'));

  if (smtpConfigured) {
    // Create the account and mint a one-time setup link; our branded email
    // below carries it - generateLink sends nothing itself.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: body.redirectTo ? { redirectTo: body.redirectTo } : undefined,
    });
    if (linkError) {
      console.log(`Could not create invite for ${email}: ${linkError.message}`);
      return json({ status: linkError.message.toLowerCase().includes('already') ? 'exists' : 'error' });
    }
    const actionUrl = link.properties?.action_link;
    if (!actionUrl) return json({ status: 'error' });

    // Flag the account so the app walks them through setting a password.
    await admin.auth.admin.updateUserById(link.user.id, {
      user_metadata: { needs_password_setup: true },
    });

    try {
      if (await sendInviteEmail(email, user.email, actionUrl)) return json({ status: 'emailed' });
    } catch (err) {
      console.log(`Invite email to ${email} failed:`, err);
    }
    return json({ status: 'error' });
  }

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
