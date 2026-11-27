'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, Minus, ArrowLeft, ShieldCheck, Users, FilterX, CalendarPlus, LayoutGrid } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addDays, addMonths, differenceInCalendarDays, startOfMonth } from 'date-fns';
import {
  archiveCampaign,
  campaignFromRow,
  campaignToRow,
  createScheduleSync,
  customTypeToRow,
  eventFromRow,
  eventToRow,
  personFromRow,
  personToRow,
  ScheduleRole,
} from '@/lib/scheduleData';
import { supabase } from '@/lib/supabase';
import { getStageColor } from '@/lib/colorUtils';
import { getEventTitles, getEventDisplayTitle } from '@/lib/eventTitles';
import type { EventSelectionAction } from '@/lib/eventDrag';
import GridView from './GridView';
import PresenceAvatars from './PresenceAvatars';
import GanttView from './GanttView';
import VerticalView from './VerticalView';
import SummaryView from './SummaryView';
import TeamView from './TeamView';
import FilterSidebar from './FilterSidebar';
import ShortcutsModal from './ShortcutsModal';
import AddEventModal from './AddEventModal';
import EditEventModal from './EditEventModal';
import NewCampaignModal from './NewCampaignModal';
import ManageEventsModal from './ManageEventsModal';
import EditCampaignModal from './EditCampaignModal';
import type { DuplicateCampaignDetails } from './DuplicateCampaignModal';
import MembersModal from './MembersModal';
import { notify } from '@/components/common/Feedback';

interface SimpleScheduleViewProps {
  scheduleId: string;
  scheduleName: string;
  scheduleLogoUrl?: string;
  role: ScheduleRole;
  currentUser: string;
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  customEventTypes: Record<string, string[]>;
  onBack?: () => void;
}

const roleLabel = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const SIDEBAR_KEY = 'argus:sidebarCollapsed';
const viewPrefsKey = (scheduleId: string) => `argus:view:${scheduleId}`;
const VIEW_MODES: ViewMode[] = ['grid', 'gantt', 'vertical', 'summary', 'team'];
const SAVE_DELAY_MS = 400;
const PASTE_OFFSET_DAYS = 7;

// Viewers can look but not touch: no adding, editing, moving or deleting
const canEdit = (role: ScheduleRole) => role !== 'viewer';

// Undo stores inverse operations per slice rather than whole-array snapshots,
// so changes other members make between the action and the undo survive.
interface UndoSlice<T> {
  restore: T[]; // objects to write back (their pre-action values)
  removeIds: string[]; // objects the action created, to delete on undo
}
interface UndoOp {
  campaigns?: UndoSlice<Campaign>;
  people?: UndoSlice<Person>;
  events?: UndoSlice<Event>;
  customTypes?: Record<string, string[]>;
}

const applyUndoSlice = <T extends { id: string }>(prev: T[], op: UndoSlice<T>) => {
  const remove = new Set(op.removeIds);
  const byId = new Map(prev.filter(x => !remove.has(x.id)).map(x => [x.id, x]));
  op.restore.forEach(x => byId.set(x.id, x));
  return Array.from(byId.values());
};

