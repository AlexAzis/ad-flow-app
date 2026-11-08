'use client';

import { useState } from 'react';
import SimpleScheduleView from '@/components/calendar/SimpleScheduleView';
import SchedulesDashboard from '@/components/dashboard/SchedulesDashboard';
import { mockCampaigns, mockEvents, mockPeople } from '@/lib/mockData';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'schedule'>('dashboard');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {view === 'dashboard' ? (
          <SchedulesDashboard onOpenSchedule={() => setView('schedule')} />
        ) : (
          <SimpleScheduleView
            events={mockEvents}
            campaigns={mockCampaigns}
            people={mockPeople}
            onBack={() => setView('dashboard')}
          />
        )}
      </div>
    </div>
  );
}
