'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, differenceInDays, isSameDay, isSameMonth } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

interface CalendarGridProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventDoubleClick?: (event: Event) => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
}

export default function CalendarGrid({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  showWeekends,
  showEventNotes,
  showPeople,
}: CalendarGridProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 180 }, (_, i) => addDays(startDate, i)); // 6 months (~180 days)

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return date >= eventStart && date <= eventEnd;
    });
  };

  const months = [...new Set(days.map(day => format(day, 'MMMM yyyy')))];
  const currentMonth = format(currentDate, 'MMMM yyyy');
  const weeks = Math.ceil(days.length / 7);

  return (
    <div className="flex flex-col min-w-[800px]">
      {/* Month Header */}
      <div className="flex h-10 border-b border-gray-200">
        <div className="w-32 flex-shrink-0"></div>
        <div className="flex-1 flex">
          {days.slice(0, 7).map((day, index) => (
            <div
              key={day.toISOString()}
              className="w-[120px] text-center border-r border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0"
            >
              <span className="text-sm font-medium text-gray-700">
                {format(day, 'EEE')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1">
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <div key={weekIndex} className="flex border-b border-gray-200">
            {/* Month Column */}
            {(() => {
              const weekStartDate = days[weekIndex * 7];
              const weekMonth = format(weekStartDate, 'MMMM yyyy');
              const prevWeekMonth = weekIndex > 0 ? format(days[(weekIndex - 1) * 7], 'MMMM yyyy') : '';
              const showMonth = weekMonth !== prevWeekMonth;
              return (
                <div className="w-32 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                  {showMonth && (
                    <span className="text-sm font-medium text-gray-700">
                      {weekMonth}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Days */}
            {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day) => {
              const dayOfWeek = day.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isToday = isSameDay(day, new Date());
              const isPastMonth = !isSameMonth(day, currentDate);
              const dayEvents = getEventsForDate(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`w-[120px] border-r border-gray-200 h-[140px] relative cursor-pointer hover:bg-gray-50 overflow-hidden flex-shrink-0 ${
                    isWeekend && showWeekends ? 'bg-gray-100' : ''
                  } ${isPastMonth ? 'opacity-50' : ''}`}
                  onDoubleClick={() => onDateClick(day)}
                >
                  {/* Date Number */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`text-sm ${
                        isToday
                          ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold'
                          : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="mt-8 px-1 space-y-1">
                    {dayEvents.map((event) => {
                      const campaign = getCampaignById(event.campaignId);
                      const person = event.assignee ? getPersonById(event.assignee) : null;
                      const isEventStart = isSameDay(day, new Date(event.startDate));
                      const eventColor = campaign ? getStageColor(campaign.color, event.stage) : event.color;

                      return (
                        <div
                          key={event.id}
                          className="rounded px-2 py-1.5 text-xs h-8 cursor-pointer hover:opacity-80 overflow-hidden"
                          style={{ backgroundColor: eventColor }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onEventDoubleClick) onEventDoubleClick(event);
                          }}
                        >
                          <div className="font-medium text-gray-800 truncate">
                            {event.title}
                          </div>
                          {(showPeople || showEventNotes) && (
                            <div className="text-gray-600 truncate text-[9px] mt-0.5">
                              {showPeople && person && <span>{person.name}</span>}
                              {showPeople && person && showEventNotes && event.notes && <span className="mx-1">·</span>}
                              {showEventNotes && event.notes && <span>{event.notes}</span>}
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
        ))}
      </div>
    </div>
  );
}
