'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, differenceInDays, isSameDay, isSameMonth } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';

interface CalendarGridProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
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
  showWeekends,
  showEventNotes,
  showPeople,
}: CalendarGridProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i)); // 6 weeks

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

  return (
    <div className="flex flex-col">
      {/* Month Header */}
      <div className="flex h-10 border-b border-gray-200">
        <div className="w-32 flex-shrink-0"></div>
        <div className="flex-1 flex">
          {days.slice(0, 7).map((day, index) => (
            <div
              key={day.toISOString()}
              className="flex-1 text-center border-r border-gray-200 bg-gray-50 flex items-center justify-center"
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
        {Array.from({ length: 6 }).map((_, weekIndex) => (
          <div key={weekIndex} className="flex border-b border-gray-200">
            {/* Month Column */}
            {weekIndex === 0 && (
              <div className="w-32 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {currentMonth}
                </span>
              </div>
            )}
            {weekIndex > 0 && (
              <div className="w-32 flex-shrink-0 border-r border-gray-200"></div>
            )}

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
                  className={`flex-1 border-r border-gray-200 min-h-[120px] relative cursor-pointer hover:bg-gray-50 ${
                    isWeekend && showWeekends ? 'bg-gray-100' : ''
                  } ${isPastMonth ? 'opacity-50' : ''}`}
                  onClick={() => onDateClick(day)}
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

                      return (
                        <div
                          key={event.id}
                          className="rounded px-2 py-1 text-xs"
                          style={{ backgroundColor: event.color }}
                        >
                          {isEventStart && (
                            <>
                              <div className="font-medium text-white truncate">
                                {event.title}
                              </div>
                              {showPeople && person && (
                                <div className="text-white/80 truncate">
                                  {person.name}
                                </div>
                              )}
                              {showEventNotes && event.notes && (
                                <div className="text-white/70 truncate text-[10px]">
                                  {event.notes}
                                </div>
                              )}
                            </>
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
