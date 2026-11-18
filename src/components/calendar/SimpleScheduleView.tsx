'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, Minus, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addMonths, startOfMonth } from 'date-fns';
import { createScheduleSync, ScheduleRole } from '@/lib/scheduleData';
import CalendarGrid from './CalendarGrid';
import GanttView from './GanttView';
import VerticalView from './VerticalView';
import ToplineView from './ToplineView';
import PeopleView from './PeopleView';
import FilterSidebar from './FilterSidebar';
import AddEventModal from './AddEventModal';
import EditEventModal from './EditEventModal';
import NewCampaignModal from './NewCampaignModal';
import ManageEventsModal from './ManageEventsModal';
import EditCampaignModal from './EditCampaignModal';

interface SimpleScheduleViewProps {
  scheduleId: string;
  scheduleName: string;
  role: ScheduleRole;
  currentUser: string;
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  customEventTypes: Record<string, string[]>;
  onBack?: () => void;
}

const roleLabel = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const SAVE_DELAY_MS = 400;

export default function SimpleScheduleView({
  scheduleId,
  scheduleName,
  role,
  currentUser,
  events,
  campaigns,
  people,
  customEventTypes: initialCustomEventTypes,
  onBack,
}: SimpleScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
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
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState(new Date());
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<Event | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isManageEventsModalOpen, setIsManageEventsModalOpen] = useState(false);
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [selectedCampaignToEdit, setSelectedCampaignToEdit] = useState<Campaign | null>(null);
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

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  };

  const handleExport = async (exportFormat: 'jpeg' | 'pdf') => {
    setIsExportMenuOpen(false);
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { exportSchedule } = await import('@/lib/exportUtils');
      await exportSchedule(
        exportRef.current,
        exportFormat,
        `${scheduleName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schedule'}_${viewMode}_${format(new Date(), 'yyyy-MM-dd')}`
      );
    } catch (error) {
      console.error('Export failed', error);
      alert('Sorry, the export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'gantt': return 'Gantt Overview';
      case 'topline': return 'Topline Overview';
      case 'people': return 'People Overview';
      case 'vertical': return format(currentDate, 'MMMM yyyy');
      default: return getDateRangeText();
    }
  };

  const getDateRangeText = () => {
    const startDate = startOfMonth(currentDate);
    const monthsToShow = viewMode === 'daily' ? 11 : 2;
    const endDate = addMonths(startDate, monthsToShow);
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDateForEvent(date);
    setIsAddEventModalOpen(true);
  };

  // A locked campaign is frozen: its events can't be added, edited, moved, resized or deleted
  const getLockedCampaign = (campaignId: string) =>
    allCampaigns.find(c => c.id === campaignId && c.locked);
  const warnLocked = (campaign: Campaign) =>
    alert(`"${campaign.name}" is locked${campaign.lockedBy ? ` by ${campaign.lockedBy}` : ''}. Unlock the campaign to make changes.`);

  const handleAddEvent = (newEvent: Omit<Event, 'id'>) => {
    const locked = getLockedCampaign(newEvent.campaignId);
    if (locked) return warnLocked(locked);
    const eventWithId: Event = {
      ...newEvent,
      id: crypto.randomUUID(),
    };
    setAllEvents([...allEvents, eventWithId]);
  };

  const handleEventDoubleClick = (event: Event) => {
    const locked = getLockedCampaign(event.campaignId);
    if (locked) return warnLocked(locked);
    setSelectedEventToEdit(event);
    setIsEditEventModalOpen(true);
  };

  const handleUpdateEvent = (id: string, updatedEvent: Omit<Event, 'id'>) => {
    const current = allEvents.find(e => e.id === id);
    const locked = (current && getLockedCampaign(current.campaignId)) || getLockedCampaign(updatedEvent.campaignId);
    if (locked) return warnLocked(locked);
    setAllEvents(allEvents.map(event =>
      event.id === id ? { ...updatedEvent, id } : event
    ));
  };

  const handleDeleteEvent = (id: string) => {
    const current = allEvents.find(e => e.id === id);
    const locked = current && getLockedCampaign(current.campaignId);
    if (locked) return warnLocked(locked);
    setAllEvents(allEvents.filter(event => event.id !== id));
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
    if (newCampaign.people?.length) {
      const { ids, newPeople } = resolveNamesToIds(newCampaign.people, allPeople);
      if (newPeople.length) setAllPeople(prev => [...prev, ...newPeople]);
      peopleIds = ids;
    }
    const campaignWithId: Campaign = {
      ...newCampaign,
      id: crypto.randomUUID(),
      people: peopleIds,
    };
    setAllCampaigns([...allCampaigns, campaignWithId]);
  };

  const handleUpdateCampaign = (id: string, updatedCampaign: Omit<Campaign, 'id'>) => {
    let peopleIds = updatedCampaign.people;
    if (updatedCampaign.people?.length) {
      const { ids, newPeople } = resolveNamesToIds(updatedCampaign.people, allPeople);
      if (newPeople.length) setAllPeople(prev => [...prev, ...newPeople]);
      peopleIds = ids;
    }
    setAllCampaigns(allCampaigns.map(campaign =>
      campaign.id === id ? { ...updatedCampaign, id, people: peopleIds ?? campaign.people } : campaign
    ));
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaignToEdit(campaign);
    setIsEditCampaignModalOpen(true);
  };

  const handleDeleteCampaign = (id: string) => {
    const locked = getLockedCampaign(id);
    if (locked) return warnLocked(locked);
    setAllCampaigns(allCampaigns.filter(c => c.id !== id));
    setAllEvents(allEvents.filter(e => e.campaignId !== id));
  };

  const handleAddPerson = (name: string): Person => {
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name,
      role: 'Team Member',
    };
    setAllPeople(prev => [...prev, newPerson]);
    return newPerson;
  };

  const handleClearFilters = () => {
    setSelectedCampaigns(new Set());
    setSelectedPeople(new Set());
    setSelectedStages(new Set());
    setSelectedEvents(new Set());
  };

  const handleEventDrop = (eventId: string, newDate: Date) => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event || getLockedCampaign(event.campaignId)) return;

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const duration = endDate.getTime() - startDate.getTime();

    const updatedEvent = {
      ...event,
      startDate: newDate,
      endDate: new Date(newDate.getTime() + duration),
    };

    setAllEvents(allEvents.map(e => e.id === eventId ? updatedEvent : e));
  };

  const handleEventResize = (eventId: string, newStartDate: Date, newEndDate: Date) => {
    const current = allEvents.find(e => e.id === eventId);
    if (!current || getLockedCampaign(current.campaignId)) return;
    setAllEvents(allEvents.map(event =>
      event.id === eventId
        ? { ...event, startDate: newStartDate, endDate: newEndDate }
        : event
    ));
  };

  // Filter events based on selections
  const filteredEvents = allEvents.filter(event => {
    // Misc events bypass campaign filtering - controlled only by the Misc toggle
    if (!event.isMisc && selectedCampaigns.size > 0 && !selectedCampaigns.has(event.campaignId)) return false;
    if (selectedPeople.size > 0) {
      const eventAssignees = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
      // Only events assigned to a selected person; unassigned Misc events stay under the Misc toggle
      const isUnassignedMisc = event.isMisc && eventAssignees.length === 0;
      if (!isUnassignedMisc && !eventAssignees.some(id => selectedPeople.has(id))) return false;
    }
    if (selectedStages.size > 0 && !selectedStages.has(event.stage)) return false;
    if (selectedEvents.size > 0 && !selectedEvents.has(event.title)) return false;
    if (!showMisc && event.isMisc) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full min-w-0 w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Back to schedules"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-800">{scheduleName}</h1>
              <span className="text-xs font-medium text-white bg-gray-900 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck size={11} />
                {roleLabel[role]}
              </span>
              {saveState === 'error' ? (
                <button onClick={saveNow} className="text-xs text-red-600 underline whitespace-nowrap">
                  Couldn’t save. Retry
                </button>
              ) : (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {saveState === 'saving' ? 'Saving…' : 'Saved'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-8">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 rounded-lg font-medium"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 border border-gray-300 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 border border-gray-300 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <span className="text-lg font-medium text-gray-800">
                {getHeaderTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(open => !open)}
                disabled={isExporting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
              >
                <Download size={16} />
                <span>{isExporting ? 'Exporting…' : 'Export'}</span>
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
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-5 bg-gray-300" />
                <span className="text-xs font-semibold text-gray-500 tracking-wider">VIEWS</span>
                <span className="h-px w-5 bg-gray-300" />
              </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'daily'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'gantt'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Gantt
              </button>
              <button
                onClick={() => setViewMode('vertical')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'vertical'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Vertical
              </button>
              <button
                onClick={() => setViewMode('topline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'topline'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Topline
              </button>
              <button
                onClick={() => setViewMode('people')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'people'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                People
              </button>
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
          onToggleCampaign={(id) => {
            const newSet = new Set(selectedCampaigns);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            setSelectedCampaigns(newSet);
          }}
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
          onEditCampaign={handleEditCampaign}
          onNewCampaign={() => setIsNewCampaignModalOpen(true)}
          onManageEvents={() => setIsManageEventsModalOpen(true)}
          onClearFilters={handleClearFilters}
        />

        <div className="flex-1 min-w-0 overflow-hidden bg-white flex flex-col">
          <div ref={exportRef} className="w-full h-full flex flex-col bg-white" style={{ zoom }}>
          {viewMode === 'gantt' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <GanttView
                events={filteredEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                onEventDrop={handleEventDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'vertical' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <VerticalView
                events={filteredEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                onEventDrop={handleEventDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'topline' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <ToplineView
                events={filteredEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                onEventDrop={handleEventDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : viewMode === 'people' ? (
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <PeopleView
                events={filteredEvents}
                campaigns={allCampaigns}
                people={allPeople}
                currentDate={currentDate}
                onDateClick={handleDateClick}
                onEventDoubleClick={handleEventDoubleClick}
                onEventDrop={handleEventDrop}
                showWeekends={showWeekends}
                showEventNotes={showEventNotes}
                showPeople={showPeople}
                selectedCampaigns={selectedCampaigns}
              />
            </div>
          ) : (
            <CalendarGrid
              events={filteredEvents}
              campaigns={allCampaigns}
              people={allPeople}
              currentDate={currentDate}
              onDateClick={handleDateClick}
              onEventDoubleClick={handleEventDoubleClick}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
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
        onAddPerson={handleAddPerson}
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
        onUpdateCustomEvents={setCustomEventTypes}
      />

      {/* Edit Campaign Modal */}
      <EditCampaignModal
        isOpen={isEditCampaignModalOpen}
        onClose={() => setIsEditCampaignModalOpen(false)}
        onUpdateCampaign={handleUpdateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        currentUser={currentUser}
        campaign={selectedCampaignToEdit}
        allCampaigns={allCampaigns}
      />
    </div>
  );
}
