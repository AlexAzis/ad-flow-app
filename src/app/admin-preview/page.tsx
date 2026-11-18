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
    {
      id: 'u6',
      email: 'mia.larsen@mediaco.com',
      createdAt: '2026-10-12T09:30:00Z',
      lastSignInAt: '2026-11-16T10:12:00Z',
      invitedAt: '2026-10-11T15:00:00Z',
      ownedSchedules: 0,
    },
    {
      id: 'u7',
      email: 'owen.kim@studiok.com',
      createdAt: '2026-10-30T16:45:00Z',
      lastSignInAt: '2026-11-10T11:22:00Z',
      invitedAt: '2026-10-29T08:15:00Z',
      ownedSchedules: 0,
    },
  ],
  schedules: [
    {
      id: 's1',
      name: 'Sky - TV Products',
      createdAt: '2026-09-02T09:20:00Z',
      ownerUserId: 'u1',
      ownerEmail: 'alexander.azis@example.com',
      editors: 3,
      viewers: 2,
      totalMembers: 6,
      members: [
        { userId: 'u1', email: 'alexander.azis@example.com', role: 'owner' },
        { userId: 'u4', email: 'priya.shah@studiok.com', role: 'editor' },
        { userId: 'u6', email: 'mia.larsen@mediaco.com', role: 'editor' },
        { userId: 'u7', email: 'owen.kim@studiok.com', role: 'viewer' },
      ],
      pendingInvites: [],
    },
    {
      id: 's2',
      name: 'Q4 Campaign Rollout',
      createdAt: '2026-10-11T14:15:00Z',
      ownerUserId: 'u2',
      ownerEmail: 'sarah.jenkins@mediaco.com',
      editors: 5,
      viewers: 8,
      totalMembers: 14,
      members: [
        { userId: 'u2', email: 'sarah.jenkins@mediaco.com', role: 'owner' },
        { userId: 'u6', email: 'mia.larsen@mediaco.com', role: 'editor' },
        { userId: 'u7', email: 'owen.kim@studiok.com', role: 'viewer' },
      ],
      pendingInvites: [
        { email: 'james.wu@mediaco.com', role: 'editor' },
        { email: 'l.farrell@mediaco.com', role: 'viewer' },
      ],
    },
    {
      id: 's3',
      name: 'Retail Launch Plan',
      createdAt: '2026-10-28T11:47:00Z',
      ownerUserId: 'u2',
      ownerEmail: 'sarah.jenkins@mediaco.com',
      editors: 1,
      viewers: 3,
      totalMembers: 5,
      members: [
        { userId: 'u2', email: 'sarah.jenkins@mediaco.com', role: 'owner' },
        { userId: 'u4', email: 'priya.shah@studiok.com', role: 'viewer' },
      ],
      pendingInvites: [{ email: 'a.khan@mediaco.com', role: 'editor' }],
    },
    {
      id: 's4',
      name: 'Brand Refresh 2027',
      createdAt: '2026-10-24T10:40:00Z',
      ownerUserId: 'u3',
      ownerEmail: 'tom.reeves@brandhouse.co.uk',
      editors: 2,
      viewers: 0,
      totalMembers: 3,
      members: [
        { userId: 'u3', email: 'tom.reeves@brandhouse.co.uk', role: 'owner' },
        { userId: 'u2', email: 'sarah.jenkins@mediaco.com', role: 'editor' },
      ],
      pendingInvites: [],
    },
    {
      id: 's5',
      name: 'Legacy Print Buys',
      createdAt: '2026-09-15T10:00:00Z',
      ownerUserId: null,
      ownerEmail: '',
      editors: 1,
      viewers: 1,
      totalMembers: 2,
      members: [
        { userId: 'u6', email: 'mia.larsen@mediaco.com', role: 'editor' },
        { userId: 'u7', email: 'owen.kim@studiok.com', role: 'viewer' },
      ],
      pendingInvites: [],
    },
  ],
};

export default function AdminPreviewPage() {
  return (
    <div className="h-screen bg-gray-100">
      <AdminOverviewModal isOpen data={SAMPLE} onClose={() => {}} currentUserEmail="alexander.azis@example.com" />
    </div>
  );
}
