'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Event, Campaign, Person } from '@/lib/types';
import { format, addDays } from 'date-fns';
import { eventTypesByStage } from '@/lib/eventTypes';
import { getStageColor } from '@/lib/colorUtils';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: Omit<Event, 'id'>) => void;
  selectedDate: Date;
  campaigns: Campaign[];
  people: Person[];
  selectedCampaigns: Set<string>;
  customEventTypes?: Record<string, string[]>;
  onAddPerson?: (name: string) => Person;
}

export default function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  selectedDate,
  campaigns,
  people,
  selectedCampaigns,
  customEventTypes,
  onAddPerson,
}: AddEventModalProps) {
  const [startDate, setStartDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [campaignId, setCampaignId] = useState('');
  const [stage, setStage] = useState('Creative Development');
  const [eventTitle, setEventTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [personName, setPersonName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reset form when modal opens or selected date changes
  useEffect(() => {
    if (isOpen) {
      setStartDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndDate(format(selectedDate, 'yyyy-MM-dd'));
      setCampaignId('');
      setStage('Creative Development');
      setEventTitle('');
      setNotes('');
      setPersonName('');
    }
  }, [isOpen, selectedDate]);

  // Filter campaigns based on selected campaigns
  const availableCampaigns = selectedCampaigns.size > 0
    ? campaigns.filter(c => selectedCampaigns.has(c.id))
    : campaigns;

  // If only one campaign is available, auto-select it
  useEffect(() => {
    if (isOpen && availableCampaigns.length === 1 && !campaignId) {
      setCampaignId(availableCampaigns[0].id);
    }
  }, [isOpen, availableCampaigns, campaignId]);

  // Filter people suggestions based on typed name
  const filteredPeople = personName
    ? people.filter(p => p.name.toLowerCase().includes(personName.toLowerCase()))
    : people;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId || !eventTitle) {
      alert('Please select a campaign and event');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    const eventColor = campaign ? getStageColor(campaign.color, stage) : '#999999';

    // Find or create person by name
    let assigneeId: string | undefined;
    if (personName.trim()) {
      const existing = people.find(p => p.name.toLowerCase() === personName.trim().toLowerCase());
      if (existing) {
        assigneeId = existing.id;
      } else if (onAddPerson) {
        assigneeId = onAddPerson(personName.trim()).id;
      }
    }

    const newEvent: Omit<Event, 'id'> = {
      title: eventTitle,
      campaignId,
      stage,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assignee: assigneeId,
      notes: notes || undefined,
      color: eventColor,
    };

    onAddEvent(newEvent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Add Event</h2>
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
              <option value="">Select campaign</option>
              {availableCampaigns.map((campaign) => (
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
              {(customEventTypes?.[stage] || eventTypesByStage[stage])?.map((event) => (
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
              placeholder="Type a name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showSuggestions && filteredPeople.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onMouseDown={() => {
                      setPersonName(person.name);
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
          <div className="flex justify-end gap-3 pt-4">
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
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
