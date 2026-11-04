'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, BarChart3, Users, CalendarDays, Download } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addDays, startOfWeek, differenceInDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface ScheduleViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
}

export default function ScheduleView({ events, campaigns, people }: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date('2026-10-01'));

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const navigateDate = (direction: 'prev' | 'next') => {
    const months = 1;
    setCurrentDate(prev => addMonths(prev, direction === 'next' ? months : -months));
  };

  const generateCalendarMonths = () => {
    const months = [];
    const startDate = startOfMonth(currentDate);
    for (let i = 0; i < 6; i++) {
      months.push(addMonths(startDate, i));
    }
    return months;
  };

  const getDateRangeText = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = addMonths(startDate, 5);
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  };

  const months = generateCalendarMonths();

  const viewModes: { value: ViewMode; label: string; icon: any }[] = [
    { value: 'daily', label: 'Daily 6', icon: Calendar },
    { value: '6-col', label: 'Daily 12', icon: LayoutGrid },
    { value: '12-col', label: 'Vertical', icon: LayoutGrid },
    { value: 'vertical', label: 'Gantt', icon: List },
    { value: 'gantt', label: 'Topline', icon: BarChart3 },
    { value: 'topline', label: 'People', icon: CalendarDays },
    { value: 'people', label: '', icon: Users },
  ];

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
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              if (!mode.label) return null;
              return (
                <button
                  key={mode.value}
                  onClick={() => setViewMode(mode.value)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    viewMode === mode.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Header */}
        <div className="flex border-l border-gray-200">
          <div className="w-24 flex-shrink-0 border-r border-gray-200 bg-gray-50"></div>
          <div className="flex-1 flex">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div
                key={day}
                className="flex-1 text-center border-r border-gray-200 bg-gray-50 py-2"
              >
                <span className="text-xs font-medium text-gray-600">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto bg-white">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

          return (
            <div key={month.toISOString()} className="border-b border-gray-200">
              {/* Month Header */}
              <div className="flex h-10 border-l border-gray-200 bg-gray-50">
                <div className="w-24 flex-shrink-0 px-3 py-2 border-r border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    {format(month, 'MMM yyyy')}
                  </span>
                </div>
                <div className="flex-1 flex">
                  {daysInMonth.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="flex-1 border-r border-gray-200 flex items-center justify-center"
                    >
                      <span className={`text-sm ${isSameDay(day, new Date()) ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events Grid */}
              {events.map((event) => {
                const eventStart = new Date(event.startDate);
                const eventEnd = new Date(event.endDate);
                const monthStart = startOfMonth(month);
                const monthEnd = endOfMonth(month);

                // Check if event overlaps with this month
                if (eventEnd < monthStart || eventStart > monthEnd) return null;

                const person = event.assignee ? getPersonById(event.assignee) : null;
                const campaign = getCampaignById(event.campaignId);

                return (
                  <div key={event.id} className="flex h-12 border-l border-gray-200">
                    <div className="w-24 flex-shrink-0 border-r border-gray-200"></div>
                    <div className="flex-1 flex relative">
                      {daysInMonth.map((day) => {
                        const isEventDay = day >= eventStart && day <= eventEnd;
                        const isStart = isSameDay(day, eventStart);
                        const isEnd = isSameDay(day, eventEnd);

                        return (
                          <div
                            key={day.toISOString()}
                            className="flex-1 border-r border-gray-200 relative"
                          >
                            {isEventDay && (
                              <div
                                className="absolute top-1 bottom-1 left-0.5 right-0.5 rounded px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90"
                                style={{
                                  backgroundColor: event.color,
                                  marginLeft: isStart ? '0' : '-4px',
                                  marginRight: isEnd ? '0' : '-4px',
                                }}
                              >
                                <div className="text-xs font-medium text-white truncate">
                                  {isStart && event.title}
                                </div>
                                {person && isStart && (
                                  <div className="text-xs text-white/80 truncate">
                                    {person.name}
                                  </div>
                                )}
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
          );
        })}
      </div>
    </div>
  );
}
