'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import LoginPage from '@/components/auth/LoginPage';
import UpdatePasswordPage from '@/components/auth/UpdatePasswordPage';
import ScheduleLoader from '@/components/calendar/ScheduleLoader';
import SchedulesDashboard from '@/components/dashboard/SchedulesDashboard';
import { supabase } from '@/lib/supabase';
import { ScheduleSummary } from '@/lib/scheduleData';

export default function Home() {
  // undefined while the saved session is being checked, null when signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [openSchedule, setOpenSchedule] = useState<ScheduleSummary | null>(null);
  // True while the user is in the password-reset flow from a recovery email
  const [isRecovery, setIsRecovery] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Auth links carry their payload in the URL. Check it directly rather than
    // relying only on the PASSWORD_RECOVERY event, which can fire before the
    // listener below is attached.
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const type = params.get('type') || hashParams.get('type');
    const errorCode = params.get('error_code') || hashParams.get('error_code');
    if (type === 'recovery') setIsRecovery(true);
    if (errorCode === 'otp_expired' || errorCode === 'access_denied' || params.get('error') || hashParams.get('error')) {
      setAuthError('That link is invalid or has expired — request a new one below.');
    }

    const update = (next: User | null) =>
      setUser(prev => (prev && next && prev.id === next.id ? prev : next));
    supabase.auth.getSession().then(({ data }) => update(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      update(session?.user ?? null);
      if (!session) {
        setOpenSchedule(null);
        setIsRecovery(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const email = user?.email ?? '';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {user === undefined ? null : isRecovery && user ? (
          <UpdatePasswordPage onDone={() => setIsRecovery(false)} />
        ) : user === null ? (
          <LoginPage notice={authError} />
        ) : openSchedule ? (
          <ScheduleLoader
            key={openSchedule.id}
            schedule={openSchedule}
            currentUser={email}
            onBack={() => setOpenSchedule(null)}
          />
        ) : (
          <SchedulesDashboard
            userId={user.id}
            email={email}
            onOpenSchedule={setOpenSchedule}
            onSignOut={() => supabase.auth.signOut()}
          />
        )}
      </div>
    </div>
  );
}
