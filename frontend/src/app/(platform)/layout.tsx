'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/platform', label: 'Dashboard' },
  { href: '/platform/profile', label: 'Profile' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
            <Link href="/platform/profile" className="text-sm text-blue-200 hidden sm:inline hover:text-white">
              {user.name}
            </Link>
            <button
              onClick={logout}
              className="text-sm text-white border border-blue-700 hover:bg-blue-900 rounded-sm px-3 py-1.5 font-medium transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="bg-blue-900/95 border-b border-blue-800">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    active ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white hover:border-blue-400'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
