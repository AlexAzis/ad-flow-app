'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format, addDays, differenceInDays, differenceInWeeks, isSameDay, isSameMonth } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor, getTextColor, getSubTextColor } from '@/lib/colorUtils';
import { getBankHolidaysForRange } from '@/lib/ukBankHolidays';
import { anchorWeek, exportEndIndex, LOOKBACK_DAYS } from '@/lib/visibleRange';
import {
  getEventDragData,
  getEventDragDetails,
  setEventDragData,
  type EventSelectionAction,
} from '@/lib/eventDrag';

interface CalendarGridProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventDoubleClick?: (event: Event) => void;
  selectedEventIds?: Set<string>;
  onEventSelect?: (eventId: string, action: EventSelectionAction) => void;
  onEventsDrop?: (draggedEventId: string, eventIds: string[], newDate: Date) => void;
  onEventResize?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  onEventResizeStart?: (eventId: string) => void;
  onEventResizeEnd?: () => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  dateRange?: { start: Date; end: Date };
  readOnly?: boolean;
  exportMarkers?: boolean;
}

const CELL_WIDTH = 120;
const EVENT_HEIGHT = 34;
const EVENT_GAP = 4;
const DATE_HEADER_HEIGHT = 32;
const MISC_PILL_HEIGHT = 16;
const MISC_ROW_PITCH = MISC_PILL_HEIGHT + 2;

