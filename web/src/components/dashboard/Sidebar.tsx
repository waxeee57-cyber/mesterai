'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Főoldal', exact: true },
  { href: '/dashboard/jobs', icon: '🔨', label: 'Munkák', exact: false },
  { href: '/dashboard/clients', icon: '👥', label: 'Ügyfelek', exact: false },
  { href: '/dashboard/invoices', icon: '📄', label: 'Számlák', exact: false },
  { href: '/dashboard/quotes', icon: '📋', label: 'Árajánlatok', exact: false },
  { href: '/dashboard/calendar', icon: '📅', label: 'Naptár', exact: false },
  { href: '/dashboard/revenue', icon: '💰', label: 'Bevétel', exact: false },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Beállítások', exact: false },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = () => setMobileOpen(false);

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
        <span className="font-bold text-base">MesterAI</span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                isActive
                  ? 'text-accent bg-accent/10 font-semibold'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-[#525252] mb-2 truncate">{email}</p>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-surface border border-border rounded-lg p-2.5 text-[#F5F5F5] hover:border-accent/50 transition-colors"
        aria-label="Menü megnyitása"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="2" rx="1"/>
          <rect y="9" width="20" height="2" rx="1"/>
          <rect y="15" width="20" height="2" rx="1"/>
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={close}
        />
      )}

      {/* Sidebar — desktop: static inline; mobile: overlay drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 bg-surface border-r border-border flex flex-col min-h-screen
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {navContent}
      </aside>
    </>
  );
}
