'use client';

import { format, addWeeks, addDays, startOfWeek, isSameDay, isWithinInterval, differenceInWeeks, endOfWeek } from 'date-fns';
import { Event, Campaign, Person } from '@/lib/types';
import { getStageColor } from '@/lib/colorUtils';

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

const WEEK_WIDTH = 80;
const LABEL_COL_WIDTH = 200;
const BLOCK_HEIGHT = 24;
const BLOCK_GAP = 4;

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
  const weekCount = 16;
  const weeks = Array.from({ length: weekCount }, (_, i) => addWeeks(startDate, i));

  const isCurrentWeek = (weekStart: Date) =>
    isWithinInterval(new Date(), { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  const isPastWeek = (weekStart: Date) =>
    endOfWeek(weekStart, { weekStartsOn: 1 }) < new Date();

  // Group events by campaign and stage, then compute stage blocks per week
  const getStageBlocks = (campaignId: string) => {
    const campaignEvents = events.filter(e => e.campaignId === campaignId);
    const stageGroups: Record<string, Event[]> = {};
    campaignEvents.forEach(event => {
      if (!stageGroups[event.stage]) stageGroups[event.stage] = [];
      stageGroups[event.stage].push(event);
    });

    // For each stage, compute which weeks it spans
    return Object.entries(stageGroups).map(([stage, stageEvents]) => {
      const earliestStart = Math.min(...stageEvents.map(e => new Date(e.startDate).getTime()));
      const latestEnd = Math.max(...stageEvents.map(e => new Date(e.endDate).getTime()));
      const startWeek = Math.max(0, differenceInWeeks(new Date(earliestStart), startDate));
      const endWeek = Math.min(weekCount - 1, differenceInWeeks(new Date(latestEnd), startDate));
      return { stage, stageEvents, startWeek, spanWeeks: endWeek - startWeek + 1 };
    });
  };

  const visibleCampaigns = campaigns.filter(
    c => !selectedCampaigns || selectedCampaigns.size === 0 || selectedCampaigns.has(c.id)
  );

  return (
    <div className="h-full overflow-auto bg-white">
      <div style={{ width: LABEL_COL_WIDTH + weeks.length * WEEK_WIDTH, minWidth: '100%' }}>
        {/* Sticky Week Header */}
        <div className="sticky top-0 z-20 flex h-12 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0"
            style={{ width: LABEL_COL_WIDTH }}
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
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? 'text-blue-700 font-bold' : 'text-gray-700'
                    }`}
                  >
                    {format(weekStart, 'd MMM')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Rows with Stage Blocks */}
        {visibleCampaigns.map((campaign) => {
          const stageBlocks = getStageBlocks(campaign.id);
          // Assign overlapping stage blocks to lanes so they stack within the row
          const lanes: number[] = [];
          const positioned = stageBlocks.map(block => {
            let lane = lanes.findIndex(end => end < block.startWeek);
            if (lane === -1) { lane = lanes.length; lanes.push(0); }
            lanes[lane] = block.startWeek + block.spanWeeks - 1;
            return { ...block, lane };
          });
          const laneCount = Math.max(1, ...positioned.map(p => p.lane + 1));
          const rowHeight = 16 + laneCount * (BLOCK_HEIGHT + BLOCK_GAP) + 8;

          return (
            <div key={campaign.id} className="flex border-b border-gray-200" style={{ height: rowHeight }}>
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

              {/* Week Timeline */}
              <div className="flex-1 relative">
                {weeks.map((weekStart, index) => {
                  const isCurrent = isCurrentWeek(weekStart);
                  const isPast = isPastWeek(weekStart);
                  return (
                    <div
                      key={weekStart.toISOString()}
                      className={`absolute top-0 bottom-0 border-r border-gray-100 ${
                        isCurrent ? 'bg-blue-50' : isPast ? 'bg-gray-100' : ''
                      }`}
                      style={{ left: index * WEEK_WIDTH, width: WEEK_WIDTH }}
                    />
                  );
                })}

                {/* Stage Blocks */}
                {positioned.map(({ stage, stageEvents, startWeek, spanWeeks, lane }) => {
                  const latestEnd = Math.max(...stageEvents.map(e => new Date(e.endDate).getTime()));
                  const isPast = new Date(latestEnd) < new Date(new Date().setHours(0, 0, 0, 0));
                  const stageColor = isPast ? '#D1D5DB' : getStageColor(campaign.color, stage);
                  if (startWeek + spanWeeks < 0 || startWeek >= weekCount) return null;

                  return (
                    <div
                      key={stage}
                      className="absolute rounded px-2 flex items-center overflow-hidden"
                      style={{
                        top: 8 + lane * (BLOCK_HEIGHT + BLOCK_GAP),
                        left: startWeek * WEEK_WIDTH + 1,
                        width: spanWeeks * WEEK_WIDTH - 3,
                        height: BLOCK_HEIGHT,
                        backgroundColor: stageColor,
                      }}
                    >
                      <span className="font-medium text-gray-800 truncate text-[10px]">
                        {stage}
                      </span>
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
