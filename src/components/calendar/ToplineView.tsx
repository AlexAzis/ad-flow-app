'use client';

import { useLayoutEffect, useRef } from 'react';
import { format, addWeeks, endOfWeek, isWithinInterval } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor, getTextColor } from '@/lib/colorUtils';
import { anchorWeek, exportEndIndex, monthAfterEndIndex } from '@/lib/visibleRange';

interface ToplineViewProps {
  events: Event[];
  campaigns: Campaign[];
  people: Person[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventDoubleClick?: (event: Event) => void;
  showWeekends: boolean;
  showEventNotes: boolean;
  showPeople: boolean;
  selectedCampaigns?: Set<string>;
}

const WEEK_WIDTH = 44;

// Stage abbreviations for the compact pills
const stageAbbr: Record<string, string> = {
  'Creative Development': 'Creative',
  'Pre-Production': 'Pre',
  'Shoot': 'Shoot',
  'Post-Production': 'Post',
  'Delivery': 'Del',
};

export default function ToplineView({
  events,
  campaigns,
  people,
  currentDate,
  onDateClick,
  onEventDoubleClick,
  showWeekends,
  showEventNotes,
  showPeople,
  selectedCampaigns,
}: ToplineViewProps) {
  // Two weeks of history render before the anchor so they can be scrolled back
  // to, but nothing earlier is ever shown
  const anchor = anchorWeek(currentDate);
  const rangeStart = addWeeks(anchor, -2);

  // The range runs to a month after the last filtered event block so the view
  // can be scrolled well past the final block; exports still crop at the week
  // after the last block
  const exportStartIdx = 2;
  const exportEndIdx = exportEndIndex(events, anchor, rangeStart, 'week');
  const viewEndIdx = monthAfterEndIndex(events, anchor, rangeStart, 'week');
  const weeks = Array.from({ length: viewEndIdx >= 0 ? viewEndIdx + 1 : 26 }, (_, i) => addWeeks(rangeStart, i));

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

  const isCurrentWeek = (weekStart: Date) =>
    isWithinInterval(new Date(), { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  const isPastWeek = (weekStart: Date) =>
    endOfWeek(weekStart, { weekStartsOn: 1 }) < new Date(new Date().setHours(0, 0, 0, 0));

  // Group weeks by month for the header
  const monthGroups: { label: string; shortLabel: string; count: number }[] = [];
  weeks.forEach(w => {
    const label = format(w, 'MMM yyyy');
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) last.count++;
    else monthGroups.push({ label, shortLabel: format(w, "MMM ''yy"), count: 1 });
  });

  // For a campaign + week, return which stages occur
  const getStagesForWeek = (campaignId: string, weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const stages = new Set<string>();
    events.forEach(e => {
      if (e.campaignId !== campaignId || e.isMisc) return;
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      if (s <= weekEnd && en >= weekStart) stages.add(e.stage);
    });
    return Array.from(stages);
  };

  const getMiscForWeek = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return events.filter(e => {
      if (!e.isMisc) return false;
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      return s <= weekEnd && en >= weekStart;
    });
  };

  const visibleCampaigns = campaigns.filter(
    c => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
  );

  // Auto-size label column to fit the longest campaign name
  const labelWidth = Math.max(200, ...visibleCampaigns.map(c => c.name.length * 7.5 + 40), 220);

  const monthHeaderHeight = 28;
  const weekHeaderHeight = 22;
  // Stage blocks fill the row and share its height; the row only grows past 2 stages in a week
  const getRowHeight = (maxPills: number) => Math.max(44, maxPills * 20 + 4);

  return (
    <div className="h-full overflow-auto bg-white" ref={scrollerRef}>
      <div style={{ width: labelWidth + weeks.length * WEEK_WIDTH, minWidth: '100%' }}>
        {/* Sticky Header - Month row + Week row */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          {/* Month row */}
          <div className="flex" style={{ height: monthHeaderHeight }}>
            <div
              className="sticky left-0 z-30 bg-white border-r border-b border-gray-200 flex-shrink-0"
              style={{ width: labelWidth }}
            />
            <div className="flex">
              {monthGroups.map((group, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-r border-b border-gray-200 flex items-center justify-center bg-gray-50"
                  style={{ width: group.count * WEEK_WIDTH }}
                >
                  <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                    {group.count === 1 ? group.shortLabel : group.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Week row */}
          <div className="flex" style={{ height: weekHeaderHeight }}>
            <div
              className="sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0"
              style={{ width: labelWidth }}
            />
            <div className="flex">
              {weeks.map((weekStart, index) => {
                const isCurrent = isCurrentWeek(weekStart);
                return (
                  <div
                    key={weekStart.toISOString()}
                    className={`flex-shrink-0 border-r border-gray-200 flex items-center justify-center ${
                      isPastWeek(weekStart) ? 'bg-gray-100' : 'bg-white'
                    }`}
                    style={{ width: WEEK_WIDTH }}
                    data-export-cell
                    data-export-start={index === exportStartIdx ? true : undefined}
                    data-export-end={index === exportEndIdx ? true : undefined}
                  >
                    <span className={`text-[9px] font-medium ${isCurrent ? 'w-4 h-4 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold' : 'text-gray-600'}`}>
                      {format(weekStart, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campaign Rows - compact stage pills per week */}
        {visibleCampaigns.map((campaign) => {
          const maxPills = Math.max(1, ...weeks.map(w => getStagesForWeek(campaign.id, w).length));
          return (
          <div key={campaign.id} className="flex border-b border-gray-200" style={{ height: getRowHeight(maxPills) }}>
            {/* Sticky Campaign Column */}
            <div
              className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
              style={{ width: labelWidth }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: campaign.color }}
                />
                <span className="text-xs font-medium text-gray-800 truncate">
                  {campaign.name}
                </span>
              </div>
            </div>

            {/* Week Cells with Stage Pills */}
            {weeks.map((weekStart) => {
              const stages = getStagesForWeek(campaign.id, weekStart);
              const isPast = isPastWeek(weekStart);
              return (
                <div
                  key={weekStart.toISOString()}
                  className={`flex-shrink-0 border-r border-gray-100 p-0.5 flex flex-col gap-0.5 ${
                    isPast ? 'bg-gray-100' : ''
                  }`}
                  style={{ width: WEEK_WIDTH }}
                >
                  {stages.map((stage) => {
                    const stageColor = isPast ? '#D1D5DB' : getStageColor(campaign.color, stage);
                    return (
                      <div
                        key={stage}
                        className="rounded px-1 flex-1 min-h-0 flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor: stageColor,
                        }}
                      >
                        <span
                          className="truncate leading-none"
                          style={{ fontSize: 7, color: stage === 'Delivery' && !isPast ? '#FFFFFF' : getTextColor(stageColor), fontWeight: 500 }}
                        >
                          {stageAbbr[stage] || stage.slice(0, 4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          );
        })}

        {/* Misc Row */}
        <div className="flex border-b border-gray-200" style={{ height: getRowHeight(1) }}>
          <div
            className="sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center px-3 flex-shrink-0"
            style={{ width: labelWidth }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
              <span className="text-xs font-medium text-gray-800">Misc.</span>
            </div>
          </div>
          {weeks.map((weekStart) => {
            const miscEvents = getMiscForWeek(weekStart);
            const isPast = isPastWeek(weekStart);
            return (
              <div
                key={weekStart.toISOString()}
                className={`flex-shrink-0 border-r border-gray-100 p-0.5 flex flex-col gap-0.5 ${
                  isPast ? 'bg-gray-100' : ''
                }`}
                style={{ width: WEEK_WIDTH }}
              >
                {miscEvents.length > 0 && (
                  <div className="rounded px-1 flex-1 min-h-0 flex items-center justify-center bg-gray-300 overflow-hidden">
                    <span className="truncate leading-none text-gray-600" style={{ fontSize: 7, fontWeight: 500 }}>
                      Misc
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
