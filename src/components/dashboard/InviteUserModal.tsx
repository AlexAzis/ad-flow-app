'use client';

import DismissLayer, { closeOnBackdrop } from '@/components/common/DismissLayer';
import { useState } from 'react';
import { X, Mail, UserPlus } from 'lucide-react';
import { inviteNewUser } from '@/lib/scheduleData';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Onboards a brand-new customer: sends them an account invite email. They land
// on an empty dashboard and can create and own their own schedules.
export default function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  if (!isOpen) return null;

  const handleInvite = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setMessage(null);
    setIsBusy(true);
    try {
      const outcome = await inviteNewUser(normalized);
      if (outcome === 'emailed') {
        setMessage({ text: `Invite email sent to ${normalized}.`, ok: true });
        setEmail('');
      } else if (outcome === 'exists') {
        setMessage({ text: 'That email already has an account.', ok: false });
      } else {
        setMessage({ text: 'The invite couldn’t be sent. Please try again.', ok: false });
      }
    } catch (error) {
      console.error('Could not invite user', error);
      setMessage({ text: 'The invite couldn’t be sent. Please try again.', ok: false });
    } finally {
      setIsBusy(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={closeOnBackdrop(handleClose)}>
      <DismissLayer onClose={handleClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Invite a new user</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            They’ll get an email to create their account, then land on an empty
            dashboard where they can make their own schedules.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="their@email.com"
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={isBusy || !email.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <UserPlus size={16} />
              <span>{isBusy ? 'Sending…' : 'Invite'}</span>
            </button>
          </div>
          {message && (
            <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
