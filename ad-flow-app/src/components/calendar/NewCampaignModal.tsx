'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Campaign } from '@/lib/types';
import { campaignColors } from '@/lib/colorUtils';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  existingCampaigns: Campaign[];
}

export default function NewCampaignModal({
  isOpen,
  onClose,
  onAddCampaign,
  existingCampaigns,
}: NewCampaignModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('');
  const [peopleNames, setPeopleNames] = useState('');

  // Get colors that are already in use
  const usedColors = new Set(existingCampaigns.map(c => c.color));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !client || !color) {
      alert('Please fill in all fields');
      return;
    }

    // Pass people as names - converted to person IDs by the handler
    const newCampaign: Omit<Campaign, 'id'> = {
      name,
      client,
      color,
      people: peopleNames
        .split(',')
        .map(n => n.trim())
        .filter(Boolean),
    };

    onAddCampaign(newCampaign);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setClient('');
    setColor('');
    setPeopleNames('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">New Campaign</h2>
          <button
            onClick={handleClose}
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
              placeholder="e.g., Cinema Xmas ROI - 888481"
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
              placeholder="e.g., Sky"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* People */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              People (optional)
            </label>
            <input
              type="text"
              value={peopleNames}
              onChange={(e) => setPeopleNames(e.target.value)}
              placeholder="e.g., Alex, Kelly, Rob"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple names with commas</p>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {campaignColors.map((colorOption) => {
                const isUsed = usedColors.has(colorOption);
                return (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => !isUsed && setColor(colorOption)}
                    disabled={isUsed}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      color === colorOption
                        ? 'border-blue-500 scale-110'
                        : isUsed
                        ? 'border-red-300 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: colorOption }}
                    title={isUsed ? 'Color already in use' : 'Select this color'}
                  >
                    {isUsed && (
                      <div className="w-full h-full rounded-full bg-red-500/30 flex items-center justify-center">
                        <span className="text-red-600 font-bold text-sm">✕</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {color && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{color}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
