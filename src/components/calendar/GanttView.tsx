'use client';

import { useLayoutEffect, useRef } from 'react';
import { format, addDays, isSameDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor, getTextColor, getSubTextColor } from '@/lib/colorUtils';
import { getBankHolidaysForRange } from '@/lib/ukBankHolidays';
import { anchorDay, exportEndIndex, LOOKBACK_DAYS } from '@/lib/visibleRange';
import {
  getEventDragData,
  getEventDragDetails,
  setEventDragData,
  type EventSelectionAction,
} from '@/lib/eventDrag';

interface GanttViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventDoubleClick?: (event: Event) => void;
  selectedEventIds?: Set<string>;
  onEventSelect?: (eventId: string, action: EventSelectionAction) => void;
  onEventsDrop?: (draggedEventId: string, eventIds: string[], newDate: Date) => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  selectedCampaigns?: Set<string>;
}

const DAY_WIDTH = 60;

export default function GanttView({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  selectedEventIds,
  onEventSelect,
  onEventsDrop,
  showWeekends,
  showEventNotes,
  showPeople,
  selectedCampaigns,
}: GanttViewProps) {
  // Two weeks of history render before the anchor so they can be scrolled back
  // to, but nothing earlier is ever shown
  const anchor = anchorDay(currentDate);
  const rangeStart = addDays(anchor, -LOOKBACK_DAYS);

  // The range runs to the end of the week after the last filtered event block,
  // so scrolling right always reaches just past the final block
  const exportStartIdx = LOOKBACK_DAYS;
  const exportEndIdx = exportEndIndex(events, anchor, rangeStart, 'day');
  const days = Array.from({ length: exportEndIdx >= 0 ? exportEndIdx + 1 : 90 + LOOKBACK_DAYS }, (_, i) => addDays(rangeStart, i));
  const bankHolidays = getBankHolidaysForRange(days[0], days[days.length - 1]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const anchorKey = anchor.getTime();
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const start = scroller?.querySelector<HTMLElement>('[data-export-start]');
    const first = scroller?.querySelector<HTMLElement>('[data-export-cell]');
    if (scroller && start && first) {
      scroller.scrollLeft = start.getBoundingClientRect().left - first.getBoundingClientRect().left;
    }
  }, [anchorKey]);

  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForCampaign = (campaignId: string) =>
    events.filter(e => e.campaignId === campaignId);

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    const details = getEventDragDetails(event.id, events, selectedEventIds, e.shiftKey);
    if (details.selectionAction && onEventSelect) {
      onEventSelect(event.id, details.selectionAction);
    }
    setEventDragData(e.dataTransfer, details);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = getEventDragData(e.dataTransfer);
    if (payload && onEventsDrop) {
      onEventsDrop(payload.draggedEventId, payload.eventIds, date);
    }
  };

  const visibleCampaigns = campaigns.filter(
    c => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
  );

  // Auto-size label column to fit the longest campaign name
  const labelWidth = Math.max(200, ...visibleCampaigns.map(c => c.name.length * 7.5 + 40), 220);

  return (
    <div className="h-full overflow-auto bg-white" ref={scrollerRef}>
      <div style={{ width: labelWidth + days.length * DAY_WIDTH, minWidth: '100%' }}>
        {/* Sticky Date Header */}
        <div className="sticky top-0 z-20 flex h-14 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0"
            style={{ width: labelWidth }}
          />
          <div className="flex">
            {days.map((day, index) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = isSameDay(day, new Date());
              const showMonth = true;
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center ${
                    isWeekend ? 'bg-[#F6F7F9]' : 'bg-white'
                  }`}
                  style={{ width: DAY_WIDTH }}
                  data-export-cell
                  data-export-start={index === exportStartIdx ? true : undefined}
                  data-export-end={index === exportEndIdx ? true : undefined}
                >
                  {showMonth && (
                    <span className="text-[9px] font-semibold text-gray-500 uppercase leading-none mb-0.5">
                      {format(day, 'MMM')}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="text-[9px] text-gray-500 leading-none mt-0.5">{format(day, 'EEE')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Misc Row */}
        {(() => {
          const miscEvents = events.filter(e => e.isMisc);
          if (miscEvents.length === 0) return null;

          // Stack overlapping misc events in lanes and size the row to fit them
          const lanes: number[] = [];
          const miscPositioned = [...miscEvents]
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map(event => {
              const startOffset = differenceInDays(new Date(event.startDate), rangeStart);
              const duration = differenceInDays(new Date(event.endDate), new Date(event.startDate)) + 1;
              let lane = lanes.findIndex(end => end < startOffset);
              if (lane === -1) { lane = lanes.length; lanes.push(0); }
              lanes[lane] = startOffset + duration - 1;
              return { event, lane, startOffset, duration };
            });
          const miscRowHeight = 8 + Math.max(1, lanes.length) * 44 + 8;

          return (
            <div className="flex border-b border-gray-200" style={{ height: miscRowHeight }}>
              <div
                className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
                style={{ width: labelWidth }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300" />
                  <span className="text-sm font-medium text-gray-800">Misc.</span>
                </div>
              </div>
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
                        isPast ? 'bg-gray-100' : isWeekend || isBankHoliday ? 'bg-[#F6F7F9]' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                    />
                  );
                })}
                {miscPositioned.map(({ event, lane, startOffset, duration }) => {
                  if (startOffset + duration < 0 || startOffset >= days.length) return null;
                  return (
                    <div
                      key={event.id}
                      className="absolute rounded px-2 text-xs overflow-hidden bg-gray-200 flex flex-col justify-center"
                      style={{
                        top: 8 + lane * 44,
                        left: startOffset * DAY_WIDTH + 1,
                        width: duration * DAY_WIDTH - 3,
                        height: 40,
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      <div className="font-medium text-gray-600 truncate leading-tight">
                        {event.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Campaign Rows */}
        {visibleCampaigns.map((campaign) => {
          const campaignEvents = getEventsForCampaign(campaign.id);

          // Assign lanes to overlapping events so they stack instead of overlap
          const sorted = [...campaignEvents].sort((a, b) => {
            const aStart = differenceInDays(new Date(a.startDate), rangeStart);
            const bStart = differenceInDays(new Date(b.startDate), rangeStart);
            return aStart - bStart;
          });
          const lanes: number[] = [];
          const positioned = sorted.map(e => {
            const s = differenceInDays(new Date(e.startDate), rangeStart);
            const d = differenceInDays(new Date(e.endDate), new Date(e.startDate)) + 1;
            let lane = lanes.findIndex(end => end < s);
            if (lane === -1) { lane = lanes.length; lanes.push(0); }
            lanes[lane] = s + d - 1;
            return { event: e, lane, startOffset: s, duration: d };
          });
          const laneCount = Math.max(1, ...positioned.map(p => p.lane + 1));
          const rowHeight = 8 + laneCount * 44 + 8;

          return (
            <div key={campaign.id} className="flex border-b border-gray-200" style={{ height: rowHeight }}>
              {/* Sticky Campaign Column */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
                style={{ width: labelWidth }}
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
                {days.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, new Date());
                  const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                  const isBankHoliday = bankHolidays.has(day.toDateString());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`absolute top-0 bottom-0 border-r border-gray-100 ${
                        isPast ? 'bg-gray-100' : isWeekend || isBankHoliday ? 'bg-[#F6F7F9]' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    />
                  );
                })}

                {/* Event Blocks */}
                {positioned.map(({ event, lane, startOffset, duration }) => {
                  const eventEnd = new Date(event.endDate);
                  const assigneeIds = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
                  const personNames = assigneeIds.map(id => getPersonById(id)?.name).filter(Boolean).join(', ');
                  const eventIsPast = eventEnd < new Date(new Date().setHours(0, 0, 0, 0));
                  const eventColor = eventIsPast ? '#D1D5DB' : getStageColor(campaign.color, event.stage);
                  const isSelected = selectedEventIds?.has(event.id) ?? false;

                  if (startOffset + duration < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={event.id}
                      className={`absolute rounded px-2 text-xs ${campaign.locked ? 'cursor-default' : 'cursor-move'} hover:opacity-80 overflow-hidden flex flex-col justify-center`}
                      style={{
                        top: 8 + lane * 44,
                        left: startOffset * DAY_WIDTH + 1,
                        width: duration * DAY_WIDTH - 3,
                        height: 40,
                        backgroundColor: eventColor,
                        boxShadow: isSelected ? 'inset 0 0 0 2px #111827' : undefined,
                      }}
                      data-selected-event={isSelected || undefined}
                      draggable={!campaign.locked}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onClick={(e) => {
                        if (onEventSelect) onEventSelect(event.id, e.shiftKey ? 'toggle' : 'select');
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      <div
                        className="font-medium truncate leading-tight"
                        style={{ color: event.stage === 'Delivery' && !eventIsPast ? '#FFFFFF' : getTextColor(eventColor) }}
                      >
                        {event.title}
                      </div>
                      {(showPeople || showEventNotes) && (
                        <div
                          className="truncate text-[9px] leading-tight"
                          style={{ color: event.stage === 'Delivery' && !eventIsPast ? 'rgba(255,255,255,0.8)' : getSubTextColor(eventColor) }}
                        >
                          {showPeople && personNames && <span>{personNames}</span>}
                          {showPeople && personNames && showEventNotes && event.notes && <span className="mx-1">·</span>}
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
