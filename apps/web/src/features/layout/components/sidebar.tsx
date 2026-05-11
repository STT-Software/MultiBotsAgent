'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../constants/navigation'
import { NavItem } from './nav-item'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-outline-variant bg-surface px-md py-lg">
      {/* Brand */}
      <div className="mb-xl flex items-center gap-sm px-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-primary">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-sm font-bold leading-none text-on-surface">
            MultiBotAgents
          </h1>
          <p className="mt-1 font-code text-[11px] text-on-surface-variant">
            Panel Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-xs">
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
