'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'super_admin') router.replace('/calendar');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'super_admin') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-950">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-7 w-7 rounded-sm bg-white text-blue-950 font-black text-sm">H</span>
            <span className="font-semibold text-white tracking-tight">Hotel CMS</span>
            <span className="ml-2 text-xs uppercase tracking-wide text-blue-300 border border-blue-700 rounded-full px-2 py-0.5">
              Platform Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200 hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-white border border-blue-700 hover:bg-blue-900 rounded-sm px-3 py-1.5 font-medium transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
