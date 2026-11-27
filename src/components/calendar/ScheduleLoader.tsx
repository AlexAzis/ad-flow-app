'use client';

import { useCallback, useEffect, useState } from 'react';
import SimpleScheduleView from './SimpleScheduleView';
import { loadSchedule, ScheduleContent, ScheduleSummary } from '@/lib/scheduleData';

interface ScheduleLoaderProps {
  schedule: ScheduleSummary;
  currentUser: string;
  onBack: () => void;
}

export default function ScheduleLoader({ schedule, currentUser, onBack }: ScheduleLoaderProps) {
  const [content, setContent] = useState<ScheduleContent | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    loadSchedule(schedule.id)
      .then(setContent)
      .catch(error => {
        console.error('Could not load schedule', error);
        setFailed(true);
      });
  }, [schedule.id]);

  useEffect(load, [load]);

  if (failed) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm text-gray-600">
        <p>This schedule couldn’t be loaded.</p>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">Try again</button>
          <button onClick={onBack} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">Back to schedules</button>
        </div>
      </div>
    );
  }

  // Outline of the schedule layout while it loads, so the page doesn't jump
  if (!content) {
    return (
      <div className="h-full w-full flex flex-col animate-pulse" aria-label="Loading schedule">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gray-200" />
          <div className="h-5 w-44 rounded bg-gray-200" />
          <div className="ml-6 h-8 w-32 rounded-lg bg-gray-100" />
          <div className="ml-auto flex gap-3">
            <div className="h-9 w-28 rounded-lg bg-gray-100" />
            <div className="h-9 w-28 rounded-lg bg-gray-100" />
            <div className="h-9 w-72 rounded-lg bg-gray-100" />
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[230px] flex-shrink-0 bg-white border-r border-gray-200 p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-gray-200 mb-4" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-8 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="flex-1 min-w-0 bg-white p-4 space-y-3">
            <div className="h-8 rounded bg-gray-100" />
            {Array.from({ length: 5 }, (_, row) => (
              <div key={row} className="h-28 rounded border border-gray-100 p-2 space-y-1.5">
                <div className="h-5 rounded bg-gray-100" style={{ width: `${70 - row * 8}%` }} />
                <div className="h-5 rounded bg-gray-100" style={{ width: `${45 + row * 6}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SimpleScheduleView
      scheduleId={schedule.id}
      scheduleName={schedule.name}
      scheduleLogoUrl={schedule.logoUrl ?? undefined}
      role={schedule.role}
      currentUser={currentUser}
      events={content.events}
      campaigns={content.campaigns}
      people={content.people}
      customEventTypes={content.customEventTypes}
      onBack={onBack}
    />
  );
}
