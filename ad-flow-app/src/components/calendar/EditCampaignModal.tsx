'use client';

import { useState, useEffect } from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import { Campaign } from '@/lib/types';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCampaign: (id: string, updatedCampaign: Omit<Campaign, 'id'>) => void;
  campaign: Campaign | null;
  currentUser?: string;
}

export default function EditCampaignModal({
  isOpen,
  onClose,
  onUpdateCampaign,
  campaign,
  currentUser = 'Alex Azis',
}: EditCampaignModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');

  // Populate form when campaign changes
  useEffect(() => {
    if (campaign && isOpen) {
      setName(campaign.name);
      setClient(campaign.client);
      setColor(campaign.color);
      setIsLocked(campaign.locked || false);
      setLockedBy(campaign.lockedBy || '');
    }
  }, [campaign, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaign) return;

    const updatedCampaign: Omit<Campaign, 'id'> = {
      name,
      client,
      color,
      locked: isLocked,
      lockedBy: isLocked ? (lockedBy || currentUser) : undefined,
    };

    onUpdateCampaign(campaign.id, updatedCampaign);
    onClose();
  };

  const handleLockToggle = () => {
    if (isLocked) {
      setIsLocked(false);
      setLockedBy('');
    } else {
      setIsLocked(true);
      setLockedBy(currentUser);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Edit Campaign</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Color
            </label>
            <div
              className="w-12 h-12 rounded-full border-2 border-gray-200"
              style={{ backgroundColor: color }}
            />
          </div>

          {/* Lock/Unlock Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isLocked ? (
                <Lock size={20} className="text-red-600" />
              ) : (
                <Unlock size={20} className="text-gray-400" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {isLocked ? 'Campaign Locked' : 'Campaign Unlocked'}
                </div>
                {isLocked && lockedBy && (
                  <div className="text-xs text-gray-600">
                    Locked by {lockedBy}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLockToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isLocked ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isLocked ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
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
              Update Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
