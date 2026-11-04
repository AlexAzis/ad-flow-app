'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, BarChart3, Users, CalendarDays } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addDays, startOfWeek, differenceInDays } from 'date-fns';

interface ScheduleViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
}

export default function ScheduleView({ events, campaigns, people }: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'daily' ? 1 : 7;
    setCurrentDate(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  const generateDateRange = () => {
    const days = viewMode === 'daily' ? 1 : 14;
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: days }, (_, i) => addDays(startDate, i));
  };

  const dateRange = generateDateRange();

  const viewModes: { value: ViewMode; label: string; icon: any }[] = [
    { value: 'daily', label: 'Daily', icon: Calendar },
    { value: '6-col', label: '6-Column', icon: LayoutGrid },
    { value: '12-col', label: '12-Column', icon: LayoutGrid },
    { value: 'vertical', label: 'Vertical', icon: List },
    { value: 'gantt', label: 'Gantt', icon: BarChart3 },
    { value: 'topline', label: 'Topline', icon: CalendarDays },
    { value: 'people', label: 'People', icon: Users },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-800">Schedule</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <span className="text-lg font-medium text-gray-800">
                {format(currentDate, 'MMMM yyyy')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
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

        {/* Timeline Header */}
        <div className="flex border-l border-gray-200">
          <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-gray-200 bg-gray-50">
            <span className="text-sm font-medium text-gray-600">Campaign / Event</span>
          </div>
          <div className="flex-1 flex">
            {dateRange.map((date, index) => (
              <div
                key={date.toISOString()}
                className={`flex-1 text-center border-r border-gray-200 ${
                  index === 0 ? 'border-l' : ''
                }`}
              >
                <div className="text-xs text-gray-500 py-1">
                  {format(date, 'EEE')}
                </div>
                <div className="text-sm font-medium text-gray-800 py-1">
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-y-auto bg-white">
        {campaigns.map((campaign) => {
          const campaignEvents = events.filter(e => e.campaignId === campaign.id);
          if (campaignEvents.length === 0) return null;

          return (
            <div key={campaign.id} className="border-b border-gray-200">
              {/* Campaign Header */}
              <div className="flex items-center h-12 border-l border-gray-200">
                <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-gray-200 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: campaign.color }}
                  />
                  <span className="font-medium text-gray-800">{campaign.name}</span>
                </div>
                <div className="flex-1 flex">
                  {dateRange.map((date) => (
                    <div
                      key={date.toISOString()}
                      className="flex-1 border-r border-gray-200 bg-gray-50"
                    />
                  ))}
                </div>
              </div>

              {/* Events */}
              {campaignEvents.map((event) => {
                const startOffset = differenceInDays(event.startDate, dateRange[0]);
                const duration = differenceInDays(event.endDate, event.startDate) + 1;
                const person = event.assignee ? getPersonById(event.assignee) : null;

                return (
                  <div key={event.id} className="flex items-center h-16 border-l border-gray-200">
                    <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-gray-200">
                      <div className="text-sm font-medium text-gray-800">{event.title}</div>
                      <div className="text-xs text-gray-500">{event.stage}</div>
                    </div>
                    <div className="flex-1 flex relative">
                      {dateRange.map((date) => (
                        <div
                          key={date.toISOString()}
                          className="flex-1 border-r border-gray-200"
                        />
                      ))}
                      {startOffset >= 0 && startOffset < dateRange.length && (
                        <div
                          className="absolute h-10 top-3 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            left: `${(startOffset / dateRange.length) * 100}%`,
                            width: `${(duration / dateRange.length) * 100}%`,
                            backgroundColor: event.color,
                          }}
                        >
                          <span className="text-sm font-medium text-white truncate">
                            {event.title}
                          </span>
                          {person && (
                            <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-medium text-white">
                              {person.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                        </div>
                      )}
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
