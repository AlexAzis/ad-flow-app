'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Trash2, UserPlus, Clock } from 'lucide-react';
import {
  cancelScheduleInvite,
  inviteToSchedule,
  listScheduleAccess,
  removeScheduleMember,
  ScheduleAccess,
  ScheduleRole,
  updateMemberRole,
} from '@/lib/scheduleData';

interface MembersPanelProps {
  scheduleId: string;
  role: ScheduleRole;
  currentUser: string;
}

const roleLabel: Record<ScheduleRole, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const displayEmail = (email: string | null) => email || 'Unknown account';

// Member list + invite management for a schedule. Owners can change roles and
// remove people; owners and editors can send and cancel invites; viewers see a
// read-only list.
export default function MembersPanel({ scheduleId, role, currentUser }: MembersPanelProps) {
  const isOwner = role === 'owner';
  const canInvite = role === 'owner' || role === 'editor';
  const [access, setAccess] = useState<ScheduleAccess | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(() => {
    setLoadFailed(false);
    listScheduleAccess(scheduleId)
      .then(setAccess)
      .catch(error => {
        console.error('Could not load members', error);
        setLoadFailed(true);
      });
  }, [scheduleId]);

  useEffect(refresh, [refresh]);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setActionError('');
    setNotice('');
    setIsBusy(true);
    try {
      await action();
      refresh();
      return true;
    } catch (error) {
      console.error('Member action failed', error);
      setActionError('That change couldn’t be saved. Please try again.');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (access?.members.some(m => m.email?.toLowerCase() === email)) {
      setActionError('That person is already a member of this schedule.');
      return;
    }
    run(async () => {
      const outcome = await inviteToSchedule(scheduleId, email, inviteRole);
      if (outcome === 'already-member') {
        setActionError('That person is already a member of this schedule.');
        return;
      }
      setInviteEmail('');
      setNotice(
        outcome === 'emailed'
          ? `Invite email sent to ${email}. They’ll get access once they sign in.`
          : `Invite recorded for ${email} — the schedule will appear next time they sign in.`
      );
    });
  };

  if (loadFailed) {
    return (
      <div className="text-sm text-gray-600">
        <p className="mb-3">Members couldn’t be loaded.</p>
        <button onClick={refresh} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">
          Try again
        </button>
      </div>
    );
  }
  if (!access) {
    return <p className="text-sm text-gray-500">Loading members…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Members */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          People with access ({access.members.length})
        </h3>
        <div className="space-y-2">
          {access.members.map(member => {
            const isSelf = member.email?.toLowerCase() === currentUser.toLowerCase();
            return (
              <div key={member.userId} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {displayEmail(member.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800 truncate block">
                    {displayEmail(member.email)}
                    {isSelf && <span className="text-gray-400"> (you)</span>}
                  </span>
                </div>
                {isOwner && !isSelf ? (
                  <>
                    <select
                      value={member.role}
                      disabled={isBusy}
                      onChange={e => run(() => updateMemberRole(scheduleId, member.userId, e.target.value as ScheduleRole))}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700"
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => run(() => removeScheduleMember(scheduleId, member.userId))}
                      disabled={isBusy}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600 disabled:opacity-50"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {roleLabel[member.role]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {access.invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Pending invites ({access.invites.length})
          </h3>
          <div className="space-y-2">
            {access.invites.map(invite => (
              <div key={invite.email} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <Clock size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800 truncate block">{invite.email}</span>
                  <span className="text-xs text-gray-500">Invited as {roleLabel[invite.role]} — joins on next sign-in</span>
                </div>
                {canInvite && (
                  <button
                    onClick={() => run(() => cancelScheduleInvite(scheduleId, invite.email))}
                    disabled={isBusy}
                    className="p-1.5 hover:bg-red-100 rounded text-red-600 disabled:opacity-50"
                    title="Cancel invite"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      {/* Invite form (owners and editors) */}
      {canInvite && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="Invite by email…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white text-gray-700"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={isBusy || !inviteEmail.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <UserPlus size={16} />
              <span>Invite</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            New users get an invite email; existing users see the schedule next time they sign in.
          </p>
        </div>
      )}
    </div>
  );
}
