'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import MembersPanel from '@/components/common/MembersPanel';
import { scheduleColor } from '@/lib/colorUtils';
import {
  removeScheduleLogo,
  ScheduleSummary,
  updateScheduleDetails,
  uploadScheduleLogo,
} from '@/lib/scheduleData';

interface ScheduleSettingsModalProps {
  schedule: ScheduleSummary;
  currentUser: string;
  onClose: () => void;
  onChanged: () => void;
}

// Per-schedule settings: company logo, name/description and member access.
// Editing is owner-only; editors and viewers see everything read-only.
export default function ScheduleSettingsModal({
  schedule,
  currentUser,
  onClose,
  onChanged,
}: ScheduleSettingsModalProps) {
  const canEdit = schedule.role === 'owner';
  const [name, setName] = useState(schedule.name);
  const [description, setDescription] = useState(schedule.description ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const pickLogo = (file: File | null) => {
    setLogoFile(file);
    setLogoRemoved(false);
    setLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const shownLogo = logoPreview ?? (logoRemoved ? null : schedule.logoUrl);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    setIsBusy(true);
    try {
      if (trimmed !== schedule.name || description !== (schedule.description ?? '')) {
        await updateScheduleDetails(schedule.id, { name: trimmed, description: description.trim() || null });
      }
      if (logoFile) {
        await uploadScheduleLogo(schedule.id, logoFile);
      } else if (logoRemoved && schedule.logoUrl) {
        await removeScheduleLogo(schedule.id);
      }
      onChanged();
      onClose();
    } catch (err) {
      console.error('Could not save schedule settings', err);
      setError('Those changes couldn’t be saved. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Schedule settings</h2>
            <p className="text-xs text-gray-500">{schedule.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Logo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Company logo</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                {shownLogo ? (
                  <img src={shownLogo} alt="Schedule logo" className="w-full h-full object-contain" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: scheduleColor(schedule.id) }}
                  >
                    <span className="text-white font-bold">{name.charAt(0).toUpperCase() || schedule.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {shownLogo ? 'Change logo' : 'Upload logo'}
                  </button>
                  {shownLogo && (
                    <button
                      onClick={() => {
                        pickLogo(null);
                        setLogoRemoved(true);
                      }}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => pickLogo(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Shown on the schedule card instead of the coloured letter.</p>
          </div>

          {/* Name & description */}
          <div className="space-y-3">
            <div>
              <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700 mb-1">
                Schedule name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="settings-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                id="settings-description"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={!canEdit}
                placeholder="No description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            {!canEdit && (
              <p className="text-xs text-gray-500">Only the schedule owner can change these settings.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Members */}
          <div className="pt-4 border-t border-gray-200">
            <MembersPanel scheduleId={schedule.id} role={schedule.role} currentUser={currentUser} />
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isBusy || !name.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
            >
              {isBusy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
