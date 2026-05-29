'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '../constants/navigation'
import { NavItem } from './nav-item'
import { FileText, HelpCircle, Plus, Bell, LogOut, Settings } from 'lucide-react'
import { BrandIcon } from '@/components/icons'
import { useInboxBadge } from '@/features/inbox/hooks/use-inbox-badge'
import { useSession } from '../hooks/use-session'
import { logout } from '@/lib/auth'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const inboxBadge = useInboxBadge()
  const { session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleLogout = useCallback(() => {
    logout()
  }, [])

  const handleGoToSettings = useCallback(() => {
    setMenuOpen(false)
    router.push('/settings')
  }, [router])

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
        <BrandIcon size="sm" />
        <div>
          <h1 className="text-sm font-bold leading-none">
            <span className="text-white">MultiBot</span>
            <span className="text-emerald-400">Agents</span>
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
            badge={item.href === '/inbox' ? inboxBadge : undefined}
          />
        ))}
      </nav>

      {/* Bottom links & User Profile */}
      <div className="relative mt-auto border-t border-[#3c4a41]/60 pt-4 flex flex-col gap-3">
        {/* User profile row */}
        <div className="relative flex items-center justify-between gap-2" ref={menuRef}>
          {/* User profile button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-1 items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-[#2f3731] min-w-0"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Menú de usuario"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#3c4a41] bg-[#2f3731] overflow-hidden">
              {session?.empresa.logo ? (
                <img
                  src={session.empresa.logo}
                  alt={`Logo de ${session.empresa.nombre}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[#dde5dc]">
                  {session?.empresa.nombre?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#dde5dc] leading-tight truncate">
                {session?.usuario.nombre ?? 'Cargando...'}
              </p>
              <p className="text-[10px] text-[#bbcabe] leading-tight truncate">
                {session?.empresa.nombre ?? 'Mi Empresa'}
              </p>
            </div>
          </button>

          {/* Notifications Bell */}
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#bbcabe] opacity-80 hover:opacity-100 hover:bg-[#2f3731] hover:text-emerald-400 transition-all shrink-0"
            aria-label="Notificaciones"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          {/* Upwards Dropdown Menu */}
          {menuOpen && (
            <div
              className="absolute left-0 bottom-full mb-2 w-full rounded-lg border border-[#3c4a41] bg-[#1a2420] shadow-xl shadow-black/40 z-50 py-1"
              role="menu"
              aria-label="Opciones de usuario"
            >
              <div className="border-b border-[#3c4a41] px-3 py-2.5 flex items-center gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#3c4a41] bg-[#2f3731] overflow-hidden">
                  {session?.empresa.logo ? (
                    <img
                      src={session.empresa.logo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-[#dde5dc]">
                      {session?.empresa.nombre?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#dde5dc] truncate">
                    {session?.usuario.nombre}
                  </p>
                  <p className="text-[10px] text-[#bbcabe] truncate">
                    {session?.usuario.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoToSettings}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#dde5dc] transition-colors hover:bg-[#2f3731]"
                role="menuitem"
              >
                <Settings className="h-3.5 w-3.5 text-[#bbcabe]" strokeWidth={1.5} />
                Configuración
              </button>

              <div className="border-t border-[#3c4a41] my-1" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 transition-colors hover:bg-[#2f3731]"
                role="menuitem"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-[#3c4a41]/40 my-1" />

        {/* Docs & Soporte - side by side to save space */}
        <div className="grid grid-cols-2 gap-2">
          <a href="#" className="flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-[#bbcabe] transition-colors hover:bg-[#2f3731] hover:text-[#dde5dc] border border-[#3c4a41]/30">
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            Docs
          </a>
          <a href="#" className="flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-[#bbcabe] transition-colors hover:bg-[#2f3731] hover:text-[#dde5dc] border border-[#3c4a41]/30">
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            Soporte
          </a>
        </div>
      </div>
    </aside>
  )
}
