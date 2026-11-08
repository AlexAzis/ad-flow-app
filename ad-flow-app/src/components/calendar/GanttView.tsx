'use client';

import { format, addDays, startOfWeek, isSameDay, isSameMonth, differenceInDays } from 'date-fns';
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
  selectedCampaigns?: Set<string>;
}

const DAY_WIDTH = 60;
const LABEL_COL_WIDTH = 200;

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
  selectedCampaigns,
}: GanttViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i));

  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForCampaign = (campaignId: string) =>
    events.filter(e => e.campaignId === campaignId);

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
    if (eventId && onEventDrop) onEventDrop(eventId, date);
  };

  const visibleCampaigns = campaigns.filter(
    c => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
  );

  return (
    <div className="h-full overflow-auto bg-white">
      <div style={{ width: LABEL_COL_WIDTH + days.length * DAY_WIDTH, minWidth: '100%' }}>
        {/* Sticky Date Header */}
        <div className="sticky top-0 z-20 flex h-14 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0"
            style={{ width: LABEL_COL_WIDTH }}
          />
          <div className="flex">
            {days.map((day) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = isSameDay(day, new Date());
              const showMonth = day.getDate() === 1 || isSameDay(day, days[0]);
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center ${
                    isWeekend && showWeekends ? 'bg-gray-100' : 'bg-white'
                  }`}
                  style={{ width: DAY_WIDTH }}
                >
                  {showMonth && (
                    <span className="text-[9px] font-semibold text-gray-500 uppercase">
                      {format(day, 'MMM')}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Rows */}
        {visibleCampaigns.map((campaign) => {
          const campaignEvents = getEventsForCampaign(campaign.id);
          return (
            <div key={campaign.id} className="flex border-b border-gray-200" style={{ height: 64 }}>
              {/* Sticky Campaign Column */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
                style={{ width: LABEL_COL_WIDTH }}
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

              {/* Timeline */}
              <div className="flex-1 relative">
                {days.map((day) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`absolute top-0 bottom-0 border-r border-gray-100 ${
                        isWeekend && showWeekends ? 'bg-gray-100' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ left: days.indexOf(day) * DAY_WIDTH, width: DAY_WIDTH }}
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

                  if (startOffset + duration < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={event.id}
                      className="absolute rounded px-2 py-1 text-xs cursor-move hover:opacity-80 overflow-hidden"
                      style={{
                        top: 12,
                        left: startOffset * DAY_WIDTH + 1,
                        width: duration * DAY_WIDTH - 3,
                        height: 40,
                        backgroundColor: eventColor,
                      }}
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
                      {(showPeople || showEventNotes) && (
                        <div className="text-gray-600 truncate text-[9px] leading-tight">
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
    </div>
  );
}
