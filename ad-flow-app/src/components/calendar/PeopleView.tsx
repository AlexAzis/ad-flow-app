'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

interface PeopleViewProps {
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

export default function PeopleView({
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
}: PeopleViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i)); // 3 months

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  // Get events for a person (filtered by selected campaigns)
  const getEventsForPerson = (personId: string) => {
    return events.filter(event => {
      if (event.assignee !== personId) return false;
      if (selectedCampaigns && selectedCampaigns.size > 0 && !selectedCampaigns.has(event.campaignId)) {
        return false;
      }
      return true;
    });
  };

  // Group events by campaign for a person
  const getCampaignEventsForPerson = (personId: string, campaignId: string) => {
    return events.filter(e => e.assignee === personId && e.campaignId === campaignId);
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
      {/* Timeline Header */}
      <div className="flex h-10 border-b border-gray-200 bg-gray-50">
        <div className="w-48 flex-shrink-0 border-r border-gray-200"></div>
        <div className="w-32 flex-shrink-0 border-r border-gray-200"></div>
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

      {/* Person Rows */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {people.map((person) => {
          const personEvents = getEventsForPerson(person.id);
          const personCampaigns = Array.from(new Set(personEvents.map(e => e.campaignId)));

          return (
            <div key={person.id} className="flex border-b border-gray-200 h-20">
              {/* Person Column */}
              <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white flex items-center px-3">
                <span className="text-sm font-medium text-gray-800">
                  {person.name}
                </span>
              </div>

              {/* Campaign Column */}
              <div className="w-32 flex-shrink-0 border-r border-gray-200 bg-white flex items-center px-2">
                {personCampaigns.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {personCampaigns.map((campaignId) => {
                      const campaign = getCampaignById(campaignId);
                      if (!campaign) return null;
                      return (
                        <div
                          key={campaignId}
                          className="flex items-center gap-1"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: campaign.color }}
                          />
                          <span className="text-[10px] text-gray-600 truncate">
                            {campaign.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No events</span>
                )}
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
                {personEvents.map((event) => {
                  const campaign = getCampaignById(event.campaignId);
                  const eventStart = new Date(event.startDate);
                  const eventEnd = new Date(event.endDate);
                  const startOffset = differenceInDays(eventStart, startDate);
                  const duration = differenceInDays(eventEnd, eventStart) + 1;
                  const eventColor = campaign ? getStageColor(campaign.color, event.stage) : '#999999';

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
                      {showEventNotes && event.notes && (
                        <div className="text-gray-600 truncate text-[8px]">
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
