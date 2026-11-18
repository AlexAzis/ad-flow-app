'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'forgot' | 'sent';

export default function LoginPage({ notice }: { notice?: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email and password don’t match an account.'
          : signInError.message
      );
    }
    setIsSubmitting(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) {
      setError('The reset email couldn’t be sent. Please try again.');
    } else {
      setMode('sent');
    }
    setIsSubmitting(false);
  };

  const logo = (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">A</span>
      </div>
      <span className="font-bold text-gray-900 tracking-wide">ARGUS</span>
    </div>
  );

  if (mode === 'sent') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm mx-4 space-y-4">
          {logo}
          <h1 className="text-lg font-semibold text-gray-800">Check your email</h1>
          <p className="text-sm text-gray-600">
            If an account exists for {email}, a password reset link is on its way.
            Open it on this device to choose a new password.
          </p>
          <button
            onClick={() => setMode('signin')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <form onSubmit={handleResetRequest} className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm mx-4 space-y-4">
          {logo}
          <h1 className="text-lg font-semibold text-gray-800">Reset your password</h1>
          <p className="text-sm text-gray-600">
            Enter your account email and we’ll send you a reset link.
          </p>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm mx-4 space-y-4">
        {logo}
        <h1 className="text-lg font-semibold text-gray-800">Sign in</h1>
        {notice && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); }}
              className="text-xs text-gray-500 hover:text-gray-900 underline"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-gray-500">Accounts are by invitation only.</p>
      </form>
    </div>
  );
}
