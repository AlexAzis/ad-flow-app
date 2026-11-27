'use client';

import { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { Campaign } from '@/lib/types';

interface CampaignSelectProps {
  campaigns: Campaign[];
  value: string;
  onChange: (campaignId: string) => void;
  clearable?: boolean;
  placeholder?: string;
  clearLabel?: string;
}

export default function CampaignSelect({ campaigns, value, onChange, clearable, placeholder, clearLabel }: CampaignSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = campaigns.find(c => c.id === value);

  const option = (campaign: Campaign) => (
    <span className="flex items-center gap-2 min-w-0">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: campaign.color }} />
      <span className="truncate">{campaign.name}</span>
      {campaign.locked && <Lock size={12} className="text-gray-500 flex-shrink-0" />}
    </span>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 flex items-center justify-between gap-2 text-left bg-white"
      >
        {selected ? option(selected) : <span className="text-gray-500">{placeholder ?? 'Select campaign'}</span>}
        <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
            {clearable && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                  value === '' ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span className="text-gray-500">{clearLabel ?? 'None'}</span>
              </button>
            )}
            {campaigns.map(campaign => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => {
                  onChange(campaign.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                  campaign.id === value ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                {option(campaign)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
