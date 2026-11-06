'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

interface GanttViewProps {
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

export default function GanttView({
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
}: GanttViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i)); // 3 months for Gantt

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForCampaign = (campaignId: string) => {
    return events.filter(event => event.campaignId === campaignId);
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
      {/* Timeline Header */}
      <div className="flex h-10 border-b border-gray-200 bg-gray-50">
        <div className="w-48 flex-shrink-0 border-r border-gray-200"></div>
        <div className="flex-1 flex">
          {days.map((day) => {
            const dayOfWeek = day.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 text-center border-r border-gray-200 flex flex-col items-center justify-center min-w-[30px] ${
                  isWeekend && showWeekends ? 'bg-gray-200' : ''
                } ${isToday ? 'bg-blue-100' : ''}`}
              >
                <span className="text-[10px] text-gray-600">{format(day, 'd')}</span>
                <span className="text-[9px] text-gray-500">{format(day, 'MMM')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Rows */}
      <div className="flex-1 overflow-y-auto">
        {campaigns.map((campaign) => {
          const campaignEvents = getEventsForCampaign(campaign.id);

          return (
            <div key={campaign.id} className="flex border-b border-gray-200 h-16">
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

              {/* Timeline */}
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

                {/* Event Blocks */}
                {campaignEvents.map((event) => {
                  const eventStart = new Date(event.startDate);
                  const eventEnd = new Date(event.endDate);
                  const startOffset = differenceInDays(eventStart, startDate);
                  const duration = differenceInDays(eventEnd, eventStart) + 1;
                  const person = event.assignee ? getPersonById(event.assignee) : null;
                  const eventColor = getStageColor(campaign.color, event.stage);

                  if (startOffset < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={event.id}
                      className="absolute top-2 bottom-2 rounded px-2 py-1 text-xs cursor-move hover:opacity-80 overflow-hidden"
                      style={{
                        left: `${(startOffset / days.length) * 100}%`,
                        width: `${(duration / days.length) * 100}%`,
                        backgroundColor: eventColor,
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      <div className="font-medium text-gray-800 truncate text-[10px]">
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
