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
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-emerald-800 tracking-tight">Hotel CMS</span>
            <nav className="hidden md:flex items-center gap-1">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-stone-800">{user.name}</div>
              <div className="text-xs text-stone-400 capitalize">{user.role.replace('_', ' ')}</div>
            </div>
            <button onClick={logout} className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-md px-3 py-1.5">
              Log out
            </button>
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mt-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                  active ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
