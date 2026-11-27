'use client';

import { useLayoutEffect, useRef } from 'react';
import { format, addDays, isSameDay, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getBlockColor, getTextColor, getSubTextColor } from '@/lib/colorUtils';
import { blockTooltip } from '@/lib/blockTooltip';
import { getBankHolidaysForRange } from '@/lib/ukBankHolidays';
import { anchorDay, exportEndIndex, LOOKBACK_DAYS } from '@/lib/visibleRange';
import {
  getEventDragData,
  getEventDragDetails,
  setEventDragData,
  type EventSelectionAction,
} from '@/lib/eventDrag';

interface VerticalViewProps {
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

export default function VerticalView({
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
}: VerticalViewProps) {
  // Two weeks of history render before the anchor so they can be scrolled back
  // to, but nothing earlier is ever shown
  const anchor = anchorDay(currentDate);
  const rangeStart = addDays(anchor, -LOOKBACK_DAYS);

  // The range runs to the end of the week after the last filtered event block,
  // so scrolling down always reaches just past the final block
  // The view scrolls to the navigated day, but exports start at today
  const scrollStartIdx = LOOKBACK_DAYS;
  const exportEndIdx = exportEndIndex(events, anchor, rangeStart, 'day');
  const days = Array.from(
    { length: exportEndIdx >= 0 ? exportEndIdx + 1 : 60 + LOOKBACK_DAYS },
    (_, i) => addDays(rangeStart, i)
  );
  const exportStartIdx = Math.min(
    Math.max(0, differenceInDays(startOfDay(new Date()), rangeStart)),
    Math.max(0, days.length - 1)
  );
  const bankHolidays = getBankHolidaysForRange(days[0], days[days.length - 1]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const anchorKey = anchor.getTime();
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const start = scroller?.querySelector<HTMLElement>('[data-view-start]');
    const first = scroller?.querySelector<HTMLElement>('[data-export-cell]');
    if (scroller && start && first) {
      scroller.scrollTop = start.getBoundingClientRect().top - first.getBoundingClientRect().top;
    }
  }, [anchorKey]);

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForCampaignAndDate = (campaignId: string, date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return event.campaignId === campaignId && !event.isMisc && date >= eventStart && date <= eventEnd;
    });
  };

  const visibleCampaigns = campaigns.filter(
    c => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
  );

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

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Header and rows live inside one scroller with a shared content width,
          so the columns always line up (scrollbars included) */}
      <div className="flex-1 overflow-auto min-h-0" ref={scrollerRef}>
        <div style={{ width: 'fit-content', minWidth: '100%' }}>
          {/* Header Row */}
          <div className="sticky top-0 z-20 flex h-12 border-b border-gray-200 bg-gray-50">
            <div className="w-24 flex-shrink-0 border-r border-gray-200"></div>
            {visibleCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex-1 border-r border-gray-200 flex items-center justify-center px-2 min-w-[200px]"
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
            ))}
            {/* Misc Column Header */}
            <div className="w-36 flex-shrink-0 flex items-center justify-center px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300" />
                <span className="text-sm font-medium text-gray-800">Misc.</span>
              </div>
            </div>
          </div>
        {days.map((day, index) => {
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = isSameDay(day, new Date());
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
          const bankHolidayName = bankHolidays.get(day.toDateString());

          // Fixed row height: multiple events on a day share the row side by side
          const rowHeight = 44;

          return (
            <div
              key={day.toISOString()}
              className={`flex border-b border-gray-200 ${
                [isPast && 'cell-past', (isWeekend || bankHolidayName) && 'cell-off'].filter(Boolean).join(' ')
              }`}
              style={{ height: rowHeight }}
              data-export-cell
              data-view-start={index === scrollStartIdx ? true : undefined}
              data-export-start={index === exportStartIdx ? true : undefined}
              data-export-end={index === exportEndIdx ? true : undefined}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Date Column */}
              <div className="w-24 flex-shrink-0 border-r border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <span
                    className={`inline-block text-xs font-medium whitespace-nowrap ${
                      isToday
                        ? 'bg-gray-900 text-white rounded-full px-2.5 py-1'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd MMM')}
                  </span>
                  {bankHolidayName && (
                    <span className="text-[9px] text-gray-400 block mt-0.5">{bankHolidayName}</span>
                  )}
                </div>
              </div>

              {/* Campaign Columns */}
              {visibleCampaigns.map((campaign) => {
                const dayEvents = getEventsForCampaignAndDate(campaign.id, day);

                return (
                  <div
                    key={campaign.id}
                    className="flex-1 border-r border-gray-200 px-1 min-w-[200px] flex items-center gap-1"
                  >
                    {dayEvents.map((event) => {
                      const assigneeIds = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
                      const personNames = assigneeIds.map(id => getPersonById(id)?.name).filter(Boolean).join(', ');
                      const eventIsPast = new Date(event.endDate) < new Date(new Date().setHours(0, 0, 0, 0));
                      const eventColor = getBlockColor(campaign.color, event.stage, eventIsPast);
                      const isSelected = selectedEventIds?.has(event.id) ?? false;

                      return (
                        <div
                          key={event.id}
                          className={`rounded px-2 text-xs h-8 ${campaign.locked ? 'cursor-default' : 'cursor-move'} hover:opacity-80 flex-1 min-w-0 overflow-hidden flex flex-col justify-center`}
                          style={{
                            backgroundColor: eventColor,
                            boxShadow: isSelected ? 'inset 0 0 0 2px #111827' : undefined,
                          }}
                          title={blockTooltip(event, { campaign: campaign.name, people: personNames })}
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
                );
              })}

              {/* Misc Column */}
              <div className="w-36 flex-shrink-0 px-1 flex items-center gap-1">
                {events
                  .filter(e => e.isMisc && day >= new Date(e.startDate) && day <= new Date(e.endDate))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="rounded px-2 text-xs h-8 bg-gray-200 flex-1 min-w-0 overflow-hidden flex flex-col justify-center"
                      title={blockTooltip(event)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      <div className="font-medium text-gray-600 truncate leading-tight text-[10px]">
                        {event.title}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
