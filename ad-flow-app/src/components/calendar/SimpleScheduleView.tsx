'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addMonths, startOfMonth } from 'date-fns';
import CalendarGrid from './CalendarGrid';
import FilterSidebar from './FilterSidebar';

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
  const [showWeekends, setShowWeekends] = useState(false);
  const [showEventNotes, setShowEventNotes] = useState(false);
  const [showPeople, setShowPeople] = useState(true);
  const [showMisc, setShowMisc] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  };

  const getDateRangeText = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = addMonths(startDate, 5);
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // TODO: Open add event modal
  };

  // Filter events based on selections
  const filteredEvents = events.filter(event => {
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
      <div className="bg-white border-b border-gray-200 px-4 py-3">
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
            <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2 text-sm">
              Daily 6
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar
          campaigns={campaigns}
          people={people}
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
        />

        <div className="flex-1 overflow-y-auto bg-white">
          <CalendarGrid
            events={filteredEvents}
            campaigns={campaigns}
            people={people}
            currentDate={currentDate}
            onDateClick={handleDateClick}
            showWeekends={showWeekends}
            showEventNotes={showEventNotes}
            showPeople={showPeople}
          />
        </div>
      </div>
    </div>
  );
}
