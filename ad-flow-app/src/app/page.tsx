// Test deployment
'use client';

import Navigation from '@/components/layout/Navigation';
import SimpleScheduleView from '@/components/calendar/SimpleScheduleView';
import { mockCampaigns, mockEvents, mockPeople } from '@/lib/mockData';

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 flex overflow-hidden">
        <SimpleScheduleView
          events={mockEvents}
          campaigns={mockCampaigns}
          people={mockPeople}
        />
      </div>
    </div>
  );
}
