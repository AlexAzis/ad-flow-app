'use client';

import { Plus, Users, MoreVertical, ShieldCheck } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  color: string;
}

interface SchedulesDashboardProps {
  onOpenSchedule: (scheduleId: string) => void;
}

export default function SchedulesDashboard({ onOpenSchedule }: SchedulesDashboardProps) {
  const schedules: Schedule[] = [
    {
      id: '1',
      name: 'Sky - TV Products',
      memberCount: 6,
      color: '#E91E63',
    },
  ];

  return (
    <div className="h-full flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-gray-900 tracking-wide">ARGUS</span>
        </div>

        {/* New Schedule Button */}
        <div className="p-4">
          <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 text-sm font-medium">
            <Plus size={16} />
            <span>New Schedule</span>
          </button>
        </div>

        {/* Your Schedules */}
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-gray-400 tracking-wider mb-2">
            YOUR SCHEDULES
          </div>
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => onOpenSchedule(schedule.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 text-left"
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: schedule.color }}
              >
                <span className="text-white text-[10px] font-bold">S</span>
              </div>
              <span className="text-sm text-gray-800 font-medium truncate">
                {schedule.name}
              </span>
              <span className="w-2 h-2 rounded-full bg-red-500 ml-auto flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">Schedules</h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium">
              <Plus size={16} />
              <span>Create New Schedule</span>
            </button>
            <div className="flex items-center gap-2 border border-gray-300 rounded-full pl-1 pr-3 py-1">
              <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <span className="text-sm text-gray-700">alexander.azis</span>
            </div>
          </div>
        </div>

        {/* Schedule Cards */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {schedules.map((schedule) => (
              <button
                key={schedule.id}
                onClick={() => onOpenSchedule(schedule.id)}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow h-40 flex flex-col"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: schedule.color }}
                  >
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                      <ShieldCheck size={11} />
                      Owner
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="font-semibold text-gray-900">{schedule.name}</div>
                <div className="text-sm text-gray-500">
                  {schedule.description || 'No description'}
                </div>

                {/* Card Footer */}
                <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={13} />
                  <span>{schedule.memberCount} members</span>
                  <span className="w-2 h-2 rounded-full bg-red-500 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
