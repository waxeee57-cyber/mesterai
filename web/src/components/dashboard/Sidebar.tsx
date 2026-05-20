'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Főoldal', exact: true },
  { href: '/dashboard/jobs', icon: '🔨', label: 'Munkák', exact: false },
  { href: '/dashboard/clients', icon: '👥', label: 'Ügyfelek', exact: false },
  { href: '/dashboard/invoices', icon: '📄', label: 'Számlák', exact: false },
  { href: '/dashboard/calendar', icon: '📅', label: 'Naptár', exact: false },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Beállítások', exact: false },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col shrink-0 min-h-screen">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
        <span className="font-bold text-base">MesterAI</span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-accent bg-accent/10 font-semibold'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-[#525252] mb-2 truncate">{email}</p>
        <LogoutButton />
      </div>
    </aside>
  );
}
