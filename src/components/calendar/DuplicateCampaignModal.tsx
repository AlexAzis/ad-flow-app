'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Campaign } from '@/lib/types';
import { campaignColors } from '@/lib/colorUtils';

export interface DuplicateCampaignDetails {
  name: string;
  color: string;
  weeks: number;
}

interface DuplicateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  allCampaigns?: Campaign[];
  onDuplicate: (details: DuplicateCampaignDetails) => void;
}

export default function DuplicateCampaignModal({
  isOpen,
  onClose,
  campaign,
  allCampaigns = [],
  onDuplicate,
}: DuplicateCampaignModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [weeks, setWeeks] = useState('1');

  useEffect(() => {
    if (campaign && isOpen) {
      setName(`${campaign.name} copy`);
      setWeeks('1');
      const usedColors = new Set(allCampaigns.map(c => c.color));
      setColor(campaignColors.find(c => !usedColors.has(c)) || campaign.color);
    }
  }, [campaign, isOpen, allCampaigns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    const parsedWeeks = Number(weeks);
    if (!name.trim()) {
      alert('Please enter a name for the duplicated campaign.');
      return;
    }
    if (weeks.trim() === '' || !Number.isInteger(parsedWeeks)) {
      alert('Please enter a whole number of weeks to shift by.');
      return;
    }

    onDuplicate({ name: name.trim(), color, weeks: parsedWeeks });
    onClose();
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Duplicate and shift</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            Duplicating <span className="font-medium text-gray-800">{campaign.name}</span>
            {campaign.client ? ` for ${campaign.client}` : ''}
          </div>

          {/* New Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New campaign name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift by (weeks)
            </label>
            <input
              type="number"
              step={1}
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Negative numbers move the copied events earlier.
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign color
            </label>
            <div className="grid grid-cols-7 gap-2">
              {campaignColors.map((colorOption) => {
                const isUsedByOther = allCampaigns.some(
                  c => c.id !== campaign.id && c.color === colorOption
                );
                const isSelected = color === colorOption;
                return (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={`relative w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                      isSelected ? 'ring-2 ring-offset-2 ring-gray-800' : ''
                    }`}
                    style={{ backgroundColor: colorOption }}
                  >
                    {isUsedByOther && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <X size={20} className="text-red-600 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-gray-200"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500">Selected color</span>
            </div>
          </div>

          {/* Buttons */}
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
              Duplicate campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
