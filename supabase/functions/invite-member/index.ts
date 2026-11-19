// invite-member: records a schedule invite and emails the person an Argus-
// branded invitation naming the schedule, the inviter and their role.
// New users get a one-time setup link that signs them in and lands them on a
// choose-a-password screen; existing users get a link straight to the site.
//
// If SMTP isn't configured it falls back to Supabase's built-in invite email
// for new accounts (existing users just get the pending invite).
//
// Deploy: supabase functions deploy invite-member
// Secrets: SMTP_USER / SMTP_PASS (Gmail address + app password), and
//          optionally SMTP_HOST (default smtp.gmail.com), SMTP_PORT (465),
//          SMTP_FROM (e.g. "Argus <you@gmail.com>", defaults to SMTP_USER).

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inviteEmailHtml = (opts: {
  inviter: string;
  schedule: string;
  role: string;
  actionUrl: string;
  isNewUser: boolean;
}) => {
  const { inviter, schedule, role, actionUrl, isNewUser } = opts;
  const roleLabel = role === 'editor' ? 'an editor' : 'a viewer';
  const intro = isNewUser
    ? `<strong>${escapeHtml(inviter)}</strong> has invited you to join <strong>${escapeHtml(schedule)}</strong> on Argus as ${roleLabel}. Set up your account to get access.`
    : `<strong>${escapeHtml(inviter)}</strong> has added you to <strong>${escapeHtml(schedule)}</strong> on Argus as ${roleLabel}. Sign in to see it.`;
  const button = isNewUser ? 'Set up your account' : 'Open Argus';
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <div style="width:28px;height:28px;background:#111827;border-radius:6px;color:#ffffff;font-weight:bold;font-size:13px;line-height:28px;text-align:center">A</div>
      <span style="font-weight:bold;color:#111827;letter-spacing:0.05em">ARGUS</span>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">${intro}</p>
    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px">${button}</a>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0">If the button doesn’t work, paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(actionUrl)}</span></p>
  </div>
</body></html>`;
};

async function sendInviteEmail(to: string, opts: { inviter: string; schedule: string; role: string; actionUrl: string; isNewUser: boolean }) {
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
  const subject = `You’ve been invited to ${opts.schedule} on Argus`;
  await client.send({
    from: Deno.env.get('SMTP_FROM') ?? username,
    to,
    subject,
    content: `${opts.inviter} has invited you to ${opts.schedule} on Argus as ${opts.role === 'editor' ? 'an editor' : 'a viewer'}.\n\n${opts.actionUrl}`,
    html: inviteEmailHtml({ ...opts }),
  });
  await client.close();
  return true;
}

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
  // Service role only used after the owner/editor check below
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

  const { data: schedule } = await admin
    .from('schedules')
    .select('name')
    .eq('id', scheduleId)
    .maybeSingle();
  const scheduleName = schedule?.name ?? 'a schedule';
  const inviter = user.email ?? 'Someone';
  const siteUrl = redirectTo || url;
  const smtpConfigured = !!(Deno.env.get('SMTP_USER') && Deno.env.get('SMTP_PASS'));

  // Without SMTP, keep the original behaviour: Supabase's own invite email for
  // new accounts, silent pending invite for existing users.
  if (!smtpConfigured) {
    const { error: authError } = await admin.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined
    );
    if (authError) {
      console.log(`No invite email for ${email}: ${authError.message}`);
      return json({ status: 'pending' });
    }
    return json({ status: 'emailed' });
  }

  // Try to create the account for a new user and mint a one-time setup link.
  // generateLink sends no email itself - our branded email below carries it.
  // For existing users it errors, so they get a one-click magic link instead.
  let actionUrl = siteUrl;
  let isNewUser = false;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (link?.properties?.action_link) {
    isNewUser = true;
    actionUrl = link.properties.action_link;
    // Flag the account so the app walks them through setting a password.
    await admin.auth.admin.updateUserById(link.user.id, {
      user_metadata: { needs_password_setup: true },
    });
  } else {
    if (linkError) console.log(`No setup link for ${email}: ${linkError.message}`);
    const { data: magic } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (magic?.properties?.action_link) actionUrl = magic.properties.action_link;
  }

  try {
    if (await sendInviteEmail(email, { inviter, schedule: scheduleName, role: role!, actionUrl, isNewUser })) {
      return json({ status: 'emailed' });
    }
  } catch (err) {
    console.log(`Invite email to ${email} failed:`, err);
  }
  return json({ status: 'pending' });
});
