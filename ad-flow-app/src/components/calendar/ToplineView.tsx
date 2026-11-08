'use client';

import { format, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns';
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

const DAY_WIDTH = 60;
const LABEL_COL_WIDTH = 200;

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
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i));

  // Group events by campaign and stage
  const getStageBlocks = (campaignId: string) => {
    const campaignEvents = events.filter(e => e.campaignId === campaignId);
    const stageGroups: Record<string, Event[]> = {};
    campaignEvents.forEach(event => {
      if (!stageGroups[event.stage]) stageGroups[event.stage] = [];
      stageGroups[event.stage].push(event);
    });
    return stageGroups;
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

        {/* Campaign Rows with Stage Blocks */}
        {visibleCampaigns.map((campaign) => {
          const stageBlocks = getStageBlocks(campaign.id);
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
                {days.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`absolute top-0 bottom-0 border-r border-gray-100 ${
                        isWeekend && showWeekends ? 'bg-gray-100' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    />
                  );
                })}

                {/* Stage Blocks */}
                {Object.entries(stageBlocks).map(([stage, stageEvents], stageIndex) => {
                  const earliestStart = Math.min(...stageEvents.map(e => new Date(e.startDate).getTime()));
                  const latestEnd = Math.max(...stageEvents.map(e => new Date(e.endDate).getTime()));
                  const startOffset = differenceInDays(new Date(earliestStart), startDate);
                  const duration = differenceInDays(new Date(latestEnd), new Date(earliestStart)) + 1;
                  const stageColor = getStageColor(campaign.color, stage);

                  if (startOffset + duration < 0 || startOffset >= days.length) return null;

                  return (
                    <div
                      key={stage}
                      className="absolute rounded px-2 py-1 text-xs overflow-hidden"
                      style={{
                        top: 10 + stageIndex * 44,
                        left: startOffset * DAY_WIDTH + 1,
                        width: duration * DAY_WIDTH - 3,
                        height: 40,
                        backgroundColor: stageColor,
                      }}
                    >
                      <div className="font-medium text-gray-800 truncate leading-tight">
                        {stage}
                      </div>
                      <div className="text-gray-600 truncate text-[9px]">
                        {stageEvents.length} event{stageEvents.length !== 1 ? 's' : ''}
                      </div>
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
