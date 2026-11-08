'use client';

import { format, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor, getTextColor, getSubTextColor } from '@/lib/colorUtils';
import { getBankHolidaysForRange } from '@/lib/ukBankHolidays';

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

const DAY_WIDTH = 60;
const NAME_COL_WIDTH = 140;
const CAMPAIGN_COL_WIDTH = 160;

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
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i));
  const bankHolidays = getBankHolidaysForRange(days[0], days[days.length - 1]);

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);

  const getEventsForPerson = (personId: string) =>
    events.filter(e => {
      const assigneeIds = e.assignees?.length ? e.assignees : (e.assignee ? [e.assignee] : []);
      if (!assigneeIds.includes(personId)) return false;
      if (selectedCampaigns && selectedCampaigns.size > 0 && !selectedCampaigns.has(e.campaignId)) return false;
      return true;
    });

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

  const labelWidth = NAME_COL_WIDTH + CAMPAIGN_COL_WIDTH;

  return (
    <div className="h-full overflow-auto bg-white">
      <div style={{ width: labelWidth + days.length * DAY_WIDTH, minWidth: '100%' }}>
        {/* Sticky Date Header */}
        <div className="sticky top-0 z-20 flex h-14 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0"
            style={{ width: labelWidth }}
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

        {/* Person Rows */}
        {people.map((person) => {
          const personEvents = getEventsForPerson(person.id);
          const personCampaigns = Array.from(new Set(personEvents.map(e => e.campaignId)));

          // Assign lanes to overlapping events so they stack instead of overlap
          const sorted = [...personEvents].sort((a, b) => {
            const aStart = differenceInDays(new Date(a.startDate), startDate);
            const bStart = differenceInDays(new Date(b.startDate), startDate);
            return aStart - bStart;
          });
          const lanes: number[] = [];
          const positioned = sorted.map(e => {
            const s = differenceInDays(new Date(e.startDate), startDate);
            const d = differenceInDays(new Date(e.endDate), new Date(e.startDate)) + 1;
            let lane = lanes.findIndex(end => end < s);
            if (lane === -1) { lane = lanes.length; lanes.push(0); }
            lanes[lane] = s + d - 1;
            return { event: e, lane, startOffset: s, duration: d };
          });
          const laneCount = Math.max(1, ...positioned.map(p => p.lane + 1));
          const rowHeight = 8 + laneCount * 44 + 8;

          return (
            <div key={person.id} className="flex border-b border-gray-200" style={{ height: rowHeight }}>
              {/* Sticky Person Column */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
                style={{ width: NAME_COL_WIDTH }}
              >
                <span className="text-sm font-medium text-gray-800 truncate">
                  {person.name}
                </span>
              </div>

              {/* Sticky Campaign Column */}
              <div
                className="sticky z-10 bg-white border-r border-gray-200 flex items-center px-2 flex-shrink-0"
                style={{ width: CAMPAIGN_COL_WIDTH, left: NAME_COL_WIDTH }}
              >
                <div className="flex flex-col gap-1">
                  {personCampaigns.map((campaignId) => {
                    const campaign = getCampaignById(campaignId);
                    if (!campaign) return null;
                    return (
                      <div key={campaignId} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: campaign.color }}
                        />
                        <span className="text-[10px] text-gray-600 truncate">
                          {campaign.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative">
                {days.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, new Date());
                  const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                  const isBankHoliday = bankHolidays.has(day.toDateString());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`absolute top-0 bottom-0 border-r border-gray-100 ${
                        isWeekend || isPast || isBankHoliday ? 'bg-gray-100' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    />
                  );
                })}

                {/* Event Blocks */}
                {positioned.map(({ event, lane, startOffset, duration }) => {
                  const campaign = getCampaignById(event.campaignId);
                  const eventEnd = new Date(event.endDate);
                  const eventIsPast = eventEnd < new Date(new Date().setHours(0, 0, 0, 0));
                  const eventColor = eventIsPast ? '#D1D5DB' : (campaign ? getStageColor(campaign.color, event.stage) : '#999999');

                  if (startOffset + duration < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={event.id}
                      className="absolute rounded px-2 py-1 text-xs cursor-move hover:opacity-80 overflow-hidden"
                      style={{
                        top: 8 + lane * 44,
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
                      <div
                        className="font-medium truncate text-[10px] leading-tight"
                        style={{ color: event.stage === 'Delivery' ? '#FFFFFF' : getTextColor(eventColor) }}
                      >
                        {event.title}
                      </div>
                      {showEventNotes && event.notes && (
                        <div
                          className="truncate text-[9px] leading-tight"
                          style={{ color: event.stage === 'Delivery' ? 'rgba(255,255,255,0.8)' : getSubTextColor(eventColor) }}
                        >
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
