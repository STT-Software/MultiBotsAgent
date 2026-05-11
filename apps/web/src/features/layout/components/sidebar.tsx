'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../constants/navigation'
import { NavItem } from './nav-item'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 border-r border-[#3c4a41] bg-[#0e1510] flex flex-col py-6 px-4 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-12 px-2">
        <div className="w-8 h-8 rounded-lg bg-[#242c27] flex items-center justify-center text-[#49df9a] border border-[#3c4a41]">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="font-[Geist] text-[16px] font-bold text-[#dde5dc] leading-none">
            MultiBotAgents
          </h1>
          <p className="font-[JetBrains_Mono] text-[11px] text-[#bbcabe] mt-1">
            Panel Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
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
