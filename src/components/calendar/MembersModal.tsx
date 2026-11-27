'use client';

import DismissLayer, { closeOnBackdrop } from '@/components/common/DismissLayer';
import { X } from 'lucide-react';
import MembersPanel from '@/components/common/MembersPanel';
import { ScheduleRole } from '@/lib/scheduleData';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string;
  scheduleName: string;
  role: ScheduleRole;
  currentUser: string;
}

export default function MembersModal({
  isOpen,
  onClose,
  scheduleId,
  scheduleName,
  role,
  currentUser,
}: MembersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={closeOnBackdrop(onClose)}>
      <DismissLayer onClose={onClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Members</h2>
            <p className="text-xs text-gray-500">{scheduleName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <MembersPanel scheduleId={scheduleId} role={role} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}
