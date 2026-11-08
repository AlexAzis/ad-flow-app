'use client';

import { format, addWeeks, addDays, startOfWeek, endOfWeek, isWithinInterval, differenceInWeeks, isSameMonth } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor, getTextColor } from '@/lib/colorUtils';
import { getBankHolidaysForRange } from '@/lib/ukBankHolidays';

interface ToplineViewProps {
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
  onEventDrop,
  showWeekends,
  showEventNotes,
  showPeople,
  selectedCampaigns,
}: ToplineViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekCount = 24;
  const weeks = Array.from({ length: weekCount }, (_, i) => addWeeks(startDate, i));
  const bankHolidays = getBankHolidaysForRange(weeks[0], endOfWeek(weeks[weeks.length - 1], { weekStartsOn: 1 }));

  // Does a bank holiday fall within this week?
  const weekHasBankHoliday = (weekStart: Date) => {
    for (let i = 0; i < 7; i++) {
      if (bankHolidays.has(addDays(weekStart, i).toDateString())) return true;
    }
    return false;
  };

  const isCurrentWeek = (weekStart: Date) =>
    isWithinInterval(new Date(), { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  const isPastWeek = (weekStart: Date) =>
    endOfWeek(weekStart, { weekStartsOn: 1 }) < new Date(new Date().setHours(0, 0, 0, 0));

  // Group weeks by month for the header
  const monthGroups: { label: string; count: number }[] = [];
  weeks.forEach(w => {
    const label = format(w, 'MMM yyyy');
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) last.count++;
    else monthGroups.push({ label, count: 1 });
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
  // Row height expands to fit stacked stage pills (14px each + 2px gap)
  const getRowHeight = (maxPills: number) => 8 + Math.max(1, maxPills) * 16 + 4;

  return (
    <div className="h-full overflow-auto bg-white">
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
                  <span className="text-[10px] font-semibold text-gray-600">
                    {group.label}
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
              {weeks.map((weekStart) => {
                const isCurrent = isCurrentWeek(weekStart);
                return (
                  <div
                    key={weekStart.toISOString()}
                    className={`flex-shrink-0 border-r border-gray-200 flex items-center justify-center ${
                      isCurrent ? 'bg-blue-50' : isPastWeek(weekStart) ? 'bg-gray-100' : 'bg-white'
                    }`}
                    style={{ width: WEEK_WIDTH }}
                  >
                    <span className={`text-[9px] font-medium ${isCurrent ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
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
              const hasHoliday = weekHasBankHoliday(weekStart);
              return (
                <div
                  key={weekStart.toISOString()}
                  className={`flex-shrink-0 border-r border-gray-100 p-0.5 flex flex-col gap-0.5 justify-center ${
                    isCurrentWeek(weekStart) ? 'bg-blue-50' : isPast || hasHoliday ? 'bg-gray-100' : ''
                  }`}
                  style={{ width: WEEK_WIDTH }}
                >
                  {stages.map((stage) => {
                    const stageColor = isPast ? '#D1D5DB' : getStageColor(campaign.color, stage);
                    return (
                      <div
                        key={stage}
                        className="rounded px-1 flex items-center justify-center overflow-hidden"
                        style={{
                          height: 14,
                          backgroundColor: stageColor,
                        }}
                      >
                        <span
                          className="truncate leading-none"
                          style={{ fontSize: 7, color: stage === 'Delivery' ? '#FFFFFF' : getTextColor(stageColor), fontWeight: 500 }}
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
        <div className="flex border-b border-gray-200" style={{ height: getRowHeight(Math.max(1, ...weeks.map(w => getMiscForWeek(w).length))) }}>
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
            const hasHoliday = weekHasBankHoliday(weekStart);
            return (
              <div
                key={weekStart.toISOString()}
                className={`flex-shrink-0 border-r border-gray-100 p-0.5 flex flex-col gap-0.5 justify-center ${
                  isCurrentWeek(weekStart) ? 'bg-blue-50' : isPast || hasHoliday ? 'bg-gray-100' : ''
                }`}
                style={{ width: WEEK_WIDTH }}
              >
                {miscEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded px-1 flex items-center justify-center bg-gray-300 overflow-hidden"
                    style={{ height: 14 }}
                  >
                    <span className="truncate leading-none text-gray-600" style={{ fontSize: 7, fontWeight: 500 }}>
                      Misc
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
