'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Event, Campaign, Person } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { eventTypesByStage } from '@/lib/eventTypes';
import { joinEventTitles } from '@/lib/eventTitles';
import CampaignSelect from './CampaignSelect';
import { getStageColor } from '@/lib/colorUtils';
import { notify } from '@/components/common/Feedback';

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
  onManageEvents?: () => void;
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
  onManageEvents,
}: AddEventModalProps) {
  const [startDate, setStartDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [campaignId, setCampaignId] = useState('');
  const [stage, setStage] = useState('Creative Development');
  const [eventTitle, setEventTitle] = useState('');
  const [eventTitles, setEventTitles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [personName, setPersonName] = useState('');

  // Reset form when modal opens or selected date changes
  useEffect(() => {
    if (isOpen) {
      setStartDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndDate(format(selectedDate, 'yyyy-MM-dd'));
      setCampaignId('');
      setStage('Creative Development');
      setEventTitle('');
      setEventTitles([]);
      setNotes('');
      setPersonName('');
    }
  }, [isOpen, selectedDate]);

  // Drop selected titles if Manage Events removes them for the current stage
  useEffect(() => {
    if (stage === 'Misc') return;
    const allowed = new Set(customEventTypes?.[stage] || eventTypesByStage[stage] || []);
    setEventTitles(prev => {
      const next = prev.filter(title => allowed.has(title));
      return next.length === prev.length ? prev : next;
    });
  }, [stage, customEventTypes]);

  // Filter campaigns based on selected campaigns
  const availableCampaigns = selectedCampaigns.size > 0
    ? campaigns.filter(c => selectedCampaigns.has(c.id))
    : campaigns;

  // If only one campaign is available, auto-select it for regular stages
  useEffect(() => {
    if (isOpen && stage !== 'Misc' && availableCampaigns.length === 1 && !campaignId) {
      setCampaignId(availableCampaigns[0].id);
    }
  }, [isOpen, stage, availableCampaigns, campaignId]);

  // Misc campaign links are opt-in, so clear any auto-selected campaign when Misc is chosen
  useEffect(() => {
    if (stage === 'Misc') setCampaignId('');
  }, [stage]);

  // When campaign selected, prefill person field with its assigned people
  useEffect(() => {
    if (campaignId) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign?.people?.length) {
        const names = campaign.people
          .map(id => people.find(p => p.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        if (names) setPersonName(names);
      }
    }
  }, [campaignId, campaigns, people]);

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

    const isMisc = stage === 'Misc';
    if ((!isMisc && !campaignId) || (isMisc ? !eventTitle : eventTitles.length === 0)) {
      notify(isMisc ? 'Please enter a name' : 'Please select a campaign and event');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!isMisc && campaign?.locked) {
      notify(`"${campaign.name}" is locked${campaign.lockedBy ? ` by ${campaign.lockedBy}` : ''}. Unlock the campaign to make changes.`, 'info');
      return;
    }
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

    const newEvent: Omit<Event, 'id'> = {
      title: isMisc ? eventTitle : joinEventTitles(eventTitles),
      titles: !isMisc && eventTitles.length > 1 ? eventTitles : undefined,
      campaignId,
      stage,
      startDate: parseISO(startDate),
      endDate: parseISO(endDate),
      assignee: assigneeIds[0],
      assignees: assigneeIds.length ? assigneeIds : undefined,
      notes: notes || undefined,
      color: eventColor,
      isMisc,
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
          </div>

          {/* Campaign - optional link for Misc events */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {stage === 'Misc' ? 'Allocate to campaign? (optional)' : 'Campaign'}
            </label>
            <CampaignSelect
              campaigns={availableCampaigns}
              value={campaignId}
              onChange={setCampaignId}
              clearable={stage === 'Misc'}
              placeholder={stage === 'Misc' ? 'No campaign' : undefined}
              clearLabel="No campaign"
            />
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
                if (e.target.value === 'Misc') setPersonName(''); // Misc events don't inherit the campaign's people
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {Object.keys(eventTypesByStage).map((stageName) => (
                <option key={stageName} value={stageName}>
                  {stageName}
                </option>
              ))}
              <option value="Misc">Misc</option>
            </select>
          </div>

          {/* Events - pills for stages, free text for Misc */}
          <div>
            {stage === 'Misc' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event name (e.g. Holiday, Bank Holiday)
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Alex Holiday"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Events
                  </label>
                  {onManageEvents && (
                    <button
                      type="button"
                      onClick={onManageEvents}
                      className="text-xs font-medium text-gray-700 underline hover:text-gray-900"
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
              </>
            )}
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
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
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
