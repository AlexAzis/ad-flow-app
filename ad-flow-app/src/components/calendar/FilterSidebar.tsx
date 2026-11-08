'use client';

import { useState } from 'react';
import { Filter, Plus, Settings, StickyNote, Users, CalendarX, CircleDot } from 'lucide-react';
import { Campaign, Person, Event } from '@/lib/types';
import { getAllStages } from '@/lib/eventTypes';

interface FilterSidebarProps {
  campaigns: Campaign[];
  people: Person[];
  events?: Event[];
  selectedCampaigns: Set<string>;
  selectedPeople: Set<string>;
  selectedStages: Set<string>;
  selectedEvents: Set<string>;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  showMisc: boolean;
  onToggleCampaign: (id: string) => void;
  onTogglePerson: (id: string) => void;
  onToggleStage: (stage: string) => void;
  onToggleEvent: (event: string) => void;
  onToggleShowWeekends: () => void;
  onToggleShowEventNotes: () => void;
  onToggleShowPeople: () => void;
  onToggleShowMisc: () => void;
  onEditCampaign?: (campaign: Campaign) => void;
  onNewCampaign?: () => void;
  onManageEvents?: () => void;
  onClearFilters?: () => void;
}

export default function FilterSidebar({
  campaigns,
  people,
  events,
  selectedCampaigns,
  selectedPeople,
  selectedStages,
  selectedEvents,
  showWeekends,
  showEventNotes,
  showPeople,
  showMisc,
  onToggleCampaign,
  onTogglePerson,
  onToggleStage,
  onToggleEvent,
  onToggleShowWeekends,
  onToggleShowEventNotes,
  onToggleShowPeople,
  onToggleShowMisc,
  onEditCampaign,
  onNewCampaign,
  onManageEvents,
  onClearFilters,
}: FilterSidebarProps) {
  // Only show event titles actually used in the schedule, grouped by stage
  // Misc events are excluded - controlled only by the Misc toggle
  const usedEventsByStage = (events || []).reduce<Record<string, Set<string>>>((acc, e) => {
    if (e.stage === 'Misc' || e.isMisc) return acc;
    if (!acc[e.stage]) acc[e.stage] = new Set();
    acc[e.stage].add(e.title);
    return acc;
  }, {});

  // Only show people actually assigned to event blocks
  const usedPeopleIds = new Set(
    (events || []).flatMap(e => e.assignees?.length ? e.assignees : (e.assignee ? [e.assignee] : []))
  );
  const assignedPeople = people.filter(p => usedPeopleIds.has(p.id));

  const pillClass = (selected: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      selected
        ? 'bg-gray-800 text-white border-gray-800'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
    }`;

  const Toggle = ({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg mb-1.5 hover:bg-gray-200 transition-colors"
    >
      <span className="text-sm text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={`rounded-full relative transition-colors inline-flex items-center ${on ? 'bg-gray-800 justify-end' : 'bg-gray-400 justify-start'}`}
        style={{ height: 20, width: 36, padding: 2 }}
      >
        <span className="bg-white rounded-full shadow-sm" style={{ width: 16, height: 16 }} />
      </span>
    </button>
  );

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-700" />
          <span className="font-semibold text-gray-800 text-sm">Filters</span>
        </div>
        {(selectedCampaigns.size > 0 || selectedPeople.size > 0 || selectedStages.size > 0 || selectedEvents.size > 0) && (
          <button
            onClick={onClearFilters}
            className="text-xs text-gray-500 hover:text-gray-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Campaigns */}
        <div>
          <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">CAMPAIGNS</div>
          <div className="flex flex-col gap-1.5">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => onToggleCampaign(campaign.id)}
                onDoubleClick={() => onEditCampaign && onEditCampaign(campaign)}
                className={`${pillClass(selectedCampaigns.has(campaign.id))} flex items-center gap-2 w-full text-left`}
                title="Double-click to edit"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: campaign.color }}
                />
                <span className="truncate">{campaign.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* People */}
        <div>
          <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">PEOPLE</div>
          <div className="flex flex-wrap gap-1.5">
            {assignedPeople.map((person) => (
              <button
                key={person.id}
                onClick={() => onTogglePerson(person.id)}
                className={pillClass(selectedPeople.has(person.id))}
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stages */}
        <div>
          <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">STAGES</div>
          <div className="flex flex-wrap gap-1.5">
            {getAllStages.map((stage) => (
              <button
                key={stage}
                onClick={() => onToggleStage(stage)}
                className={pillClass(selectedStages.has(stage))}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* Events */}
        <div>
          <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">EVENTS</div>
          <div className="space-y-3">
            {Object.entries(usedEventsByStage).map(([stage, titles]) => (
              <div key={stage}>
                <div className="text-xs text-gray-500 mb-1.5">{stage}</div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(titles).map((title) => (
                    <button
                      key={title}
                      onClick={() => onToggleEvent(title)}
                      className={pillClass(selectedEvents.has(title))}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles and Buttons */}
      <div className="p-4 border-t border-gray-200">
        <Toggle on={showMisc} onClick={onToggleShowMisc} label="Misc." icon={<CircleDot size={15} className="text-gray-500" />} />
        <Toggle on={showEventNotes} onClick={onToggleShowEventNotes} label="Event notes." icon={<StickyNote size={15} className="text-gray-500" />} />
        <Toggle on={showPeople} onClick={onToggleShowPeople} label="People." icon={<Users size={15} className="text-gray-500" />} />
        <Toggle on={showWeekends} onClick={onToggleShowWeekends} label="Hide weekends" icon={<CalendarX size={15} className="text-gray-500" />} />

        <div className="pt-3 space-y-2">
          <button
            onClick={onNewCampaign}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            <span>New Campaign</span>
          </button>
          <button
            onClick={onManageEvents}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Settings size={16} />
            <span>Manage Events</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
