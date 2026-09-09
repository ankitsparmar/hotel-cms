'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === 'super_admin' ? '/platform' : '/calendar');
  }, [user, loading, router]);

  // Logged-in visitors bounce straight to their dashboard above. Everyone
  // else — the common case for "/" — gets the marketing page instead of an
  // immediate redirect to /login.
  if (loading || user) return null;
  return <LandingPage />;
}
