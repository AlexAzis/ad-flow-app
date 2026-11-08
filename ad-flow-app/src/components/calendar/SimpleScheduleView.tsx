'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addMonths, startOfMonth } from 'date-fns';
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
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
}

export default function SimpleScheduleView({
  events,
  campaigns,
  people,
}: SimpleScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date('2026-11-01'));
  const [viewMode, setViewMode] = useState<'daily-6' | 'daily-12' | 'gantt' | 'vertical' | 'topline' | 'people'>('daily-6');
  const [showWeekends, setShowWeekends] = useState(false);
  const [showEventNotes, setShowEventNotes] = useState(false);
  const [showPeople, setShowPeople] = useState(true);
  const [showMisc, setShowMisc] = useState(true);
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
  const [customEventTypes, setCustomEventTypes] = useState<Record<string, string[]>>({});

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  };

  const getDateRangeText = () => {
    const startDate = startOfMonth(currentDate);
    const monthsToShow = viewMode === 'daily-6' ? 5 : viewMode === 'daily-12' ? 11 : 2;
    const endDate = addMonths(startDate, monthsToShow);
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDateForEvent(date);
    setIsAddEventModalOpen(true);
  };

  const handleAddEvent = (newEvent: Omit<Event, 'id'>) => {
    const eventWithId: Event = {
      ...newEvent,
      id: Date.now().toString(),
    };
    setAllEvents([...allEvents, eventWithId]);
  };

  const handleEventDoubleClick = (event: Event) => {
    setSelectedEventToEdit(event);
    setIsEditEventModalOpen(true);
  };

  const handleUpdateEvent = (id: string, updatedEvent: Omit<Event, 'id'>) => {
    setAllEvents(allEvents.map(event =>
      event.id === id ? { ...updatedEvent, id } : event
    ));
  };

  const handleDeleteEvent = (id: string) => {
    setAllEvents(allEvents.filter(event => event.id !== id));
  };

  const handleAddCampaign = (newCampaign: Omit<Campaign, 'id'>) => {
    const campaignWithId: Campaign = {
      ...newCampaign,
      id: Date.now().toString(),
    };
    setAllCampaigns([...allCampaigns, campaignWithId]);
  };

  const handleUpdateCampaign = (id: string, updatedCampaign: Omit<Campaign, 'id'>) => {
    setAllCampaigns(allCampaigns.map(campaign =>
      campaign.id === id ? { ...updatedCampaign, id } : campaign
    ));
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaignToEdit(campaign);
    setIsEditCampaignModalOpen(true);
  };

  const handleAddPerson = (name: string): Person => {
    const newPerson: Person = {
      id: Date.now().toString(),
      name,
      role: 'Team Member',
    };
    setAllPeople([...allPeople, newPerson]);
    return newPerson;
  };

  const handleEventDrop = (eventId: string, newDate: Date) => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

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
    setAllEvents(allEvents.map(event =>
      event.id === eventId
        ? { ...event, startDate: newStartDate, endDate: newEndDate }
        : event
    ));
  };

  // Filter events based on selections
  const filteredEvents = allEvents.filter(event => {
    if (selectedCampaigns.size > 0 && !selectedCampaigns.has(event.campaignId)) return false;
    if (selectedPeople.size > 0 && event.assignee && !selectedPeople.has(event.assignee)) return false;
    if (selectedStages.size > 0 && !selectedStages.has(event.stage)) return false;
    if (selectedEvents.size > 0 && !selectedEvents.has(event.title)) return false;
    if (!showMisc && event.isMisc) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Sky - TV Products</h1>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Owner</span>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <span className="text-lg font-medium text-gray-800">
                {getDateRangeText()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <Download size={16} />
              <span>Export</span>
            </button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily-6')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'daily-6'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Daily 6
              </button>
              <button
                onClick={() => setViewMode('daily-12')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'daily-12'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Daily 12
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar
          campaigns={allCampaigns}
          people={allPeople}
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
        />

        <div className="flex-1 min-w-0 overflow-hidden bg-white flex flex-col">
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
              viewMode={viewMode as 'daily-6' | 'daily-12'}
            />
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onAddEvent={handleAddEvent}
        selectedDate={selectedDateForEvent}
        campaigns={campaigns}
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
        campaign={selectedCampaignToEdit}
      />
    </div>
  );
}