export default function CalendarGrid({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  selectedEventIds,
  onEventSelect,
  onEventsDrop,
  onEventResize,
  onEventResizeStart,
  onEventResizeEnd,
  showWeekends,
  showEventNotes,
  showPeople,
  dateRange,
  readOnly = false,
  exportMarkers = true,
}: CalendarGridProps) {
  // Two weeks of history render before the anchor so they can be scrolled back
  // to, but nothing earlier is ever shown
  const anchor = anchorWeek(currentDate);
  const daysToShow = 385; // 12 months in full weeks, plus the 2-week look-back
  const rangeStart = dateRange?.start ?? addDays(anchor, -LOOKBACK_DAYS);
  const rangeEnd = dateRange?.end ?? addDays(rangeStart, daysToShow - 1);
  const days = Array.from(
    { length: Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1) },
    (_, i) => addDays(rangeStart, i)
  );

  const weeks = Math.ceil(days.length / 7);

  // Export markers: image starts at the current week and ends a week after the
  // last filtered event block. Events outside the rendered range can't appear,
  // so they shouldn't push the crop past the last row either.
  const exportStartIdx = differenceInWeeks(anchor, rangeStart);
  const renderedEvents = events.filter(
    e => new Date(e.endDate) >= rangeStart && new Date(e.startDate) <= rangeEnd
  );
  const exportEndIdx = Math.min(
    exportEndIndex(renderedEvents, anchor, rangeStart, 'week'),
    weeks - 1
  );

  // UK bank holidays for the visible range
  const bankHolidays = getBankHolidaysForRange(days[0], days[days.length - 1]);

  const [resizeState, setResizeState] = useState<{
    eventId: string;
    edge: 'left' | 'right';
    startX: number;
    cellWidth: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);
  const resizeStateRef = useRef(resizeState);
  resizeStateRef.current = resizeState;

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state || !onEventResize) return;

      const deltaX = e.clientX - state.startX;
      const daysDelta = Math.round(deltaX / state.cellWidth);
      if (daysDelta === 0) return;

      if (state.edge === 'left') {
        let newStart = addDays(state.originalStart, daysDelta);
        if (newStart > state.originalEnd) newStart = state.originalEnd;
        onEventResize(state.eventId, newStart, state.originalEnd);
      } else {
        let newEnd = addDays(state.originalEnd, daysDelta);
        if (newEnd < state.originalStart) newEnd = state.originalStart;
        onEventResize(state.eventId, state.originalStart, newEnd);
      }
    };

    const handleMouseUp = () => {
      onEventResizeEnd?.();
      setResizeState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, onEventResize, onEventResizeEnd]);

  // Measure how many lines the misc pills actually wrap onto in each week (depends on cell width)
  const gridRef = useRef<HTMLDivElement>(null);
  const [miscRowsByWeek, setMiscRowsByWeek] = useState<Record<number, number>>({});
  useLayoutEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const next: Record<number, number> = {};
      gridRef.current.querySelectorAll<HTMLElement>('[data-misc-week]').forEach(node => {
        const week = Number(node.dataset.miscWeek);
        // Ratio of container height to one pill's height, so the count holds at any zoom level
        const pill = node.firstElementChild as HTMLElement | null;
        const pillHeight = pill ? pill.getBoundingClientRect().height : 0;
        const gapRatio = (MISC_ROW_PITCH - MISC_PILL_HEIGHT) / MISC_PILL_HEIGHT;
        const rows = pillHeight
          ? Math.max(1, Math.round((node.getBoundingClientRect().height / pillHeight + gapRatio) / (1 + gapRatio)))
          : 1;
        next[week] = Math.max(next[week] || 1, rows);
      });
      setMiscRowsByWeek(prev => {
        const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
        return keys.every(k => (prev[+k] || 1) === (next[+k] || 1)) ? prev : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [events, showWeekends, currentDate]);

  // Opening the view (or changing month) lands on the current week; the previous
  // two weeks sit above it, reachable by scrolling up
  const anchorKey = anchor.getTime();
  useLayoutEffect(() => {
    const scroller = gridRef.current;
    const start = scroller?.querySelector<HTMLElement>('[data-export-start]');
    const first = scroller?.querySelector<HTMLElement>('[data-export-cell]');
    if (scroller && start && first) {
      scroller.scrollTop = start.getBoundingClientRect().top - first.getBoundingClientRect().top;
    }
  }, [anchorKey, miscRowsByWeek]);

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    if (resizeState) {
      e.preventDefault();
      return;
    }
    const details = getEventDragDetails(event.id, events, selectedEventIds, e.shiftKey);
    if (details.selectionAction && onEventSelect) {
      onEventSelect(event.id, details.selectionAction);
    }
    setEventDragData(e.dataTransfer, details);
  };

  const handleResizeStart = (e: React.MouseEvent, event: Event, edge: 'left' | 'right', colCount: number) => {
    e.preventDefault();
    e.stopPropagation();
    const parent = (e.currentTarget as HTMLElement).closest('[data-week-row]');
    const cellWidth = parent ? parent.getBoundingClientRect().width / colCount : 120;
    onEventResizeStart?.(event.id);
    setResizeState({
      eventId: event.id,
      edge,
      startX: e.clientX,
      cellWidth,
      originalStart: new Date(event.startDate),
      originalEnd: new Date(event.endDate),
    });
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

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  const getEventsForDate = (date: Date) =>
    events.filter(e => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      return date >= s && date <= en;
    });

  // Compute positioned events for a week: span across visible day columns with lane stacking
  const getWeekEvents = (weekDays: Date[]) => {
    const weekStart = weekDays[0];
    const weekEnd = weekDays[weekDays.length - 1];

    const weekEvents = events.filter(e => {
      if (e.isMisc) return false; // Misc events render inside day cells, not as spanning blocks
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      return s <= weekEnd && en >= weekStart;
    });

    weekEvents.sort((a, b) => {
      const aStart = differenceInDays(new Date(a.startDate), weekStart);
      const bStart = differenceInDays(new Date(b.startDate), weekStart);
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      return aStart - bStart || bDuration - aDuration;
    });

    const lanes: number[] = [];
    const campaignLanes = new Map<string, number>();
    return weekEvents.flatMap(e => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      const startCol = weekDays.filter(d => d < s).length;
      const endCol = weekDays.filter(d => d <= en).length - 1;
      if (endCol < startCol) return []; // Event only falls on hidden (weekend) days
      // Prefer the lane this campaign already occupies so its blocks line up,
      // but fall back to the first free lane to keep the row count minimal
      const preferred = campaignLanes.get(e.campaignId);
      let lane = preferred !== undefined && lanes[preferred] < startCol
        ? preferred
        : lanes.findIndex(end => end < startCol);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(0);
      }
      lanes[lane] = endCol;
      if (!campaignLanes.has(e.campaignId)) campaignLanes.set(e.campaignId, lane);
      return [{ event: e, startCol, span: endCol - startCol + 1, lane }];
    });
  };

  const weekRows = Array.from({ length: weeks }, (_, weekIndex) => {
    const weekDays = days
      .slice(weekIndex * 7, (weekIndex + 1) * 7)
      .filter(d => !showWeekends || (d.getDay() !== 0 && d.getDay() !== 6));
    const positionedEvents = getWeekEvents(weekDays);
    const laneCount = Math.max(3, ...positionedEvents.map(e => e.lane + 1), 0);
    // Misc pills wrap onto extra lines when they don't fit; measured line count pushes events down
    const maxMiscRows = miscRowsByWeek[weekIndex] || 1;
    const headerHeight = DATE_HEADER_HEIGHT + (maxMiscRows - 1) * MISC_ROW_PITCH;
    const rowHeight = headerHeight + laneCount * (EVENT_HEIGHT + EVENT_GAP) + 8;
    const hasEvents = positionedEvents.length > 0 || weekDays.some(d => getEventsForDate(d).some(e => e.isMisc));
    return { weekIndex, weekDays, positionedEvents, rowHeight, headerHeight, hasEvents };
  });

  // Month column segments: one merged block per month, plus a split cell for weeks spanning two months
  type MonthSegment =
    | { kind: 'month'; date: Date; height: number }
    | { kind: 'split'; from: Date; to: Date; height: number };
  const monthSegments: MonthSegment[] = [];
  weekRows.forEach(({ weekDays, rowHeight }) => {
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const prev = monthSegments[monthSegments.length - 1];
    if (!isSameMonth(first, last)) {
      monthSegments.push({ kind: 'split', from: first, to: last, height: rowHeight });
    } else if (prev && prev.kind === 'month' && isSameMonth(prev.date, first)) {
      prev.height += rowHeight;
    } else {
      monthSegments.push({ kind: 'month', date: first, height: rowHeight });
    }
  });
  const monthsWithBlock = new Set(
    monthSegments.flatMap(s => (s.kind === 'month' ? [format(s.date, 'yyyy-MM')] : []))
  );
  const monthLabel = (date: Date, small?: boolean) => (
    <span className="flex flex-col items-center leading-tight">
      <span className={`${small ? 'text-[8px]' : 'text-[11px]'} font-medium text-gray-700`}>{format(date, 'MMM')}</span>
      <span className={`${small ? 'text-[7px]' : 'text-[9px]'} text-gray-500`}>{format(date, 'yyyy')}</span>
    </span>
  );

  return (
    <div className="flex flex-col min-w-0 h-full pr-3">
      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        {/* Weekday Header: inside the scroller so its columns always match the
            grid width, including when a scrollbar appears */}
        <div className="sticky top-0 z-20 flex h-10 border-b border-gray-200 bg-gray-50">
          <div className="w-9 flex-shrink-0 border-r border-gray-200"></div>
          <div className="flex flex-1">
            {days.slice(0, 7)
              .filter(d => !showWeekends || (d.getDay() !== 0 && d.getDay() !== 6))
              .map((day) => (
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
        <div className="flex">
          {/* Month Column: merged per month, diagonal split where a week spans two months */}
          <div className="w-9 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {monthSegments.map((seg, i) => {
              const prev = monthSegments[i - 1];
              const isLast = i === monthSegments.length - 1;
              if (seg.kind === 'month') {
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center border-gray-200 ${
                      prev && prev.kind === 'month' ? 'border-t' : ''
                    } ${isLast ? 'border-b' : ''}`}
                    style={{ height: seg.height }}
                  >
                    {monthLabel(seg.date)}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`relative border-gray-200 ${isLast ? 'border-b' : ''}`}
                  style={{ height: seg.height }}
                >
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="100" x2="100" y2="0" stroke="#D1D5DB" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {!monthsWithBlock.has(format(seg.from, 'yyyy-MM')) && (
                    <div className="absolute top-1 left-0.5">{monthLabel(seg.from, true)}</div>
                  )}
                  {!monthsWithBlock.has(format(seg.to, 'yyyy-MM')) && (
                    <div className="absolute bottom-1 right-0.5">{monthLabel(seg.to, true)}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-w-0">
        {weekRows.map(({ weekIndex, weekDays, positionedEvents, rowHeight, headerHeight, hasEvents }) => {
          return (
              <div
                key={weekIndex}
                className="relative flex border-b border-gray-200"
                style={{ height: rowHeight }}
                data-week-row
                data-has-events={hasEvents}
                data-export-cell={exportMarkers ? true : undefined}
                data-export-start={exportMarkers && weekIndex === exportStartIdx ? true : undefined}
                data-export-end={exportMarkers && weekIndex === exportEndIdx ? true : undefined}
              >
                {weekDays.map((day) => {
                  const dayOfWeek = day.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isToday = isSameDay(day, new Date());
                  const isPast = readOnly ? false : day < new Date(new Date().setHours(0, 0, 0, 0));
                  const bankHolidayName = bankHolidays.get(day.toDateString());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 border-r border-gray-200 h-full relative ${
                        isPast ? 'bg-gray-100' : isWeekend || bankHolidayName ? 'bg-[#F6F7F9]' : ''
                      }`}
                      onDoubleClick={() => onDateClick(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      {/* Date number + misc lozenges on one aligned row */}
                      <div className="absolute top-1.5 left-2 right-1 flex items-start gap-1.5">
                        <span
                          className={`text-sm h-6 flex items-center justify-center flex-shrink-0 ${
                            isToday
                              ? 'w-6 bg-gray-900 text-white rounded-full font-bold'
                              : 'text-gray-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {(() => {
                          const miscEvents = getEventsForDate(day).filter(e => e.isMisc);
                          if (miscEvents.length === 0) return null;
                          return (
                            <div
                              className="flex-1 min-w-0 mt-1 flex flex-wrap gap-x-[3px] gap-y-0.5"
                              data-misc-week={weekIndex}
                            >
                              {miscEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded-full px-1.5 text-[11px] text-gray-500 bg-gray-200 cursor-pointer hover:opacity-80 truncate max-w-full"
                                  style={{ height: MISC_PILL_HEIGHT, lineHeight: `${MISC_PILL_HEIGHT}px` }}
                                  title={event.title}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (onEventDoubleClick) onEventDoubleClick(event);
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bank Holiday label - centered, in line with date number */}
                      {bankHolidayName && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[9px] text-gray-400 whitespace-nowrap">
                            {bankHolidayName}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Continuous Event Blocks spanning multiple days */}
                {positionedEvents.map(({ event, startCol, span, lane }) => {
                  const campaign = getCampaignById(event.campaignId);
                  const assigneeIds = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
                  const personNames = assigneeIds.map(id => getPersonById(id)?.name).filter(Boolean).join(', ');
                  const eventIsPast = readOnly ? false : new Date(event.endDate) < new Date(new Date().setHours(0, 0, 0, 0));
                  const eventColor = eventIsPast ? '#D1D5DB' : (campaign ? getStageColor(campaign.color, event.stage) : event.color);
                  const isSelected = selectedEventIds?.has(event.id) ?? false;

                  return (
                    <div
                      key={`${event.id}-w${weekIndex}`}
                      className={`absolute rounded px-2 text-xs ${campaign?.locked ? 'cursor-default' : 'cursor-move'} hover:opacity-80 overflow-hidden group`}
                      style={{
                        left: `calc(${(startCol / weekDays.length) * 100}% + 2px)`,
                        width: `calc(${(span / weekDays.length) * 100}% - 4px)`,
                        top: headerHeight + lane * (EVENT_HEIGHT + EVENT_GAP),
                        height: EVENT_HEIGHT,
                        backgroundColor: eventColor,
                        boxShadow: isSelected ? 'inset 0 0 0 2px #111827' : undefined,
                      }}
                      data-selected-event={isSelected || undefined}
                      draggable={!resizeState && !campaign?.locked}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onClick={(e) => {
                        if (onEventSelect) onEventSelect(event.id, e.shiftKey ? 'toggle' : 'select');
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      {!campaign?.locked && (<>
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-gray-500/50 transition-opacity z-10"
                        draggable={false}
                        onMouseDown={(e) => handleResizeStart(e, event, 'left', weekDays.length)}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-gray-500/50 transition-opacity z-10"
                        draggable={false}
                        onMouseDown={(e) => handleResizeStart(e, event, 'right', weekDays.length)}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      </>)}
                      <div className="h-full flex flex-col justify-center">
                        <div
                          className="font-medium truncate leading-tight"
                          style={{ color: event.stage === 'Delivery' && !eventIsPast ? '#FFFFFF' : getTextColor(eventColor) }}
                        >
                          {event.title}
                        </div>
                        {(showPeople || showEventNotes) && (
                          <div
                            className="truncate text-[10px] leading-tight"
                            style={{ color: event.stage === 'Delivery' && !eventIsPast ? 'rgba(255,255,255,0.8)' : getSubTextColor(eventColor) }}
                          >
                            {showPeople && personNames && <span>{personNames}</span>}
                            {showPeople && personNames && showEventNotes && event.notes && <span className="mx-1">·</span>}
                            {showEventNotes && event.notes && <span>{event.notes}</span>}
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
      </div>
    </div>
  );
}
