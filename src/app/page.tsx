'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import LoginPage from '@/components/auth/LoginPage';
import ScheduleLoader from '@/components/calendar/ScheduleLoader';
import SchedulesDashboard from '@/components/dashboard/SchedulesDashboard';
import { supabase } from '@/lib/supabase';
import { ScheduleSummary } from '@/lib/scheduleData';

export default function Home() {
  // undefined while the saved session is being checked, null when signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [openSchedule, setOpenSchedule] = useState<ScheduleSummary | null>(null);

  useEffect(() => {
    const update = (next: User | null) =>
      setUser(prev => (prev && next && prev.id === next.id ? prev : next));
    supabase.auth.getSession().then(({ data }) => update(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      update(session?.user ?? null);
      if (!session) setOpenSchedule(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const email = user?.email ?? '';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {user === undefined ? null : user === null ? (
          <LoginPage />
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
