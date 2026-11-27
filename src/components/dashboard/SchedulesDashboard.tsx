'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Users, MoreVertical, ShieldCheck, LogOut, UserPlus, Settings, LayoutDashboard } from 'lucide-react';
import { scheduleAccent } from '@/lib/colorUtils';
import { acceptScheduleInvites, checkIsSiteAdmin, listSchedules, ScheduleSummary } from '@/lib/scheduleData';
import AdminOverviewModal from './AdminOverviewModal';
import InviteUserModal from './InviteUserModal';
import NewScheduleModal from './NewScheduleModal';
import ScheduleSettingsModal from './ScheduleSettingsModal';

interface SchedulesDashboardProps {
  userId: string;
  email: string;
  onOpenSchedule: (schedule: ScheduleSummary) => void;
  onSignOut: () => void;
}

const roleLabel = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const LAST_OPENED_KEY = 'argus:lastOpened';

const openedLabel = (timestamp?: number) => {
  if (!timestamp) return null;
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'opened today';
  if (days === 1) return 'opened yesterday';
  return `opened ${days}d ago`;
};

export default function SchedulesDashboard({ userId, email, onOpenSchedule, onSignOut }: SchedulesDashboardProps) {
  const [schedules, setSchedules] = useState<ScheduleSummary[] | null>(null);
  const [error, setError] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isAdminOverviewOpen, setIsAdminOverviewOpen] = useState(false);
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [menuScheduleId, setMenuScheduleId] = useState<string | null>(null);
  const [settingsSchedule, setSettingsSchedule] = useState<ScheduleSummary | null>(null);
  const [lastOpened, setLastOpened] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      setLastOpened(JSON.parse(localStorage.getItem(LAST_OPENED_KEY) || '{}'));
    } catch {
      // Malformed prefs just mean no "opened" labels
    }
  }, []);

  useEffect(() => {
    checkIsSiteAdmin().then(setIsAdmin);
  }, []);

  const refresh = useCallback(() => {
    // Pick up schedules this user has been invited to since their last visit
    acceptScheduleInvites()
      .catch(err => console.error('Could not accept invites', err))
      .then(() => listSchedules(userId))
      .then(list => {
        setSchedules(list);
        setError('');
      })
      .catch(err => {
        console.error('Could not load schedules', err);
        setError('Your schedules couldn’t be loaded. Check your connection and reload the page.');
      });
  }, [userId]);

  useEffect(refresh, [refresh]);

  const handleNewSchedule = () => setIsNewScheduleOpen(true);

  const openSchedule = (schedule: ScheduleSummary) => {
    const next = { ...lastOpened, [schedule.id]: Date.now() };
    setLastOpened(next);
    try {
      localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(next));
    } catch {
      // Storage full or unavailable: the label just won't persist
    }
    onOpenSchedule(schedule);
  };

  const scheduleCount = schedules?.length ?? 0;
  const ownedCount = schedules?.filter(s => s.role === 'owner').length ?? 0;
  const sharedCount = scheduleCount - ownedCount;
  const statsText = scheduleCount === 0
    ? ''
    : sharedCount > 0
      ? `${scheduleCount} ${scheduleCount === 1 ? 'schedule' : 'schedules'} · ${ownedCount} owned · ${sharedCount} shared`
      : `${scheduleCount} ${scheduleCount === 1 ? 'schedule' : 'schedules'} · all owned`;

  return (
    <div className="h-full w-full flex bg-gray-50">
      {/* Left Sidebar - hidden on narrow windows; the cards cover the same navigation */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-gray-900 tracking-wide">ARGUS</span>
        </div>

        {/* New Schedule Button */}
        <div className="p-4">
          <button onClick={handleNewSchedule} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 text-sm font-medium">
            <Plus size={16} />
            <span>New Schedule</span>
          </button>
        </div>

        {/* Your Schedules */}
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-gray-400 tracking-wider mb-2">
            YOUR SCHEDULES
          </div>
          {(schedules ?? []).map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => openSchedule(schedule)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 text-left"
            >
              {schedule.logoUrl ? (
                <img
                  src={schedule.logoUrl}
                  alt=""
                  className="w-6 h-6 rounded object-contain bg-white border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: scheduleAccent(schedule) }}
                >
                  <span className="text-white text-[10px] font-bold">{schedule.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="text-sm text-gray-800 font-medium truncate">
                {schedule.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
            {statsText && <p className="text-xs text-gray-500 mt-0.5">{statsText}</p>}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setIsAdminOverviewOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                title="Platform stats across all accounts and schedules"
              >
                <LayoutDashboard size={16} />
                <span>Admin</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setIsInviteUserOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                title="Onboard a new customer account"
              >
                <UserPlus size={16} />
                <span>Invite User</span>
              </button>
            )}
            <button onClick={handleNewSchedule} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium">
              <Plus size={16} />
              <span>Create New Schedule</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(open => !open)}
                className="flex items-center gap-2 border border-gray-300 rounded-full pl-1 pr-3 py-1 hover:bg-gray-50"
              >
                <span className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{email.charAt(0).toUpperCase()}</span>
                </span>
                <span className="text-sm text-gray-700">{email.split('@')[0]}</span>
              </button>
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="px-4 py-2 text-xs text-gray-500 truncate border-b border-gray-100">{email}</div>
                    <button
                      onClick={onSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Cards */}
        <div className="flex-1 overflow-auto p-6">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {!error && schedules === null && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse" aria-label="Loading schedules">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-40 flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-gray-200" />
                  <div className="mt-4 h-3.5 w-2/3 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          )}
          {schedules?.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-10 text-center max-w-sm">
                <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <LayoutDashboard size={22} className="text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">No schedules yet</h3>
                <p className="mt-1 text-sm text-gray-500">Create a schedule to start planning campaigns and blocks.</p>
                <button
                  onClick={handleNewSchedule}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Plus size={15} />
                  New schedule
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(schedules ?? []).map((schedule, index) => (
              <div
                key={schedule.id}
                role="button"
                tabIndex={0}
                onClick={() => openSchedule(schedule)}
                onKeyDown={(e) => e.key === 'Enter' && openSchedule(schedule)}
                className="card-enter bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200 h-40 flex flex-col cursor-pointer"
                style={{
                  animationDelay: `${Math.min(index, 8) * 40}ms`,
                  borderTopWidth: '4px',
                  borderTopColor: scheduleAccent(schedule),
                }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  {schedule.logoUrl ? (
                    <img
                      src={schedule.logoUrl}
                      alt={`${schedule.name} logo`}
                      className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-200"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: scheduleAccent(schedule) }}
                    >
                      <span className="text-white font-bold">{schedule.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                      <ShieldCheck size={11} />
                      {roleLabel[schedule.role]}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuScheduleId(prev => (prev === schedule.id ? null : schedule.id));
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuScheduleId === schedule.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuScheduleId(null);
                            }}
                          />
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuScheduleId(null);
                                setSettingsSchedule(schedule);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Settings size={14} />
                              Schedule settings
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="font-semibold text-gray-900 truncate" title={schedule.name}>{schedule.name}</div>
                <div className="text-sm text-gray-500 line-clamp-2">
                  {schedule.description || 'No description'}
                </div>

                {/* Card Footer */}
                <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={13} />
                  <span>{schedule.memberCount} {schedule.memberCount === 1 ? 'member' : 'members'}</span>
                  {openedLabel(lastOpened[schedule.id]) && (
                    <span className="text-gray-400">· {openedLabel(lastOpened[schedule.id])}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AdminOverviewModal
        isOpen={isAdminOverviewOpen}
        onClose={() => setIsAdminOverviewOpen(false)}
        currentUserEmail={email}
      />
      <InviteUserModal isOpen={isInviteUserOpen} onClose={() => setIsInviteUserOpen(false)} />
      <NewScheduleModal
        isOpen={isNewScheduleOpen}
        onClose={() => setIsNewScheduleOpen(false)}
        onCreated={refresh}
      />
      {settingsSchedule && (
        <ScheduleSettingsModal
          schedule={settingsSchedule}
          currentUser={email}
          onClose={() => setSettingsSchedule(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
