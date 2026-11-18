'use client';

import AdminOverviewModal from '@/components/dashboard/AdminOverviewModal';
import { AdminOverview } from '@/lib/scheduleData';

// Standalone preview of the admin overview with sample data, so the design can
// be reviewed before the admin-overview function is deployed. Nothing here is
// real - no auth, no API calls.
const SAMPLE: AdminOverview = {
  users: [
    {
      id: 'u1',
      email: 'alexander.azis@example.com',
      createdAt: '2026-09-02T09:14:00Z',
      lastSignInAt: '2026-11-18T08:40:00Z',
      invitedAt: null,
      ownedSchedules: 1,
    },
    {
      id: 'u2',
      email: 'sarah.jenkins@mediaco.com',
      createdAt: '2026-10-11T14:02:00Z',
      lastSignInAt: '2026-11-17T16:21:00Z',
      invitedAt: '2026-10-10T11:00:00Z',
      ownedSchedules: 2,
    },
    {
      id: 'u3',
      email: 'tom.reeves@brandhouse.co.uk',
      createdAt: '2026-10-24T10:33:00Z',
      lastSignInAt: '2026-11-12T09:05:00Z',
      invitedAt: '2026-10-23T15:41:00Z',
      ownedSchedules: 1,
    },
    {
      id: 'u4',
      email: 'priya.shah@studiok.com',
      createdAt: '2026-11-05T12:48:00Z',
      lastSignInAt: '2026-11-15T13:30:00Z',
      invitedAt: '2026-11-04T09:12:00Z',
      ownedSchedules: 0,
    },
    {
      id: 'u5',
      email: 'dan.cole@outdoorplus.com',
      createdAt: '2026-11-16T08:20:00Z',
      lastSignInAt: null,
      invitedAt: '2026-11-15T17:03:00Z',
      ownedSchedules: 0,
    },
  ],
  schedules: [
    {
      id: 's1',
      name: 'Sky - TV Products',
      createdAt: '2026-09-02T09:20:00Z',
      ownerEmail: 'alexander.azis@example.com',
      editors: 3,
      viewers: 2,
      totalMembers: 6,
      pendingInvites: [],
    },
    {
      id: 's2',
      name: 'Q4 Campaign Rollout',
      createdAt: '2026-10-11T14:15:00Z',
      ownerEmail: 'sarah.jenkins@mediaco.com',
      editors: 5,
      viewers: 8,
      totalMembers: 14,
      pendingInvites: [
        { email: 'james.wu@mediaco.com', role: 'editor' },
        { email: 'l.farrell@mediaco.com', role: 'viewer' },
      ],
    },
    {
      id: 's3',
      name: 'Retail Launch Plan',
      createdAt: '2026-10-28T11:47:00Z',
      ownerEmail: 'sarah.jenkins@mediaco.com',
      editors: 1,
      viewers: 3,
      totalMembers: 5,
      pendingInvites: [{ email: 'a.khan@mediaco.com', role: 'editor' }],
    },
    {
      id: 's4',
      name: 'Brand Refresh 2027',
      createdAt: '2026-10-24T10:40:00Z',
      ownerEmail: 'tom.reeves@brandhouse.co.uk',
      editors: 2,
      viewers: 0,
      totalMembers: 3,
      pendingInvites: [],
    },
  ],
};

export default function AdminPreviewPage() {
  return (
    <div className="h-screen bg-gray-100">
      <AdminOverviewModal isOpen data={SAMPLE} onClose={() => {}} />
    </div>
  );
}
