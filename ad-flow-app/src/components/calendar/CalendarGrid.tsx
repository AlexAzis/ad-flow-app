'use client';

import { useState, useEffect, useRef } from 'react';
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
  onEventDrop?: (eventId: string, newDate: Date) => void;
  onEventResize?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  viewMode?: 'daily-6' | 'daily-12';
}

const CELL_WIDTH = 120;
const EVENT_HEIGHT = 40;
const EVENT_GAP = 4;
const DATE_HEADER_HEIGHT = 32;

export default function CalendarGrid({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  onEventDrop,
  onEventResize,
  showWeekends,
  showEventNotes,
  showPeople,
  viewMode = 'daily-6',
}: CalendarGridProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const daysToShow = viewMode === 'daily-6' ? 182 : 371; // full weeks
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const [resizeState, setResizeState] = useState<{
    eventId: string;
    edge: 'left' | 'right';
    startX: number;
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
      const daysDelta = Math.round(deltaX / CELL_WIDTH);
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

    const handleMouseUp = () => setResizeState(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, onEventResize]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    if (resizeState) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleResizeStart = (e: React.MouseEvent, event: Event, edge: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setResizeState({
      eventId: event.id,
      edge,
      startX: e.clientX,
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
    const eventId = e.dataTransfer.getData('eventId');
    if (eventId && onEventDrop) {
      onEventDrop(eventId, date);
    }
  };

  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);
  const getPersonById = (id: string) => people.find(p => p.id === id);

  // Compute positioned events for a week: span across day columns with lane stacking
  const getWeekEvents = (weekDays: Date[]) => {
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    const weekEvents = events.filter(e => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      return s <= weekEnd && en >= weekStart;
    });

    weekEvents.sort((a, b) => {
      const aStart = Math.max(0, differenceInDays(new Date(a.startDate), weekStart));
      const bStart = Math.max(0, differenceInDays(new Date(b.startDate), weekStart));
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      return aStart - bStart || bDuration - aDuration;
    });

    const lanes: number[] = [];
    return weekEvents.map(e => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      const startCol = Math.max(0, differenceInDays(s, weekStart));
      const endCol = Math.min(6, differenceInDays(en, weekStart));
      let lane = lanes.findIndex(end => end < startCol);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(0);
      }
      lanes[lane] = endCol;
      return { event: e, startCol, span: endCol - startCol + 1, lane };
    });
  };

  const weeks = Math.ceil(days.length / 7);

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Weekday Header */}
      <div className="flex h-10 border-b border-gray-200 flex-shrink-0">
        <div className="w-32 flex-shrink-0"></div>
        <div className="flex">
          {days.slice(0, 7).map((day) => (
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
      <div className="flex-1 overflow-auto">
        {Array.from({ length: weeks }).map((_, weekIndex) => {
          const weekDays = days.slice(weekIndex * 7, (weekIndex + 1) * 7);
          const positionedEvents = getWeekEvents(weekDays);
          const laneCount = Math.max(3, ...positionedEvents.map(e => e.lane + 1), 0);
          const rowHeight = DATE_HEADER_HEIGHT + laneCount * (EVENT_HEIGHT + EVENT_GAP) + 8;

          return (
            <div key={weekIndex} className="flex border-b border-gray-200" style={{ height: rowHeight }}>
              {/* Month Column */}
              {(() => {
                const weekMonth = format(weekDays[0], 'MMMM yyyy');
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

              {/* Week Row: day cells background + positioned event blocks */}
              <div className="flex-1 relative flex">
                {weekDays.map((day) => {
                  const dayOfWeek = day.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isToday = isSameDay(day, new Date());
                  const isPastMonth = !isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`w-[120px] border-r border-gray-200 h-full relative flex-shrink-0 ${
                        isWeekend && showWeekends ? 'bg-gray-100' : ''
                      } ${isPastMonth ? 'opacity-50' : ''}`}
                      onDoubleClick={() => onDateClick(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    >
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
                    </div>
                  );
                })}

                {/* Continuous Event Blocks spanning multiple days */}
                {positionedEvents.map(({ event, startCol, span, lane }) => {
                  const campaign = getCampaignById(event.campaignId);
                  const person = event.assignee ? getPersonById(event.assignee) : null;
                  const eventColor = campaign ? getStageColor(campaign.color, event.stage) : event.color;

                  return (
                    <div
                      key={`${event.id}-w${weekIndex}`}
                      className="absolute rounded px-2 py-1.5 text-xs cursor-move hover:opacity-80 overflow-hidden group"
                      style={{
                        left: startCol * CELL_WIDTH + 1,
                        width: span * CELL_WIDTH - 4,
                        top: DATE_HEADER_HEIGHT + lane * (EVENT_HEIGHT + EVENT_GAP),
                        height: EVENT_HEIGHT,
                        backgroundColor: eventColor,
                      }}
                      draggable={!resizeState}
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onEventDoubleClick) onEventDoubleClick(event);
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-gray-500/50 transition-opacity z-10"
                        draggable={false}
                        onMouseDown={(e) => handleResizeStart(e, event, 'left')}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-gray-500/50 transition-opacity z-10"
                        draggable={false}
                        onMouseDown={(e) => handleResizeStart(e, event, 'right')}
                        onDragStart={(e) => e.preventDefault()}
                      />
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
