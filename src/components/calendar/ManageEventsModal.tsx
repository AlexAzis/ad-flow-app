'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { eventTypesByStage } from '@/lib/eventTypes';

interface ManageEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customEvents: Record<string, string[]>;
  onUpdateCustomEvents: (customEvents: Record<string, string[]>) => void;
}

export default function ManageEventsModal({
  isOpen,
  onClose,
  customEvents,
  onUpdateCustomEvents,
}: ManageEventsModalProps) {
  const [selectedStage, setSelectedStage] = useState<string>('Creative Development');
  const [newEventName, setNewEventName] = useState('');

  // Get events for selected stage (custom or default)
  const getEventsForStage = (stage: string) => {
    return customEvents[stage] || eventTypesByStage[stage] || [];
  };

  const handleAddEvent = () => {
    if (!newEventName.trim()) return;

    const currentEvents = getEventsForStage(selectedStage);
    const updatedEvents = [...currentEvents, newEventName.trim()];
    onUpdateCustomEvents({
      ...customEvents,
      [selectedStage]: updatedEvents,
    });
    setNewEventName('');
  };

  const handleDeleteEvent = (eventName: string) => {
    const currentEvents = getEventsForStage(selectedStage);
    const updatedEvents = currentEvents.filter(e => e !== eventName);
    onUpdateCustomEvents({
      ...customEvents,
      [selectedStage]: updatedEvents,
    });
  };

  const handleClose = () => {
    setSelectedStage('Creative Development');
    setNewEventName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Manage Event Types</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Stage Sidebar */}
          <div className="w-48 border-r border-gray-200 bg-gray-50">
            <div className="p-2">
              {Object.keys(eventTypesByStage).map((stage) => (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-medium ${
                    selectedStage === stage
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {selectedStage} Events
              </h3>

              <div className="space-y-2">
                {getEventsForStage(selectedStage).map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-800">{event}</span>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Event */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
                  placeholder="Add new event type..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddEvent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
