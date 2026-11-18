'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, RefreshCw, Users, CalendarDays, UserCheck, MailPlus } from 'lucide-react';
import { AdminOverview, loadAdminOverview } from '@/lib/scheduleData';

interface AdminOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // When provided (e.g. the /admin-preview page), this data is shown instead of
  // calling the admin-overview function.
  data?: AdminOverview;
}

// Site-admin view of the whole platform: every account and every schedule with
// seat counts by role. Metadata only - schedule contents are never returned.
export default function AdminOverviewModal({ isOpen, onClose, data: presetData }: AdminOverviewModalProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(presetData ?? null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        setError('The overview couldn’t be loaded. Please try again.');
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

  const fmtDate = (iso: string | null | undefined) =>
    iso ? format(parseISO(iso), 'd MMM yyyy') : '—';

  const users = [...(overview?.users ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const schedules = [...(overview?.schedules ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalSeats = schedules.reduce((sum, s) => sum + s.totalMembers, 0);
  const totalPending = schedules.reduce((sum, s) => sum + s.pendingInvites.length, 0);

  const stat = (icon: React.ReactNode, value: number, label: string) => (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      {icon}
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

        <div className="overflow-auto px-6 py-4">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {!overview && !error && <p className="text-sm text-gray-500">Loading overview…</p>}

          {overview && (
            <>
              {/* Summary strip */}
              <div className="flex flex-wrap gap-3 mb-6">
                {stat(<Users size={16} className="text-gray-400" />, users.length, 'accounts')}
                {stat(<CalendarDays size={16} className="text-gray-400" />, schedules.length, 'schedules')}
                {stat(<UserCheck size={16} className="text-gray-400" />, totalSeats, 'seats in use')}
                {stat(<MailPlus size={16} className="text-gray-400" />, totalPending, 'pending invites')}
              </div>

              {/* Schedules */}
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Schedules</h3>
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-500 mb-6">No schedules have been created yet.</p>
              ) : (
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                      <th className="pb-2 font-medium">Schedule</th>
                      <th className="pb-2 font-medium">Owner</th>
                      <th className="pb-2 font-medium text-right">Editors</th>
                      <th className="pb-2 font-medium text-right">Viewers</th>
                      <th className="pb-2 font-medium text-right">Pending</th>
                      <th className="pb-2 font-medium text-right">Seats</th>
                      <th className="pb-2 font-medium text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(s => (
                      <tr key={s.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-800">{s.name}</td>
                        <td className="py-2 pr-4 text-gray-600">{s.ownerEmail || '—'}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{s.editors}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{s.viewers}</td>
                        <td
                          className="py-2 pr-4 text-right text-gray-600"
                          title={s.pendingInvites.map(i => `${i.email} (${i.role})`).join('\n')}
                        >
                          {s.pendingInvites.length || '—'}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium text-gray-800">{s.totalMembers}</td>
                        <td className="py-2 text-right text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Accounts */}
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Accounts</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Last sign-in</th>
                    <th className="pb-2 font-medium text-right">Schedules owned</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-800">{u.email}</td>
                      <td className="py-2 pr-4">
                        {u.lastSignInAt ? (
                          <span className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Invited — not signed in
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{fmtDate(u.lastSignInAt)}</td>
                      <td className="py-2 text-right text-gray-600">{u.ownedSchedules}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
