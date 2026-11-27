'use client';

import DismissLayer, { closeOnBackdrop } from '@/components/common/DismissLayer';
import { confirmAction } from '@/components/common/Feedback';
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  X, RefreshCw, Users, CalendarDays, UserCheck, MailPlus,
  MoreVertical, Trash2, Clock,
} from 'lucide-react';
import {
  adminCancelInvite,
  adminDeleteSchedule,
  adminDeleteUser,
  adminRemoveMember,
  adminSetMemberRole,
  AdminOverview,
  AdminScheduleMember,
  AdminScheduleRow,
  AdminUserRow,
  loadAdminOverview,
  ScheduleRole,
} from '@/lib/scheduleData';

interface AdminOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // When provided (e.g. the /admin-preview page), this data is shown instead of
  // calling the admin-overview function.
  data?: AdminOverview;
  // The signed-in admin's email - used to hide "delete account" on their own row.
  currentUserEmail?: string;
}

const roleRank: Record<ScheduleRole, number> = { owner: 0, editor: 1, viewer: 2 };

// Site-admin view of the whole platform, grouped by schedule owner. Lets the
// admin change any member's role, remove them from a schedule, cancel pending
// invites or delete an account entirely. Metadata only - schedule contents are
// never returned.
export default function AdminOverviewModal({ isOpen, onClose, data: presetData, currentUserEmail }: AdminOverviewModalProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(presetData ?? null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<{ key: string; up: boolean } | null>(null);

  // Opens a row's actions menu, flipping it upward when there isn't room below.
  const toggleMenu = (e: React.MouseEvent, key: string) => {
    const bottom = e.currentTarget.getBoundingClientRect().bottom;
    setOpenMenu(prev =>
      prev?.key === key ? null : { key, up: bottom > window.innerHeight - 180 }
    );
  };

  const refresh = () => {
    if (presetData) return;
    setIsLoading(true);
    loadAdminOverview()
      .then(result => {
        setOverview(result);
        setError('');
      })
      .catch(err => {
        console.error('Could not load admin overview', err);
        setError(
          `The overview couldn’t be loaded${err?.message ? ` (${err.message})` : ''}. ` +
            'If this persists, check that the admin-overview function is deployed.'
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && !presetData) refresh();
  }, [isOpen, presetData]);

  useEffect(() => {
    if (presetData) setOverview(presetData);
  }, [presetData]);

  if (!isOpen) return null;

  const runAction = (action: () => Promise<void>) => {
    setActionError('');
    setOpenMenu(null);
    setIsBusy(true);
    action()
      .then(refresh)
      .catch(err => {
        console.error('Admin action failed', err);
        setActionError(err?.message || 'That change couldn’t be saved. Please try again.');
      })
      .finally(() => setIsBusy(false));
  };

  const fmtDate = (iso: string | null | undefined) =>
    iso ? format(parseISO(iso), 'd MMM yyyy') : '—';

  const users = overview?.users ?? [];
  const schedules = overview?.schedules ?? [];
  const usersById = new Map(users.map(u => [u.id, u]));
  const ownerIds = new Set(schedules.map(s => s.ownerUserId).filter(Boolean) as string[]);
  const membersMissing = schedules.length > 0 && schedules.some(s => s.members === undefined);

  const ownerSections = users
    .filter(u => ownerIds.has(u.id))
    .map(u => ({
      user: u,
      schedules: schedules
        .filter(s => s.ownerUserId === u.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .sort((a, b) => a.user.email.localeCompare(b.user.email));

  const orphanSchedules = schedules
    .filter(s => !s.ownerUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const otherAccounts = users
    .filter(u => !ownerIds.has(u.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalSeats = schedules.reduce((sum, s) => sum + s.totalMembers, 0);
  const totalPending = schedules.reduce((sum, s) => sum + s.pendingInvites.length, 0);
  const membershipsByUser = new Map<string, number>();
  for (const s of schedules) {
    for (const m of s.members ?? []) {
      membershipsByUser.set(m.userId, (membershipsByUser.get(m.userId) ?? 0) + 1);
    }
  }

  const isSelf = (email: string) =>
    !!currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase();

  const statusChip = (user: AdminUserRow | undefined) =>
    user?.lastSignInAt ? (
      <span className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
        Active
      </span>
    ) : (
      <span className="inline-block bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
        Invited — not signed in
      </span>
    );

  const stat = (icon: React.ReactNode, value: number, label: string) => (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      {icon}
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );

  const deleteAccountItem = (userId: string, email: string) => (
    <button
      disabled={isBusy}
      onClick={async () => {
        if (!(await confirmAction({
          title: 'Delete Argus account?',
          message: `${email} will be removed from Argus along with their memberships. This can’t be undone.`,
          confirmLabel: 'Delete account',
        }))) {
          setOpenMenu(null);
          return;
        }
        runAction(() => adminDeleteUser(userId));
      }}
      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
    >
      <Trash2 size={14} />
      Delete Argus account
    </button>
  );

  const memberMenu = (schedule: AdminScheduleRow, member: AdminScheduleMember, user: AdminUserRow | undefined) => {
    const key = `m:${schedule.id}:${member.userId}`;
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={e => toggleMenu(e, key)}
          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
        >
          <MoreVertical size={15} />
        </button>
        {openMenu?.key === key && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
            <div className={`absolute right-0 ${openMenu.up ? 'bottom-full mb-1' : 'mt-1'} w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1`}>
              <button
                disabled={isBusy}
                onClick={async () => {
                  if (!(await confirmAction({
                    title: 'Remove from schedule?',
                    message: `${member.email} will lose access to “${schedule.name}”.`,
                    confirmLabel: 'Remove',
                  }))) {
                    setOpenMenu(null);
                    return;
                  }
                  runAction(() => adminRemoveMember(schedule.id, member.userId));
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Remove from schedule
              </button>
              {user && !isSelf(user.email) && deleteAccountItem(user.id, user.email)}
            </div>
          </>
        )}
      </div>
    );
  };

  const memberRow = (schedule: AdminScheduleRow, member: AdminScheduleMember) => {
    const user = usersById.get(member.userId);
    return (
      <div key={member.userId} className="flex items-center gap-3 py-1.5">
        <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{member.email || 'Unknown account'}</span>
        {statusChip(user)}
        <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
          last seen {fmtDate(user?.lastSignInAt)}
        </span>
        <select
          value={member.role}
          disabled={isBusy || membersMissing}
          onChange={e => runAction(() => adminSetMemberRole(schedule.id, member.userId, e.target.value as ScheduleRole))}
          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 flex-shrink-0"
        >
          <option value="owner">Owner</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        {memberMenu(schedule, member, user)}
      </div>
    );
  };

  const scheduleBlock = (schedule: AdminScheduleRow) => {
    const members = [...(schedule.members ?? [])].sort(
      (a, b) => roleRank[a.role] - roleRank[b.role] || a.email.localeCompare(b.email)
    );
    return (
      <div key={schedule.id} className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5">
          <span className="flex-1 min-w-0 truncate">
            {schedule.name}
            <span className="font-normal text-gray-400"> · created {fmtDate(schedule.createdAt)}</span>
          </span>
          <button
            disabled={isBusy || membersMissing}
            onClick={async () => {
              if (!(await confirmAction({
                title: `Delete “${schedule.name}”?`,
                message: 'This removes the schedule and all its campaigns, events, people, members and invites. This can’t be undone.',
                confirmLabel: 'Delete schedule',
              }))) return;
              runAction(() => adminDeleteSchedule(schedule.id));
            }}
            className="p-1 hover:bg-red-100 rounded text-red-500 disabled:opacity-50 flex-shrink-0"
            title="Delete schedule"
          >
            <Trash2 size={13} />
          </button>
        </div>
        {members.length === 0 && schedule.pendingInvites.length === 0 && (
          <p className="text-xs text-gray-400">No members.</p>
        )}
        {members.map(m => memberRow(schedule, m))}
        {schedule.pendingInvites.map(invite => (
          <div key={invite.email} className="flex items-center gap-3 py-1.5">
            <Clock size={14} className="text-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-500 truncate flex-1 min-w-0">{invite.email}</span>
            <span className="text-xs text-gray-400 whitespace-nowrap">Pending — {invite.role}</span>
            <button
              disabled={isBusy}
              onClick={async () => {
                if (!(await confirmAction({
                  title: 'Cancel invite?',
                  message: `The invite for ${invite.email} will be withdrawn.`,
                  confirmLabel: 'Withdraw invite',
                }))) return;
                runAction(() => adminCancelInvite(schedule.id, invite.email));
              }}
              className="p-1 hover:bg-red-100 rounded text-red-500 disabled:opacity-50 flex-shrink-0"
              title="Cancel invite"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseDown={closeOnBackdrop(onClose)}>
      <DismissLayer onClose={onClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Admin overview</h2>
          <div className="flex items-center gap-2">
            {!presetData && (
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={18} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-6 pt-4 pb-28">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}
          {!overview && !error && <p className="text-sm text-gray-500">Loading overview…</p>}

          {membersMissing && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Member management needs the updated admin-overview function — redeploy it to see
              each schedule’s members and change their access.
            </p>
          )}

          {overview && (
            <>
              {/* Summary strip */}
              <div className="flex flex-wrap gap-3 mb-6">
                {stat(<Users size={16} className="text-gray-400" />, users.length, 'accounts')}
                {stat(<CalendarDays size={16} className="text-gray-400" />, schedules.length, 'schedules')}
                {stat(<UserCheck size={16} className="text-gray-400" />, totalSeats, 'seats in use')}
                {stat(<MailPlus size={16} className="text-gray-400" />, totalPending, 'pending invites')}
              </div>

              {/* Owners */}
              {ownerSections.length === 0 && schedules.length === 0 && (
                <p className="text-sm text-gray-500 mb-6">No schedules have been created yet.</p>
              )}
              {ownerSections.map(({ user, schedules: owned }) => (
                <div key={user.id} className="border border-gray-200 rounded-xl mb-4">
                  {/* Owner header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 rounded-t-xl">
                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{user.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{user.email}</span>
                        {statusChip(user)}
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">OWNER</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Joined {fmtDate(user.createdAt)} · Last sign-in {fmtDate(user.lastSignInAt)} · Owns {owned.length} {owned.length === 1 ? 'schedule' : 'schedules'}
                      </div>
                    </div>
                    {!isSelf(user.email) && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={e => toggleMenu(e, `u:${user.id}`)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenu?.key === `u:${user.id}` && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                            <div className={`absolute right-0 ${openMenu.up ? 'bottom-full mb-1' : 'mt-1'} w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1`}>
                              {deleteAccountItem(user.id, user.email)}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Their schedules and members */}
                  <div className="divide-y divide-gray-100">
                    {owned.map(scheduleBlock)}
                  </div>
                </div>
              ))}

              {/* Schedules with no owner */}
              {orphanSchedules.length > 0 && (
                <div className="border border-amber-200 rounded-xl mb-4">
                  <div className="bg-amber-50 px-4 py-3 rounded-t-xl">
                    <span className="text-sm font-semibold text-amber-800">Schedules with no owner</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {orphanSchedules.map(scheduleBlock)}
                  </div>
                </div>
              )}

              {/* Accounts owning nothing */}
              {otherAccounts.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-6">Other accounts</h3>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {otherAccounts.map(user => (
                      <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{user.email}</span>
                        {statusChip(user)}
                        <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
                          joined {fmtDate(user.createdAt)} · last seen {fmtDate(user.lastSignInAt)}
                          {(membershipsByUser.get(user.id) ?? 0) > 0 &&
                            ` · member of ${membershipsByUser.get(user.id)} schedule${membershipsByUser.get(user.id) === 1 ? '' : 's'}`}
                        </span>
                        {!isSelf(user.email) && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={e => toggleMenu(e, `u:${user.id}`)}
                              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {openMenu?.key === `u:${user.id}` && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                                <div className={`absolute right-0 ${openMenu.up ? 'bottom-full mb-1' : 'mt-1'} w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1`}>
                                  {deleteAccountItem(user.id, user.email)}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
