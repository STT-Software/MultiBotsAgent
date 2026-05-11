'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../constants/navigation'
import { NavItem } from './nav-item'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-gray-800 bg-gray-950 px-4 py-6">
      {/* Gradient glow — similar to auth layout */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.08), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Brand */}
      <div className="relative mb-10 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-emerald-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none text-white">
            MultiBotAgents
          </h1>
          <p className="mt-1 text-[11px] font-medium text-gray-500">
            Panel Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  )
}
