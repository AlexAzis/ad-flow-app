'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Unlock, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Campaign } from '@/lib/types';
import { campaignColors } from '@/lib/colorUtils';
import DuplicateCampaignModal from './DuplicateCampaignModal';
import type { DuplicateCampaignDetails } from './DuplicateCampaignModal';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCampaign: (id: string, updatedCampaign: Omit<Campaign, 'id'>) => void;
  onDeleteCampaign?: (id: string) => void;
  onDuplicateCampaign?: (campaignId: string, details: DuplicateCampaignDetails) => void;
  campaign: Campaign | null;
  currentUser?: string;
  allCampaigns?: Campaign[];
}

export default function EditCampaignModal({
  isOpen,
  onClose,
  onUpdateCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  campaign,
  currentUser = '',
  allCampaigns = [],
}: EditCampaignModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Populate form when campaign changes
  useEffect(() => {
    if (campaign && isOpen) {
      setName(campaign.name);
      setClient(campaign.client);
      setColor(campaign.color);
      setLogoUrl(campaign.logoUrl || '');
      setIsLocked(campaign.locked || false);
      setLockedBy(campaign.lockedBy || '');
    }
  }, [campaign, isOpen]);

  // Store the logo as a small data URL so it saves with the campaign and
  // always renders in exports without cross-origin issues
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIDE = 96;
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setLogoUrl(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaign) return;

    const updatedCampaign: Omit<Campaign, 'id'> = {
      name,
      client,
      color,
      logoUrl: logoUrl || undefined,
      locked: isLocked,
      lockedBy: isLocked ? (lockedBy || currentUser) : undefined,
    };

    onUpdateCampaign(campaign.id, updatedCampaign);
    onClose();
  };

  const handleDelete = () => {
    if (!campaign) return;
    if (confirm(`Delete "${campaign.name}" and all its events? This cannot be undone.`)) {
      if (onDeleteCampaign) {
        onDeleteCampaign(campaign.id);
      }
      onClose();
    }
  };

  // Only the person who locked a campaign can unlock it
  const canUnlock = !campaign?.locked || !campaign.lockedBy || campaign.lockedBy === currentUser;

  const handleLockToggle = () => {
    if (isLocked && !canUnlock) return;
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
    <>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              disabled={isLocked}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              disabled={isLocked}
              required
            />
          </div>

          {/* Client Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Logo
            </label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Client logo"
                  className="h-12 w-12 rounded-lg object-contain bg-white border border-gray-200"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                  <ImageIcon size={18} className="text-gray-400" />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFile}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isLocked}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoUrl ? 'Change logo' : 'Upload logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  disabled={isLocked}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-50"
                  title="Remove logo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Color
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
                    disabled={isLocked}
                    className={`relative w-10 h-10 rounded-full transition-transform enabled:hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                {isLocked && (
                  <div className="text-xs text-gray-500">
                    {canUnlock ? 'Unlock to make changes.' : `Only ${lockedBy} can unlock this campaign.`}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLockToggle}
              disabled={isLocked && !canUnlock}
              className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
          <div className="grid grid-cols-2 gap-3 pt-4">
            {onDuplicateCampaign && (
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(true)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium whitespace-nowrap"
              >
                Duplicate and shift
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLocked}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
            >
              Delete Campaign
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap"
            >
              Update Campaign
            </button>
          </div>
        </form>
      </div>
    </div>

      <DuplicateCampaignModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        campaign={campaign}
        allCampaigns={allCampaigns}
        onDuplicate={(details) => {
          onDuplicateCampaign?.(campaign.id, details);
          setIsDuplicateModalOpen(false);
          onClose();
        }}
      />
    </>
  );
}
