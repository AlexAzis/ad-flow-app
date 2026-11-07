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
}: VerticalViewProps) {
  const [scrollDate, setScrollDate] = useState(currentDate);
  const minDate = subDays(new Date(), 7); // Can only scroll back 7 days

  const days = Array.from({ length: 60 }, (_, i) => addDays(scrollDate, i)); // Show 60 days

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return date >= eventStart && date <= eventEnd;
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex h-10 border-b border-gray-200 bg-gray-50">
        <div className="w-32 flex-shrink-0 border-r border-gray-200"></div>
        <div className="flex-1 flex items-center px-4">
          <span className="text-sm font-medium text-gray-700">Campaign</span>
        </div>
        <div className="w-40 flex-shrink-0 border-l border-gray-200 flex items-center px-4">
          <span className="text-sm font-medium text-gray-700">Events</span>
        </div>
      </div>

      {/* Day Rows */}
      <div className="flex-1 overflow-y-auto">
        {days.map((day) => {
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = isSameDay(day, new Date());
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
          const dayEvents = getEventsForDate(day);

          return (
            <div
              key={day.toISOString()}
              className={`flex border-b border-gray-200 h-20 ${
                isWeekend && showWeekends ? 'bg-gray-100' : ''
              } ${isPast ? 'opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Date Column */}
              <div className="w-32 flex-shrink-0 border-r border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <span
                    className={`text-lg font-bold ${
                      isToday
                        ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs text-gray-500">{format(day, 'MMM')}</span>
                </div>
              </div>

              {/* Campaign Column */}
              <div className="flex-1 border-r border-gray-200 flex items-center px-4 overflow-x-auto">
                {dayEvents.length > 0 ? (
                  <div className="flex gap-2">
                    {Array.from(new Set(dayEvents.map(e => e.campaignId))).map((campaignId) => {
                      const campaign = getCampaignById(campaignId);
                      if (!campaign) return null;
                      return (
                        <div
                          key={campaignId}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: campaign.color }}
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {campaign.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">No events</span>
                )}
              </div>

              {/* Events Column */}
              <div className="w-40 flex-shrink-0 flex flex-col gap-1 p-2 overflow-y-auto">
                {dayEvents.map((event) => {
                  const campaign = getCampaignById(event.campaignId);
                  const person = event.assignee ? getPersonById(event.assignee) : null;
                  const eventColor = campaign ? getStageColor(campaign.color, event.stage) : '#999999';

                  return (
                    <div
                      key={event.id}
                      className="rounded px-2 py-1 text-xs cursor-move hover:opacity-80"
                      style={{ backgroundColor: eventColor }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      <div className="font-medium text-gray-800 truncate">
                        {event.title}
                      </div>
                      {showPeople && person && (
                        <div className="text-gray-600 truncate text-[9px]">
                          {person.name}
                        </div>
                      )}
                      {showEventNotes && event.notes && (
                        <div className="text-gray-500 truncate text-[8px]">
                          {event.notes}
                        </div>
                      )}
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
