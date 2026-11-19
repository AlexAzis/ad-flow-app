'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UpdatePasswordPageProps {
  onDone: () => void;
  // True for invited users setting their first password rather than resetting.
  firstTime?: boolean;
}

// Shown when the user lands from a password-reset email (Supabase fires a
// PASSWORD_RECOVERY event with a live session) or accepts a schedule invite
// and needs to choose their first password. Saving sets the new password and
// they continue into the app already signed in.
export default function UpdatePasswordPage({ onDone, firstTime }: UpdatePasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password needs to be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords don’t match.');
      return;
    }
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      // Clears the invite flag so this screen isn't shown again
      data: { needs_password_setup: null },
    });
    setIsSubmitting(false);
    if (updateError) {
      setError('The password couldn’t be saved. The link may have expired — request a new one.');
      return;
    }
    onDone();
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-gray-900 tracking-wide">ARGUS</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-800">
          {firstTime ? 'Welcome to Argus' : 'Choose a new password'}
        </h1>
        {firstTime && (
          <p className="text-sm text-gray-600">Set a password for your account to continue.</p>
        )}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
