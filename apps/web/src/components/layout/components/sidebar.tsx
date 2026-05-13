'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../constants/navigation'
import { NavItem } from './nav-item'
import { FileText, HelpCircle, Plus } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-[#3c4a41] bg-[#0e1510] px-4 py-6">
      {/* Gradient glow top */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 187, 122, 0.08), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Brand */}
      <div className="relative mb-10 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3c4a41] bg-[#242c27] text-[#00bb7a]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none text-[#dde5dc]">
            MultiBotAgents
          </h1>
          <p className="mt-1 font-mono text-[11px] font-medium text-[#bbcabe]">
            Panel Admin
          </p>
        </div>
      </div>

      {/* New Project button */}
      <button className="relative mb-10 w-full rounded-lg bg-[#00bb7a] py-3 text-sm font-semibold text-[#004329] flex items-center justify-center gap-2 transition-colors duration-200 hover:bg-[#49df9a]">
        <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
        Nuevo Proyecto
      </button>

      {/* Navigation */}
      <nav className="relative flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Bottom links */}
      <div className="relative mt-auto border-t border-[#3c4a41] pt-4 flex flex-col gap-1">
        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-[#bbcabe] transition-colors hover:bg-[#2f3731] hover:text-[#dde5dc]">
          <FileText className="h-[18px] w-[18px]" strokeWidth={1.5} />
          Docs
        </a>
        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-[#bbcabe] transition-colors hover:bg-[#2f3731] hover:text-[#dde5dc]">
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
          Soporte
        </a>
      </div>
    </aside>
  )
}
