'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

interface ToplineViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventDoubleClick?: (event: Event) => void;
  onEventDrop?: (eventId: string, newDate: Date) => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  selectedCampaigns?: Set<string>;
}

export default function ToplineView({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  onEventDrop,
  showWeekends,
  showEventNotes,
  showPeople,
  selectedCampaigns,
}: ToplineViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i)); // 3 months

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  // Group events by campaign and stage
  const getStageBlocks = (campaignId: string) => {
    const campaignEvents = events.filter(e => e.campaignId === campaignId);
    const stageGroups: Record<string, Event[]> = {};

    campaignEvents.forEach(event => {
      if (!stageGroups[event.stage]) {
        stageGroups[event.stage] = [];
      }
      stageGroups[event.stage].push(event);
    });

    return stageGroups;
  };

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    const eventId = e.dataTransfer.getData('eventId');
    if (eventId && onEventDrop) {
      onEventDrop(eventId, date);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Campaign Rows with Stage Blocks */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {campaigns.map((campaign) => {
          // Only show if no campaigns selected or if this campaign is selected
          if (selectedCampaigns && selectedCampaigns.size > 0 && !selectedCampaigns.has(campaign.id)) {
            return null;
          }

          const stageBlocks = getStageBlocks(campaign.id);

          return (
            <div key={campaign.id} className="flex border-b border-gray-200 h-20">
              {/* Campaign Column */}
              <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white flex items-center px-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: campaign.color }}
                  />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {campaign.name}
                  </span>
                </div>
              </div>

              {/* Timeline with Stage Blocks */}
              <div className="flex-1 flex relative">
                {days.map((day) => {
                  const dayOfWeek = day.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 border-r border-gray-100 min-w-[30px] relative ${
                        isWeekend && showWeekends ? 'bg-gray-100' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    />
                  );
                })}

                {/* Stage Blocks */}
                {Object.entries(stageBlocks).map(([stage, stageEvents]) => {
                  const earliestStart = Math.min(...stageEvents.map(e => new Date(e.startDate).getTime()));
                  const latestEnd = Math.max(...stageEvents.map(e => new Date(e.endDate).getTime()));
                  const startOffset = differenceInDays(new Date(earliestStart), startDate);
                  const duration = differenceInDays(new Date(latestEnd), new Date(earliestStart)) + 1;
                  const stageColor = getStageColor(campaign.color, stage);

                  if (startOffset < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={stage}
                      className="absolute top-2 h-10 rounded px-3 py-2 text-xs cursor-move hover:opacity-80 overflow-hidden"
                      style={{
                        left: `${(startOffset / days.length) * 100}%`,
                        width: `${(duration / days.length) * 100}%`,
                        backgroundColor: stageColor,
                      }}
                    >
                      <div className="font-medium text-gray-800 truncate text-[10px]">
                        {stage}
                      </div>
                      <div className="text-gray-600 truncate text-[9px]">
                        {stageEvents.length} event{stageEvents.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
