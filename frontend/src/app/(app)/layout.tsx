'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { CurrencyProvider } from '@/lib/currency';
import { Nav } from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'super_admin') router.replace('/platform');
  }, [user, loading, router]);

  if (loading || !user || user.role === 'super_admin') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      </div>
    </CurrencyProvider>
  );
}
