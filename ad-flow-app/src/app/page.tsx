'use client';

import Navigation from '@/components/layout/Navigation';
import Sidebar from '@/components/layout/Sidebar';
import ScheduleView from '@/components/dashboard/ScheduleView';
import { mockCampaigns, mockEvents, mockStages, mockPeople } from '@/lib/mockData';

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          campaigns={mockCampaigns}
          stages={mockStages}
          people={mockPeople}
        />
        <ScheduleView
          events={mockEvents}
          campaigns={mockCampaigns}
          people={mockPeople}
        />
      </div>
    </div>
  );
}
