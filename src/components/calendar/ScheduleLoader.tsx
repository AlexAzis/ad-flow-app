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

  if (!content) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm text-gray-600">
        {failed ? (
          <>
            <p>This schedule couldn’t be loaded.</p>
            <div className="flex gap-2">
              <button onClick={load} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">Try again</button>
              <button onClick={onBack} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">Back to schedules</button>
            </div>
          </>
        ) : (
          <p>Loading schedule…</p>
        )}
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
