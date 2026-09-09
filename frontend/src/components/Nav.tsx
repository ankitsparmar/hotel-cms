'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const ALL_ITEMS = [
  { href: '/calendar', label: 'Calendar', roles: ['owner', 'admin', 'front_desk', 'housekeeping', 'accountant'] },
  { href: '/reservations', label: 'Reservations', roles: ['owner', 'admin', 'front_desk'] },
  { href: '/rooms', label: 'Rooms', roles: ['owner', 'admin', 'front_desk', 'housekeeping'] },
  { href: '/room-types', label: 'Room Types', roles: ['owner', 'admin'] },
  { href: '/rate-plans', label: 'Rates', roles: ['owner', 'admin', 'front_desk'] },
  { href: '/housekeeping', label: 'Housekeeping', roles: ['owner', 'admin', 'housekeeping', 'front_desk'] },
  { href: '/reports', label: 'Reports', roles: ['owner', 'admin', 'accountant'] },
  { href: '/settings', label: 'Settings', roles: ['owner', 'admin'] },
];

export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;
  const items = ALL_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-10">
      <div className="bg-blue-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-7 w-7 rounded-sm bg-white text-blue-800 font-black text-sm">H</span>
              <span className="font-semibold text-white tracking-tight">Hotel CMS</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-blue-200 capitalize">{user.role.replace('_', ' ')}</div>
              </div>
              <button
                onClick={logout}
                className="text-sm text-white border border-blue-400/60 hover:bg-blue-700 rounded-sm px-3 py-1.5 font-medium transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="hidden md:flex items-center gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-blue-700 hover:border-blue-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto py-2">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-sm text-sm font-medium whitespace-nowrap ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
