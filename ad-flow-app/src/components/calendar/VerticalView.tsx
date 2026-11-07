'use client';

import { useState } from 'react';
import { format, addDays, subDays, isSameDay, isBefore, startOfDay } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

interface VerticalViewProps {
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

export default function VerticalView({
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
}: VerticalViewProps) {
  const [scrollDate, setScrollDate] = useState(currentDate);
  const minDate = subDays(new Date(), 7); // Can only scroll back 7 days

  const days = Array.from({ length: 60 }, (_, i) => addDays(scrollDate, i)); // Show 60 days

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForCampaignAndDate = (campaignId: string, date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return event.campaignId === campaignId && date >= eventStart && date <= eventEnd;
    });
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
      {/* Header Row */}
      <div className="flex h-12 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="w-24 flex-shrink-0 border-r border-gray-200"></div>
        {campaigns
          .filter(campaign => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(campaign.id))
          .map((campaign) => (
          <div
            key={campaign.id}
            className="flex-1 border-r border-gray-200 flex items-center justify-center px-2 min-w-[200px]"
          >
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
        ))}
      </div>

      {/* Date Rows */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {days.map((day) => {
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = isSameDay(day, new Date());
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

          return (
            <div
              key={day.toISOString()}
              className={`flex border-b border-gray-200 h-12 ${
                isWeekend && showWeekends ? 'bg-gray-100' : ''
              } ${isPast ? 'opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Date Column */}
              <div className="w-24 flex-shrink-0 border-r border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <span
                    className={`text-sm font-bold ${
                      isToday
                        ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="text-[10px] text-gray-500">{format(day, 'MMM')}</span>
                </div>
              </div>

              {/* Campaign Columns */}
              {campaigns
                .filter(campaign => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(campaign.id))
                .map((campaign) => {
                const dayEvents = getEventsForCampaignAndDate(campaign.id, day);

                return (
                  <div
                    key={campaign.id}
                    className="flex-1 border-r border-gray-200 flex items-center px-1 min-w-[200px] gap-1 overflow-x-auto"
                  >
                    {dayEvents.map((event) => {
                      const person = event.assignee ? getPersonById(event.assignee) : null;
                      const eventColor = getStageColor(campaign.color, event.stage);

                      return (
                        <div
                          key={event.id}
                          className="rounded px-2 py-1 text-xs h-8 flex items-center cursor-move hover:opacity-80 flex-shrink-0"
                          style={{ backgroundColor: eventColor }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onEventDoubleClick) onEventDoubleClick(event);
                          }}
                        >
                          <div className="font-medium text-gray-800 truncate leading-tight">
                            {event.title}
                          </div>
                          {showPeople && person && (
                            <div className="text-gray-600 truncate text-[9px] leading-tight">
                              {person.name}
                            </div>
                          )}
                          {showEventNotes && event.notes && (
                            <div className="text-gray-500 truncate text-[8px] leading-tight">
                              {event.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
