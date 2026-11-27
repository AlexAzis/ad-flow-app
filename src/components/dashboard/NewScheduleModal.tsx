'use client';

import { useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { createSchedule, uploadScheduleLogo } from '@/lib/scheduleData';

interface NewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// Creates a schedule; an optional company logo can be picked up front and is
// uploaded straight after creation so it shows on the dashboard card.
export default function NewScheduleModal({ isOpen, onClose, onCreated }: NewScheduleModalProps) {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const pickLogo = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleClose = () => {
    setName('');
    pickLogo(null);
    setError('');
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    setIsBusy(true);
    try {
      const id = await createSchedule(trimmed);
      if (logoFile) {
        try {
          await uploadScheduleLogo(id, logoFile);
        } catch (uploadError) {
          // The schedule exists — the logo can be added later from settings
          console.warn('Schedule created but logo upload failed', uploadError);
        }
      }
      onCreated();
      handleClose();
    } catch (err) {
      console.error('Could not create schedule', err);
      setError('Sorry, the schedule couldn’t be created. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">New schedule</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="schedule-name" className="block text-sm font-medium text-gray-700 mb-1">
              Schedule name
            </label>
            <input
              id="schedule-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Q1 TV Products"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Company logo <span className="text-gray-400 font-normal">(optional)</span>
            </span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                ) : (
                  <ImagePlus size={18} className="text-gray-300" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInput.current?.click()}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  {logoFile ? 'Change logo' : 'Upload logo'}
                </button>
                {logoFile && (
                  <button
                    onClick={() => pickLogo(null)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
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

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isBusy || !name.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
          >
            {isBusy ? 'Creating…' : 'Create schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
