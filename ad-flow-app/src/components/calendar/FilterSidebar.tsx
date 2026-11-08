'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Settings } from 'lucide-react';
import { Campaign, Person } from '@/lib/types';
import { eventTypes, getAllStages } from '@/lib/eventTypes';

interface FilterSidebarProps {
  campaigns: Campaign[];
  people: Person[];
  events?: { title: string; stage: string }[];
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
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['campaigns', 'people', 'stages', 'events']);

  // Only show event titles actually used in the schedule, grouped by stage
  const usedEventsByStage = (events || []).reduce<Record<string, Set<string>>>((acc, e) => {
    if (!acc[e.stage]) acc[e.stage] = new Set();
    acc[e.stage].add(e.title);
    return acc;
  }, {});

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search filters..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Campaigns */}
        <div>
          <button
            onClick={() => toggleSection('campaigns')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('campaigns') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700 text-sm">CAMPAIGNS</span>
            </div>
          </button>
          {expandedSections.includes('campaigns') && (
            <div className="ml-4 space-y-2">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between">
                  <button
                    onClick={() => onToggleCampaign(campaign.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex-1 ${
                      selectedCampaigns.has(campaign.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {campaign.name}
                  </button>
                  {onEditCampaign && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCampaign(campaign);
                      }}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500 ml-2"
                      title="Edit campaign"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* People */}
        <div>
          <button
            onClick={() => toggleSection('people')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('people') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700 text-sm">PEOPLE</span>
            </div>
          </button>
          {expandedSections.includes('people') && (
            <div className="ml-4 flex flex-wrap gap-2">
              {people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => onTogglePerson(person.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedPeople.has(person.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {person.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stages */}
        <div>
          <button
            onClick={() => toggleSection('stages')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('stages') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700 text-sm">STAGES</span>
            </div>
          </button>
          {expandedSections.includes('stages') && (
            <div className="ml-4 flex flex-wrap gap-2">
              {getAllStages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => onToggleStage(stage)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedStages.has(stage)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Events */}
        <div>
          <button
            onClick={() => toggleSection('events')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('events') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700 text-sm">EVENTS</span>
            </div>
          </button>
          {expandedSections.includes('events') && (
            <div className="ml-4 space-y-2">
              {Object.entries(usedEventsByStage).map(([stage, titles]) => (
                <div key={stage}>
                  <div className="text-xs font-medium text-gray-500 mb-1">{stage}</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(titles).map((title) => (
                      <button
                        key={title}
                        onClick={() => onToggleEvent(title)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          selectedEvents.has(title)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toggles and Buttons */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Misc.</span>
          <button
            onClick={onToggleShowMisc}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              showMisc ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                showMisc ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Event notes.</span>
          <button
            onClick={onToggleShowEventNotes}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              showEventNotes ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                showEventNotes ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">People.</span>
          <button
            onClick={onToggleShowPeople}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              showPeople ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                showPeople ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Hide weekends</span>
          <button
            onClick={onToggleShowWeekends}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              showWeekends ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                showWeekends ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="pt-3 space-y-2">
          <button
            onClick={onNewCampaign}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
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
