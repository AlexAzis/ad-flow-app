'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, BarChart3, Users, CalendarDays, Download } from 'lucide-react';
import { Event, Campaign, Person, ViewMode } from '@/lib/types';
import { format, addDays, startOfWeek, differenceInDays, addMonths } from 'date-fns';

interface ScheduleViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
}

export default function ScheduleView({ events, campaigns, people }: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date('2027-01-15'));

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

  const getDateRangeText = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = addMonths(startDate, 5);
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  };

  const dateRange = generateDateRange();

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
