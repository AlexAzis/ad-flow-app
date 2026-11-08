'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Event, Campaign, Person } from '@/lib/types';
import { format } from 'date-fns';
import { eventTypesByStage } from '@/lib/eventTypes';
import { getStageColor } from '@/lib/colorUtils';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (id: string, updatedEvent: Omit<Event, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  event: Event | null;
  campaigns: Campaign[];
  people: Person[];
  onAddPerson?: (name: string) => Person;
}

export default function EditEventModal({
  isOpen,
  onClose,
  onUpdateEvent,
  onDeleteEvent,
  event,
  campaigns,
  people,
  onAddPerson,
}: EditEventModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [stage, setStage] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [personName, setPersonName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Populate form when event changes
  useEffect(() => {
    if (event && isOpen) {
      setStartDate(format(event.startDate, 'yyyy-MM-dd'));
      setEndDate(format(event.endDate, 'yyyy-MM-dd'));
      setCampaignId(event.campaignId);
      setStage(event.stage);
      setEventTitle(event.title);
      setNotes(event.notes || '');
      // Convert assignee IDs back to names for display
      const ids = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
      setPersonName(ids.map(id => people.find(p => p.id === id)?.name || '').filter(Boolean).join(', '));
    }
  }, [event, isOpen, people]);

  // Filter people suggestions based on last typed name segment
  const lastSegment = personName.split(',').pop()?.trim() || '';
  const filteredPeople = lastSegment
    ? people.filter(p => p.name.toLowerCase().includes(lastSegment.toLowerCase()))
    : people;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event || !campaignId || !eventTitle) {
      alert('Please select a campaign and event');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    const eventColor = campaign ? getStageColor(campaign.color, stage) : '#999999';

    // Parse comma-separated names → find or create each person
    const assigneeIds = personName
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
      .map(name => {
        const existing = people.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing.id;
        return onAddPerson ? onAddPerson(name).id : name;
      });

    const updatedEvent: Omit<Event, 'id'> = {
      title: eventTitle,
      campaignId,
      stage,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assignee: assigneeIds[0],
      assignees: assigneeIds.length ? assigneeIds : undefined,
      notes: notes || undefined,
      color: eventColor,
    };

    onUpdateEvent(event.id, updatedEvent);
    onClose();
  };

  const handleDelete = () => {
    if (!event) return;

    if (confirm('Are you sure you want to delete this event?')) {
      onDeleteEvent(event.id);
      onClose();
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Edit Event</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setEventTitle(''); // Reset event when stage changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(eventTypesByStage).map((stageName) => (
                <option key={stageName} value={stageName}>
                  {stageName}
                </option>
              ))}
            </select>
          </div>

          {/* Event */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event
            </label>
            <select
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select event</option>
              {eventTypesByStage[stage]?.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          {/* Person */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person (optional)
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => {
                setPersonName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type names, separated by commas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showSuggestions && filteredPeople.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onMouseDown={() => {
                      // Replace the last comma segment with the selected name
                      const parts = personName.split(',');
                      parts[parts.length - 1] = ' ' + person.name;
                      setPersonName(parts.join(',').replace(/^,|,\s*$/, '').trim());
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {person.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Time, address, location..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
            >
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Update Event
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
