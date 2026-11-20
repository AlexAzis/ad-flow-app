'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Event, Campaign, Person } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { eventTypesByStage } from '@/lib/eventTypes';
import { getEventTitles, joinEventTitles } from '@/lib/eventTitles';
import CampaignSelect from './CampaignSelect';
import { getStageColor } from '@/lib/colorUtils';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (id: string, updatedEvent: Omit<Event, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  event: Event | null;
  campaigns: Campaign[];
  people: Person[];
  customEventTypes?: Record<string, string[]>;
  onAddPerson?: (name: string) => Person;
  onManageEvents?: () => void;
}

export default function EditEventModal({
  isOpen,
  onClose,
  onUpdateEvent,
  onDeleteEvent,
  event,
  campaigns,
  people,
  customEventTypes,
  onAddPerson,
  onManageEvents,
}: EditEventModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [stage, setStage] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventTitles, setEventTitles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [personName, setPersonName] = useState('');

  // Populate form when event changes
  useEffect(() => {
    if (event && isOpen) {
      setStartDate(format(event.startDate, 'yyyy-MM-dd'));
      setEndDate(format(event.endDate, 'yyyy-MM-dd'));
      setCampaignId(event.campaignId);
      setStage(event.stage);
      setEventTitle(event.title);
      setEventTitles(getEventTitles(event));
      setNotes(event.notes || '');
      // Convert assignee IDs back to names for display
      const ids = event.assignees?.length ? event.assignees : (event.assignee ? [event.assignee] : []);
      setPersonName(ids.map(id => people.find(p => p.id === id)?.name || '').filter(Boolean).join(', '));
    }
  }, [event, isOpen, people]);

  // Drop selected titles if Manage Events removes them for the current stage
  useEffect(() => {
    if (stage === 'Misc') return;
    const allowed = new Set(customEventTypes?.[stage] || eventTypesByStage[stage] || []);
    setEventTitles(prev => {
      const next = prev.filter(title => allowed.has(title));
      return next.length === prev.length ? prev : next;
    });
  }, [stage, customEventTypes]);

  const filteredPeople = people;
  const stageTitles = (customEventTypes?.[stage] || eventTypesByStage[stage] || [])
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const pillClass = (selected: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      selected
        ? 'bg-gray-800 text-white border-gray-800'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
    }`;

  const toggleEventTitle = (title: string) => {
    setEventTitles(prev => {
      if (prev.includes(title)) return prev.filter(t => t !== title);
      return [...prev, title].sort((a, b) => a.localeCompare(b));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;
    const isMisc = !!event.isMisc;
    if ((!isMisc && !campaignId) || (isMisc ? !eventTitle : eventTitles.length === 0)) {
      alert(isMisc ? 'Please enter a name' : 'Please select a campaign and event');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    const eventColor = isMisc ? '#E5E5E5' : (campaign ? getStageColor(campaign.color, stage) : '#999999');

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
      title: isMisc ? eventTitle : joinEventTitles(eventTitles),
      titles: !isMisc && eventTitles.length > 1 ? eventTitles : undefined,
      campaignId,
      stage: isMisc ? 'Misc' : stage,
      startDate: parseISO(startDate),
      endDate: parseISO(endDate),
      assignee: assigneeIds[0],
      assignees: assigneeIds.length ? assigneeIds : undefined,
      notes: notes || undefined,
      color: eventColor,
      isMisc: isMisc || undefined,
    };

    onUpdateEvent(event.id, updatedEvent);
    onClose();
  };

  const handleDelete = () => {
    if (!event) return;
    onDeleteEvent(event.id);
    onClose();
  };

  if (!isOpen || !event) return null;
  const isMisc = !!event.isMisc;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{isMisc ? 'Edit Misc Event' : 'Edit Event'}</h2>
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

          {/* Misc events have no stage - just a name, with an optional campaign link */}
          {isMisc && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (e.g. Holiday, Bank Holiday)
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocate to campaign? (optional)
                </label>
                <CampaignSelect
                  campaigns={campaigns}
                  value={campaignId}
                  onChange={setCampaignId}
                  clearable
                  placeholder="No campaign"
                  clearLabel="No campaign"
                />
              </div>
            </>
          )}

          {!isMisc && (<>
          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <CampaignSelect campaigns={campaigns} value={campaignId} onChange={setCampaignId} />
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
                setEventTitle('');
                setEventTitles([]);
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

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Events
              </label>
              {onManageEvents && (
                <button
                  type="button"
                  onClick={onManageEvents}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Manage events
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {stageTitles.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => toggleEventTitle(title)}
                  className={pillClass(eventTitles.includes(title))}
                >
                  {title}
                </button>
              ))}
            </div>
            {eventTitles.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {joinEventTitles(eventTitles)}
              </p>
            )}
          </div>
          </>)}

          {/* Person */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person (optional)
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Type names, separated by commas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