export default function SimpleScheduleView({
  scheduleId,
  scheduleName,
  scheduleLogoUrl,
  role,
  currentUser,
  events,
  campaigns,
  people,
  customEventTypes: initialCustomEventTypes,
  onBack,
}: SimpleScheduleViewProps) {
  const readOnly = !canEdit(role);
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showWeekends, setShowWeekends] = useState(false);
  const [showEventNotes, setShowEventNotes] = useState(false);
  const [showPeople, setShowPeople] = useState(true);
  const [showMisc, setShowMisc] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [clipboardEvents, setClipboardEvents] = useState<Omit<Event, 'id'>[]>([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState(new Date());
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<Event | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isManageEventsModalOpen, setIsManageEventsModalOpen] = useState(false);
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // The filter sidebar can be hidden to give the schedule more room; the
  // choice is remembered on this device
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
  }, []);
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  // Reopen each schedule on the view and zoom it was last left on
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(viewPrefsKey(scheduleId)) || 'null');
      if (saved && VIEW_MODES.includes(saved.view)) setViewMode(saved.view);
      if (typeof saved?.zoom === 'number' && saved.zoom >= 0.5 && saved.zoom <= 1.5) setZoom(saved.zoom);
    } catch {
      // Malformed prefs just fall back to the defaults
    }
  }, [scheduleId]);

  useEffect(() => {
    localStorage.setItem(viewPrefsKey(scheduleId), JSON.stringify({ view: viewMode, zoom }));
  }, [scheduleId, viewMode, zoom]);
  const [selectedCampaignToEdit, setSelectedCampaignToEdit] = useState<Campaign | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ name: string; view?: string }[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>(campaigns);
  const [allEvents, setAllEvents] = useState<Event[]>(events);
  const [allPeople, setAllPeople] = useState<Person[]>(people);
  const [customEventTypes, setCustomEventTypes] = useState<Record<string, string[]>>(initialCustomEventTypes);

  // Drop people from the filter once they are no longer assigned to any event
  useEffect(() => {
    const assigned = new Set(
      allEvents.flatMap(e => (e.assignees?.length ? e.assignees : e.assignee ? [e.assignee] : []))
    );
    setSelectedPeople(prev => {
      const next = new Set(Array.from(prev).filter(id => assigned.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [allEvents]);

  // Save changes to the database shortly after they happen
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [sync] = useState(() =>
    createScheduleSync(scheduleId, { campaigns, events, people, customEventTypes: initialCustomEventTypes })
  );
  const latestContent = useRef({ campaigns: allCampaigns, events: allEvents, people: allPeople, customEventTypes });
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const isMounted = useRef(true);
  const undoStack = useRef<UndoOp[]>([]);
  const resizeGestureRef = useRef<{ eventId: string; pushed: boolean } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const saveNow = useCallback(() => {
    saveQueue.current = saveQueue.current
      .then(() => sync.save(latestContent.current))
      .then(
        () => {
          if (isMounted.current) setSaveState(sync.isDirty(latestContent.current) ? 'saving' : 'saved');
        },
        error => {
          console.error('Could not save schedule', error);
          if (isMounted.current) setSaveState('error');
        }
      );
  }, [sync]);

  useEffect(() => {
    latestContent.current = { campaigns: allCampaigns, events: allEvents, people: allPeople, customEventTypes };
    if (!sync.isDirty(latestContent.current)) return;
    setSaveState('saving');
    const timer = setTimeout(saveNow, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allCampaigns, allEvents, allPeople, customEventTypes, sync, saveNow]);

  // Leaving the schedule: save anything still waiting
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (sync.isDirty(latestContent.current)) saveNow();
    };
  }, [sync, saveNow]);

  // Live collaboration: merge other members' saved changes into local state.
  // Rows with unsaved local edits win over incoming remote versions; untouched
  // rows follow whoever saved last. Remote deletes always apply.
  useEffect(() => {
    const filter = `schedule_id=eq.${scheduleId}`;

    const onCampaignChange = (payload: any) => {
      const { eventType, new: n, old: o } = payload;
      if (eventType === 'DELETE') {
        setAllCampaigns(prev => {
          if (!prev.some(c => c.id === o.id) && !sync.hasSaved('campaigns', o.id)) return prev;
          sync.drop('campaigns', o.id);
          return prev.filter(c => c.id !== o.id);
        });
        // The campaign's events are cascade-deleted remotely too
        setAllEvents(prev => {
          prev.filter(e => e.campaignId === o.id).forEach(e => sync.drop('events', e.id));
          return prev.filter(e => e.campaignId !== o.id);
        });
        return;
      }
      const remote = campaignFromRow(n);
      setAllCampaigns(prev => {
        const local = prev.find(c => c.id === remote.id);
        if (local && !sync.isSynced('campaigns', campaignToRow(scheduleId, local))) return prev;
        if (!local && sync.hasSaved('campaigns', remote.id)) return prev;
        sync.adopt('campaigns', campaignToRow(scheduleId, remote));
        return local ? prev.map(c => (c.id === remote.id ? remote : c)) : [...prev, remote];
      });
    };

    const onPersonChange = (payload: any) => {
      const { eventType, new: n, old: o } = payload;
      if (eventType === 'DELETE') {
        setAllPeople(prev => {
          if (!prev.some(p => p.id === o.id) && !sync.hasSaved('people', o.id)) return prev;
          sync.drop('people', o.id);
          return prev.filter(p => p.id !== o.id);
        });
        return;
      }
      const remote = personFromRow(n);
      setAllPeople(prev => {
        const local = prev.find(p => p.id === remote.id);
        if (local && !sync.isSynced('people', personToRow(scheduleId, local))) return prev;
        if (!local && sync.hasSaved('people', remote.id)) return prev;
        sync.adopt('people', personToRow(scheduleId, remote));
        return local ? prev.map(p => (p.id === remote.id ? remote : p)) : [...prev, remote];
      });
    };

    const onEventChange = (payload: any) => {
      const { eventType, new: n, old: o } = payload;
      if (eventType === 'DELETE') {
        setAllEvents(prev => {
          if (!prev.some(e => e.id === o.id) && !sync.hasSaved('events', o.id)) return prev;
          sync.drop('events', o.id);
          return prev.filter(e => e.id !== o.id);
        });
        return;
      }
      const remote = eventFromRow(n, latestContent.current.campaigns.find(c => c.id === n.campaign_id));
      setAllEvents(prev => {
        const local = prev.find(e => e.id === remote.id);
        if (local && !sync.isSynced('events', eventToRow(scheduleId, local))) return prev;
        if (!local && sync.hasSaved('events', remote.id)) return prev;
        sync.adopt('events', eventToRow(scheduleId, remote));
        return local ? prev.map(e => (e.id === remote.id ? remote : e)) : [...prev, remote];
      });
    };

    const onTypeChange = (payload: any) => {
      const { eventType, new: n, old: o } = payload;
      if (eventType === 'DELETE') {
        setCustomEventTypes(prev => {
          if (prev[o.stage] === undefined && !sync.hasSaved('custom_event_types', o.stage)) return prev;
          sync.drop('custom_event_types', o.stage);
          const next = { ...prev };
          delete next[o.stage];
          return next;
        });
        return;
      }
      const titles: string[] = n.titles ?? [];
      setCustomEventTypes(prev => {
        const local = prev[n.stage];
        if (local !== undefined && !sync.isSynced('custom_event_types', customTypeToRow(scheduleId, n.stage, local))) return prev;
        if (local === undefined && sync.hasSaved('custom_event_types', n.stage)) return prev;
        sync.adopt('custom_event_types', customTypeToRow(scheduleId, n.stage, titles));
        return { ...prev, [n.stage]: titles };
      });
    };

    // Which view each user is on, learned via broadcast. Presence track() is
    // rate-limited to 5 calls per client per 30s, so it only carries who is
    // online; view changes go over broadcast, which is built for frequent
    // ephemeral updates.
    const viewByUser = new Map<string, string>();
    const broadcastView = () => {
      channel
        .send({ type: 'broadcast', event: 'view-change', payload: { name: currentUser, view: viewModeRef.current } })
        .catch(() => {});
    };

    const channel = supabase
      .channel(`schedule-${scheduleId}`, { config: { presence: { key: currentUser } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter }, onCampaignChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people', filter }, onPersonChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter }, onEventChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_event_types', filter }, onTypeChange)
      .on('broadcast', { event: 'view-change' }, ({ payload }: any) => {
        if (!payload?.name || !payload?.view) return;
        viewByUser.set(payload.name, payload.view);
        setOnlineUsers(prev =>
          prev.map(u => (u.name === payload.name ? { ...u, view: payload.view } : u))
        );
      })
      .on('presence', { event: 'sync' }, () => {
        const users = new Map<string, string | undefined>();
        Object.values(channel.presenceState()).forEach((metas: any) =>
          metas.forEach((meta: any) => {
            if (!meta.name) return;
            users.set(
              meta.name,
              meta.name === currentUser ? viewModeRef.current : viewByUser.get(meta.name) ?? meta.view
            );
          })
        );
        setOnlineUsers(
          Array.from(users, ([name, view]) => ({ name, view }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        // Someone just joined or left — rebroadcast our view so the newcomer
        // learns where everyone actually is, not just their join-time view
        broadcastView();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          channel.track({ name: currentUser, view: viewModeRef.current }).catch(() => {});
        }
      });
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [scheduleId, sync, currentUser]);

  // Tell everyone else which view we're on via broadcast (presence track is
  // rate-limited to a few calls per 30s, so it isn't used for view updates)
  useEffect(() => {
    channelRef.current
      ?.send({ type: 'broadcast', event: 'view-change', payload: { name: currentUser, view: viewMode } })
      .catch(() => {});
    setOnlineUsers(prev => prev.map(u => (u.name === currentUser ? { ...u, view: viewMode } : u)));
  }, [viewMode, currentUser]);

  // Views anchor on the current date and only show the previous 2 weeks, so
  // navigating back before the current month has nothing to show
  const canNavigatePrev = startOfMonth(addMonths(currentDate, -1)) >= startOfMonth(new Date());
  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev) return;
    setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  };

  const handleExport = async (exportFormat: 'jpeg' | 'pdf') => {
    setIsExportMenuOpen(false);
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { exportSchedule, exportFileName } = await import('@/lib/exportUtils');
      // Legend shows the campaigns currently visible under the filters
      const legendCampaigns = allCampaigns.filter(
        c => selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
      );
      await exportSchedule(
        exportRef.current,
        exportFormat,
        exportFileName(
          legendCampaigns.length > 0 ? legendCampaigns.map(c => c.name) : [scheduleName]
        ),
        {
          title: scheduleName,
          date: format(new Date(), 'd MMM yyyy'),
          scheduleLogoUrl,
          campaigns: legendCampaigns.map(c => ({ name: c.name, color: c.color, logoUrl: c.logoUrl })),
        }
      );
    } catch (error) {
      console.error('Export failed', error);
      notify('Sorry, the export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateClick = (date: Date) => {
    if (readOnly) return;
    setSelectedDateForEvent(date);
    setIsAddEventModalOpen(true);
  };

  // A locked campaign is frozen: its events can't be added, edited, moved, resized or deleted
  const getLockedCampaign = (campaignId: string) =>
    allCampaigns.find(c => c.id === campaignId && c.locked);
  const warnLocked = (campaign: Campaign) =>
    notify(`"${campaign.name}" is locked${campaign.lockedBy ? ` by ${campaign.lockedBy}` : ''}. Unlock the campaign to make changes.`, 'info');

  const handleAddEvent = (newEvent: Omit<Event, 'id'>) => {
    const locked = getLockedCampaign(newEvent.campaignId);
    if (locked) return warnLocked(locked);
    const eventWithId: Event = {
      ...newEvent,
      id: crypto.randomUUID(),
    };
    pushUndo({ events: { restore: [], removeIds: [eventWithId.id] } });
    setAllEvents([...allEvents, eventWithId]);
  };

  const handleEventDoubleClick = (event: Event) => {
    if (readOnly) return;
    const locked = getLockedCampaign(event.campaignId);
    if (locked) return warnLocked(locked);
    setSelectedEventToEdit(event);
    setIsEditEventModalOpen(true);
  };

  const handleEventSelect = (eventId: string, action: EventSelectionAction) => {
    if (readOnly) return;
    const event = allEvents.find(e => e.id === eventId);
    if (!event || getLockedCampaign(event.campaignId)) return;

    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (action === 'toggle') {
        if (next.has(eventId)) next.delete(eventId);
        else next.add(eventId);
      } else if (action === 'select') {
        next.clear();
        next.add(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleUpdateEvent = (id: string, updatedEvent: Omit<Event, 'id'>) => {
    const current = allEvents.find(e => e.id === id);
    const locked = (current && getLockedCampaign(current.campaignId)) || getLockedCampaign(updatedEvent.campaignId);
    if (locked) return warnLocked(locked);
    if (current) pushUndo({ events: { restore: [current], removeIds: [] } });
    setAllEvents(allEvents.map(event =>
      event.id === id ? { ...updatedEvent, id } : event
    ));
  };

  const handleDeleteEvent = (id: string) => {
    const current = allEvents.find(e => e.id === id);
    const locked = current && getLockedCampaign(current.campaignId);
    if (locked) return warnLocked(locked);
    const op = current ? pushUndo({ events: { restore: [current], removeIds: [] } }) : undefined;
    setAllEvents(allEvents.filter(event => event.id !== id));
    if (op) notify('Event deleted.', 'info', {
      action: { label: 'Undo', run: () => undoFromToast(op) },
      durationMs: 8000,
    });
  };

  // Convert people names to person IDs, creating people as needed
  const resolveNamesToIds = (names: string[], peopleList: Person[]): { ids: string[]; newPeople: Person[] } => {
    const ids: string[] = [];
    const newPeople: Person[] = [];
    names.forEach(name => {
      const existing = peopleList.find(p => p.name.toLowerCase() === name.toLowerCase())
        || newPeople.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        ids.push(existing.id);
      } else {
        const newPerson: Person = { id: crypto.randomUUID(), name, role: 'Team Member' };
        newPeople.push(newPerson);
        ids.push(newPerson.id);
      }
    });
    return { ids, newPeople };
  };

  const handleAddCampaign = (newCampaign: Omit<Campaign, 'id'>) => {
    // Convert people names to IDs, creating people as needed
    let peopleIds = newCampaign.people;
    let newPersonIds: string[] = [];
    if (newCampaign.people?.length) {
      const { ids, newPeople } = resolveNamesToIds(newCampaign.people, allPeople);
      newPersonIds = newPeople.map(p => p.id);
      if (newPeople.length) setAllPeople(prev => [...prev, ...newPeople]);
      peopleIds = ids;
    }
    const campaignWithId: Campaign = {
      ...newCampaign,
      id: crypto.randomUUID(),
      people: peopleIds,
    };
    pushUndo({
      campaigns: { restore: [], removeIds: [campaignWithId.id] },
      ...(newPersonIds.length ? { people: { restore: [], removeIds: newPersonIds } } : {}),
    });
    setAllCampaigns([...allCampaigns, campaignWithId]);
  };

  const handleUpdateCampaign = (id: string, updatedCampaign: Omit<Campaign, 'id'>, replaceEventNames = false) => {
    let peopleIds = updatedCampaign.people;
    let newPersonIds: string[] = [];
    if (updatedCampaign.people?.length) {
      const { ids, newPeople } = resolveNamesToIds(updatedCampaign.people, allPeople);
      newPersonIds = newPeople.map(p => p.id);
      if (newPeople.length) setAllPeople(prev => [...prev, ...newPeople]);
      peopleIds = ids;
    }
    const finalPeopleIds = peopleIds ?? allCampaigns.find(c => c.id === id)?.people;
    const oldCampaign = allCampaigns.find(c => c.id === id);
    const rewritten = replaceEventNames ? allEvents.filter(e => e.campaignId === id && !e.isMisc) : [];
    pushUndo({
      campaigns: { restore: oldCampaign ? [oldCampaign] : [], removeIds: [] },
      ...(rewritten.length ? { events: { restore: rewritten, removeIds: [] } } : {}),
      ...(newPersonIds.length ? { people: { restore: [], removeIds: newPersonIds } } : {}),
    });
    setAllCampaigns(allCampaigns.map(campaign =>
      campaign.id === id ? { ...updatedCampaign, id, people: peopleIds ?? campaign.people } : campaign
    ));
    // "Replace all campaign events with name(s)": rewrite every event in this
    // campaign (excluding Misc blocks) to the people just saved. When
    // unchecked, the names only prefill events added from now on.
    if (replaceEventNames) {
      const ids = finalPeopleIds ?? [];
      setAllEvents(allEvents.map(event =>
        event.campaignId === id && !event.isMisc
          ? { ...event, assignee: ids[0], assignees: ids.length ? ids : undefined }
          : event
      ));
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaignToEdit(campaign);
    setIsEditCampaignModalOpen(true);
  };

  const handleDeleteCampaign = (id: string) => {
    const locked = getLockedCampaign(id);
    if (locked) return warnLocked(locked);
    const campaign = allCampaigns.find(c => c.id === id);
    const op = pushUndo({
      campaigns: { restore: campaign ? [campaign] : [], removeIds: [] },
      events: { restore: allEvents.filter(e => e.campaignId === id), removeIds: [] },
    });
    setAllCampaigns(allCampaigns.filter(c => c.id !== id));
    setAllEvents(allEvents.filter(e => e.campaignId !== id));
    notify('Campaign deleted.', 'info', {
      action: { label: 'Undo', run: () => undoFromToast(op) },
      durationMs: 8000,
    });
  };

  const handleArchiveCampaign = async (id: string) => {
    const campaign = allCampaigns.find(c => c.id === id);
    if (!campaign) return;
    const locked = getLockedCampaign(id);
    if (locked) return warnLocked(locked);

    const events = allEvents.filter(event => event.campaignId === id);
    const referencedPeople = new Set<string>([
      ...(campaign.people ?? []),
      ...events.flatMap(event => event.assignees?.length ? event.assignees : event.assignee ? [event.assignee] : []),
    ]);
    const people = allPeople.filter(person => referencedPeople.has(person.id));

    try {
      await archiveCampaign(scheduleId, { campaign, events, people });
      setAllCampaigns(allCampaigns.filter(c => c.id !== id));
      setAllEvents(allEvents.filter(e => e.campaignId !== id));
    } catch (error) {
      console.error('Could not archive campaign', error);
      notify('The campaign couldn’t be archived. Please try again.');
    }
  };

  const handleDuplicateCampaign = (campaignId: string, details: DuplicateCampaignDetails) => {
    const source = allCampaigns.find(c => c.id === campaignId);
    if (!source) return;

    const newCampaign: Campaign = {
      ...source,
      id: crypto.randomUUID(),
      name: details.name,
      color: details.color,
      locked: false,
    };
    delete newCampaign.lockedBy;

    const dayOffset = details.weeks * 7;
    const duplicatedEvents = allEvents
      .filter(event => event.campaignId === source.id)
      .map(event => ({
        ...event,
        id: crypto.randomUUID(),
        campaignId: newCampaign.id,
        startDate: addDays(new Date(event.startDate), dayOffset),
        endDate: addDays(new Date(event.endDate), dayOffset),
        color: event.isMisc ? event.color : getStageColor(details.color, event.stage),
      }));

    pushUndo({
      campaigns: { restore: [], removeIds: [newCampaign.id] },
      events: { restore: [], removeIds: duplicatedEvents.map(e => e.id) },
    });
    setAllCampaigns(prev => [...prev, newCampaign]);
    setAllEvents(prev => [...prev, ...duplicatedEvents]);
  };

  const handleAddPerson = (name: string): Person => {
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name,
      role: 'Team Member',
    };
    pushUndo({ people: { restore: [], removeIds: [newPerson.id] } });
    setAllPeople(prev => [...prev, newPerson]);
    return newPerson;
  };

  const handleUpdateCustomEventTypes = (next: Record<string, string[]>) => {
    pushUndo({ customTypes: customEventTypes });
    setCustomEventTypes(next);
  };

  const handleClearFilters = () => {
    setSelectedCampaigns(new Set());
    setSelectedPeople(new Set());
    setSelectedStages(new Set());
    setSelectedEvents(new Set());
  };

  const getEventTitlesForCampaigns = (campaignIds: Set<string>) => {
    const titles = new Set<string>();
    allEvents.forEach(event => {
      if (event.isMisc || event.stage === 'Misc') return;
      if (campaignIds.size === 0 || campaignIds.has(event.campaignId)) {
        getEventTitles(event).forEach(title => titles.add(title));
      }
    });
    return titles;
  };

  const handleToggleCampaign = (id: string) => {
    const nextCampaigns = new Set(selectedCampaigns);
    if (nextCampaigns.has(id)) nextCampaigns.delete(id);
    else nextCampaigns.add(id);
    setSelectedCampaigns(nextCampaigns);

    const allowedTitles = getEventTitlesForCampaigns(nextCampaigns);
    setSelectedEvents(prev => {
      const next = new Set(Array.from(prev).filter(title => allowedTitles.has(title)));
      return next.size === prev.size ? prev : next;
    });
  };

  const pushUndo = (op: UndoOp): UndoOp => {
    undoStack.current = [...undoStack.current.slice(-49), op];
    return op;
  };

  const handleEventResizeStart = (eventId: string) => {
    resizeGestureRef.current = { eventId, pushed: false };
  };

  const handleEventResizeEnd = () => {
    resizeGestureRef.current = null;
  };

  const applyUndoOp = useCallback((op: UndoOp) => {
    if (op.campaigns) setAllCampaigns(prev => applyUndoSlice(prev, op.campaigns!));
    if (op.people) setAllPeople(prev => applyUndoSlice(prev, op.people!));
    if (op.events) setAllEvents(prev => applyUndoSlice(prev, op.events!));
    if (op.customTypes) setCustomEventTypes(op.customTypes);
  }, []);

  const handleUndo = useCallback(() => {
    if (readOnly) return;
    const op = undoStack.current.pop();
    if (op) applyUndoOp(op);
  }, [readOnly, applyUndoOp]);

  // Toast "Undo" reverses that specific operation rather than whatever is on
  // top of the stack. It only applies while the op is still pending, so a
  // stale toast can't resurrect something already undone or re-deleted.
  const undoFromToast = (op: UndoOp) => {
    if (!undoStack.current.includes(op)) return;
    undoStack.current = undoStack.current.filter(o => o !== op);
    applyUndoOp(op);
  };

  const handleEventsDrop = (draggedEventId: string, eventIds: string[], newDate: Date) => {
    if (readOnly) return;
    const draggedEvent = allEvents.find(e => e.id === draggedEventId);
    if (!draggedEvent || getLockedCampaign(draggedEvent.campaignId)) return;

    const dayOffset = differenceInCalendarDays(newDate, new Date(draggedEvent.startDate));
    if (dayOffset === 0) return;

    const ids = new Set([draggedEventId, ...eventIds]);
    pushUndo({ events: { restore: allEvents.filter(e => ids.has(e.id)), removeIds: [] } });
    setAllEvents(allEvents.map(event => {
      if (!ids.has(event.id) || getLockedCampaign(event.campaignId)) return event;
      return {
        ...event,
        startDate: addDays(new Date(event.startDate), dayOffset),
        endDate: addDays(new Date(event.endDate), dayOffset),
      };
    }));
  };

  const handleEventResize = (eventId: string, newStartDate: Date, newEndDate: Date) => {
    if (readOnly) return;
    const current = allEvents.find(e => e.id === eventId);
    if (!current || getLockedCampaign(current.campaignId)) return;
    if (
      newStartDate.getTime() === current.startDate.getTime() &&
      newEndDate.getTime() === current.endDate.getTime()
    ) return;

    const gesture = resizeGestureRef.current;
    if (gesture?.eventId !== eventId || !gesture.pushed) {
      pushUndo({ events: { restore: [current], removeIds: [] } });
      if (gesture?.eventId === eventId) gesture.pushed = true;
    }

    setAllEvents(allEvents.map(event =>
      event.id === eventId
        ? { ...event, startDate: newStartDate, endDate: newEndDate }
        : event
    ));
  };

  // Filter events based on selections
  const filteredEvents = allEvents.filter(event => {
    const hasCampaignFilter = selectedCampaigns.size > 0;
    const isLinkedMisc = !!event.isMisc && !!event.campaignId;
    // Campaign-linked blocks (including linked Misc) follow campaign filters;
    // unlinked Misc bypass campaign filters and stay under the Misc toggle.
    if (hasCampaignFilter && event.campaignId && !selectedCampaigns.has(event.campaignId)) return false;
    if (event.isMisc && !isLinkedMisc && !showMisc) return false;
    if (event.isMisc && isLinkedMisc && !hasCampaignFilter && !showMisc) return false;
    if (selectedPeople.size > 0) {
      const eventAssignees = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
      // Only events assigned to a selected person; unassigned Misc events stay under the Misc toggle
      const isUnassignedMisc = event.isMisc && eventAssignees.length === 0;
      if (!isUnassignedMisc && !eventAssignees.some(id => selectedPeople.has(id))) return false;
    }
    if (selectedStages.size > 0 && !selectedStages.has(event.stage)) return false;
    if (selectedEvents.size > 0 && !getEventTitles(event).some(title => selectedEvents.has(title))) return false;
    return true;
  });

  // When specific event names are filtered, blocks show only the matching names
  const viewEvents = filteredEvents.map(event => ({
    ...event,
    title: getEventDisplayTitle(event, selectedEvents),
  }));

  // Keep the move selection limited to events that are currently visible
  useEffect(() => {
    const visibleIds = new Set(filteredEvents.map(event => event.id));
    setSelectedEventIds(prev => {
      const next = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredEvents]);

  // Ctrl/Cmd+C copies the selected event blocks; Ctrl/Cmd+V pastes them one week later
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('input, textarea, select, [contenteditable="true"]');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      if (key !== 'c' && key !== 'v' && !isUndo) return;
      if (isEditableTarget(event.target)) return;
      if (
        isAddEventModalOpen ||
        isEditEventModalOpen ||
        isNewCampaignModalOpen ||
        isManageEventsModalOpen ||
        isEditCampaignModalOpen ||
        isMembersModalOpen ||
        isShortcutsOpen
      ) return;

      if (isUndo) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (key === 'c') {
        if (readOnly || selectedEventIds.size === 0 || window.getSelection()?.toString().trim()) return;
        event.preventDefault();
        setClipboardEvents(
          allEvents
            .filter(e => selectedEventIds.has(e.id))
            .map(({ id, ...rest }) => rest)
        );
        return;
      }

      if (readOnly || clipboardEvents.length === 0) return;
      event.preventDefault();

      let skippedLocked = false;
      const pastedEvents = clipboardEvents
        .map(eventDraft => {
          const campaign = allCampaigns.find(c => c.id === eventDraft.campaignId);
          if (campaign?.locked) {
            skippedLocked = true;
            return null;
          }
          return {
            ...eventDraft,
            id: crypto.randomUUID(),
            startDate: addDays(new Date(eventDraft.startDate), PASTE_OFFSET_DAYS),
            endDate: addDays(new Date(eventDraft.endDate), PASTE_OFFSET_DAYS),
            color: eventDraft.isMisc ? eventDraft.color : (campaign ? getStageColor(campaign.color, eventDraft.stage) : '#999999'),
          } as Event;
        })
        .filter((pasted): pasted is Event => pasted !== null);

      if (pastedEvents.length === 0) {
        if (skippedLocked) notify('Copied events belong to a locked campaign.', 'info');
        return;
      }

      pushUndo({ events: { restore: [], removeIds: pastedEvents.map(pasted => pasted.id) } });
      setAllEvents(prev => [...prev, ...pastedEvents]);
      setSelectedEventIds(new Set(pastedEvents.map(pasted => pasted.id)));
      setClipboardEvents(pastedEvents.map(({ id, ...rest }) => rest));
      if (skippedLocked) notify('Some copied events were skipped because their campaign is locked.', 'info');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    allCampaigns,
    allEvents,
    clipboardEvents,
    handleUndo,
    isAddEventModalOpen,
    isEditCampaignModalOpen,
    isEditEventModalOpen,
    isManageEventsModalOpen,
    isMembersModalOpen,
    isNewCampaignModalOpen,
    isShortcutsOpen,
    readOnly,
    selectedEventIds,
  ]);

  // '?' opens the shortcuts panel when nothing else is open or being typed in
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[data-dismiss-layer]')) return;
      e.preventDefault();
      setIsShortcutsOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Empty state shown over the schedule when there's nothing to see
  const hasFilters = selectedCampaigns.size > 0 || selectedPeople.size > 0 || selectedStages.size > 0 || selectedEvents.size > 0;
  const emptyState =
    allCampaigns.length === 0 && allEvents.length === 0
      ? {
          icon: <LayoutGrid size={22} className="text-gray-400" />,
          title: 'No campaigns yet',
          text: readOnly ? 'Campaigns added to this schedule will appear here.' : 'Add a campaign to start planning blocks.',
          action: readOnly ? null : { label: 'New campaign', onClick: () => setIsNewCampaignModalOpen(true) },
        }
      : viewEvents.length === 0 && hasFilters
      ? {
          icon: <FilterX size={22} className="text-gray-400" />,
          title: 'No blocks match these filters',
          text: 'Try removing a filter to see more of the schedule.',
          action: { label: 'Clear filters', onClick: handleClearFilters },
        }
      : allEvents.length === 0
      ? {
          icon: <CalendarPlus size={22} className="text-gray-400" />,
          title: 'No blocks yet',
          text: readOnly ? 'Blocks added to this schedule will appear here.' : 'Double-click a day in Grid view to add the first block.',
          action: readOnly || viewMode === 'grid' ? null : { label: 'Go to Grid view', onClick: () => setViewMode('grid') },
        }
      : null;

  return (
    <div className="flex flex-col h-full min-w-0 w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-4 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
                title="Back to schedules"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl font-semibold text-gray-800 truncate">{scheduleName}</h1>
              <span className="hidden sm:flex text-xs font-medium text-white bg-gray-900 px-2.5 py-1 rounded-full items-center gap-1 flex-shrink-0">
                <ShieldCheck size={11} />
                {roleLabel[role]}
              </span>
              {readOnly ? (
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">Read-only</span>
              ) : saveState === 'error' ? (
                <button onClick={saveNow} className="hidden sm:inline text-xs text-red-600 underline whitespace-nowrap">
                  Couldn’t save. Retry
                </button>
              ) : (
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">
                  {saveState === 'saving' ? 'Saving…' : 'Saved'}
                </span>
              )}
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Members and invites"
              >
                <Users size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <button
                onClick={() => navigateDate('prev')}
                disabled={!canNavigatePrev}
                className="p-1.5 border border-gray-300 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 rounded-lg font-medium"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 border border-gray-300 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <span className="ml-1 text-sm font-medium text-gray-700 whitespace-nowrap tabular-nums">
                {format(currentDate, 'MMM yyyy')}
              </span>
            </div>
          </div>

          {scheduleLogoUrl && (
            <div className="flex-1 min-w-0 flex items-center justify-center px-4">
              <img src={scheduleLogoUrl} alt={scheduleName} className="max-h-[72px] max-w-full object-contain" />
            </div>
          )}
          {/* Below the breakpoint that fits everything on one line, the
              controls drop to a second row, right-aligned */}
          <div className={`flex justify-end w-full ${sidebarCollapsed ? 'min-[1280px]:contents' : 'min-[1480px]:contents'}`}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-px w-4 bg-gray-300" />
                <span className="text-[10px] leading-none font-semibold text-gray-500 tracking-wider">ZOOM</span>
                <span className="h-px w-4 bg-gray-300" />
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                  disabled={zoom <= 0.5}
                  className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Zoom out"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 w-14 text-center border-x border-gray-300"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
                  disabled={zoom >= 1.5}
                  className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Zoom in"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-px w-4 bg-gray-300" />
                <span className="text-[10px] leading-none font-semibold text-gray-500 tracking-wider">EXPORT</span>
                <span className="h-px w-4 bg-gray-300" />
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(open => !open)}
                  disabled={isExporting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
                >
                  <Download size={16} />
                  <span>{isExporting ? 'Exporting…' : 'PDF / JPEG'}</span>
                </button>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={() => handleExport('jpeg')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export JPEG
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-px w-4 bg-gray-300" />
                <span className="text-[10px] leading-none font-semibold text-gray-500 tracking-wider">VIEWS</span>
                <span className="h-px w-4 bg-gray-300" />
              </div>
            <div className="flex items-start gap-1 bg-gray-100 rounded-lg p-1">
              {VIEW_MODES.map(mode => (
                <div key={mode} className="flex flex-col items-center">
                  <button
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      viewMode === mode
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                  <div className="h-5 mt-0.5 flex items-center justify-center">
                    <PresenceAvatars
                      users={onlineUsers.filter(u => u.view === mode).map(u => u.name)}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar
          campaigns={allCampaigns}
          people={allPeople}
          events={allEvents}
          selectedCampaigns={selectedCampaigns}
          selectedPeople={selectedPeople}
          selectedStages={selectedStages}
          selectedEvents={selectedEvents}
          showWeekends={showWeekends}
          showEventNotes={showEventNotes}
          showPeople={showPeople}
          showMisc={showMisc}
          onToggleCampaign={handleToggleCampaign}
          onTogglePerson={(id) => {
            const newSet = new Set(selectedPeople);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            setSelectedPeople(newSet);
          }}
          onToggleStage={(stage) => {
            const newSet = new Set(selectedStages);
            newSet.has(stage) ? newSet.delete(stage) : newSet.add(stage);
            setSelectedStages(newSet);
          }}
          onToggleEvent={(event) => {
            const newSet = new Set(selectedEvents);
            newSet.has(event) ? newSet.delete(event) : newSet.add(event);
            setSelectedEvents(newSet);
          }}
          onToggleShowWeekends={() => setShowWeekends(!showWeekends)}
          onToggleShowEventNotes={() => setShowEventNotes(!showEventNotes)}
          onToggleShowPeople={() => setShowPeople(!showPeople)}
          onToggleShowMisc={() => setShowMisc(!showMisc)}
          onEditCampaign={readOnly ? undefined : handleEditCampaign}
          onNewCampaign={readOnly ? undefined : () => setIsNewCampaignModalOpen(true)}
          onManageEvents={readOnly ? undefined : () => setIsManageEventsModalOpen(true)}
          onClearFilters={handleClearFilters}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          onShowShortcuts={() => setIsShortcutsOpen(true)}
        />

        <div className="relative flex-1 min-w-0 overflow-hidden bg-white flex flex-col">
          {/* Sits outside the export area so it never appears in exports */}
          {emptyState && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-6">
              <div className="pointer-events-auto bg-white border border-gray-200 rounded-xl shadow-lg px-6 py-5 max-w-xs text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {emptyState.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-800">{emptyState.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{emptyState.text}</p>
                {emptyState.action && (
                  <button
                    onClick={emptyState.action.onClick}
                    className="mt-3 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                  >
                    {emptyState.action.label}
                  </button>
                )}
              </div>
            </div>
          )}
          <div ref={exportRef} className="w-full h-full flex flex-col bg-white" style={{ zoom }}>
          {viewMode === 'gantt' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <GanttView
                events={viewEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                selectedEventIds={selectedEventIds}
                onEventSelect={handleEventSelect}
                onEventsDrop={handleEventsDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'vertical' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <VerticalView
                events={viewEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                selectedEventIds={selectedEventIds}
                onEventSelect={handleEventSelect}
                onEventsDrop={handleEventsDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'summary' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <SummaryView
                events={viewEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'team' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <TeamView
                events={viewEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                selectedEventIds={selectedEventIds}
                onEventSelect={handleEventSelect}
                onEventsDrop={handleEventsDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedPeople={selectedPeople}
              />
            </div>
          ) : (
            <GridView
              events={viewEvents}
              campaigns={allCampaigns}
              people={allPeople}
              currentDate={currentDate}
              onDateClick={handleDateClick}
              onEventDoubleClick={handleEventDoubleClick}
              selectedEventIds={selectedEventIds}
              onEventSelect={handleEventSelect}
              onEventsDrop={handleEventsDrop}
              onEventResize={handleEventResize}
              onEventResizeStart={handleEventResizeStart}
              onEventResizeEnd={handleEventResizeEnd}
              showWeekends={showWeekends}
              showEventNotes={showEventNotes}
              showPeople={showPeople}
            />
          )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onAddEvent={handleAddEvent}
        selectedDate={selectedDateForEvent}
        campaigns={allCampaigns}
        people={allPeople}
        selectedCampaigns={selectedCampaigns}
        customEventTypes={customEventTypes}
        onAddPerson={handleAddPerson}
        onManageEvents={() => setIsManageEventsModalOpen(true)}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
        event={selectedEventToEdit}
        campaigns={allCampaigns}
        people={allPeople}
        customEventTypes={customEventTypes}
        onAddPerson={handleAddPerson}
        onManageEvents={() => setIsManageEventsModalOpen(true)}
      />

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        onAddCampaign={handleAddCampaign}
        existingCampaigns={allCampaigns}
      />

      {/* Manage Events Modal */}
      <ManageEventsModal
        isOpen={isManageEventsModalOpen}
        onClose={() => setIsManageEventsModalOpen(false)}
        customEvents={customEventTypes}
        onUpdateCustomEvents={handleUpdateCustomEventTypes}
      />

      {/* Edit Campaign Modal */}
      <EditCampaignModal
        isOpen={isEditCampaignModalOpen}
        onClose={() => setIsEditCampaignModalOpen(false)}
        onUpdateCampaign={handleUpdateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        onArchiveCampaign={readOnly ? undefined : handleArchiveCampaign}
        onDuplicateCampaign={readOnly ? undefined : handleDuplicateCampaign}
        currentUser={currentUser}
        campaign={selectedCampaignToEdit}
        allCampaigns={allCampaigns}
        people={allPeople}
      />

      {/* Members & Invites Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        scheduleId={scheduleId}
        scheduleName={scheduleName}
        role={role}
        currentUser={currentUser}
      />
    </div>
  );
}
