'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, Search, Settings, User } from 'lucide-react'

interface HeaderProps {
  empresaNombre: string
  empresaLogo?: string | null
  usuarioNombre: string
}

export function Header({ empresaNombre, empresaLogo, usuarioNombre }: HeaderProps) {
  const router = useRouter()
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
    // Clear tokens/session
    document.cookie = 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    localStorage.removeItem('accessToken')
    localStorage.removeItem('session')
    router.push('/login')
  }, [router])

  const handleGoToProfile = useCallback(() => {
    setMenuOpen(false)
    router.push('/settings/profile')
  }, [router])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#3c4a41] bg-[#0e1510]/80 px-6 backdrop-blur-md">
      {/* Search */}
      <div className="flex flex-1 items-center max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#bbcabe]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-lg border border-[#3c4a41] bg-[#242c27] pl-10 pr-4 py-2 text-sm text-[#dde5dc] placeholder-[#bbcabe]/50 outline-none transition-all duration-200 focus:border-[#00bb7a] focus:ring-1 focus:ring-[#00bb7a]"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="text-[#bbcabe] opacity-80 transition-colors hover:opacity-100 hover:text-[#00bb7a]"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#2f3731]"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Menú de usuario"
          >
            {/* Avatar — circular logo or initial */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3c4a41] bg-[#2f3731] overflow-hidden">
              {empresaLogo ? (
                <img
                  src={empresaLogo}
                  alt={`Logo de ${empresaNombre}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[#dde5dc]">
                  {empresaNombre.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-[#dde5dc] leading-tight">{usuarioNombre}</p>
              <p className="text-[11px] text-[#bbcabe] leading-tight">{empresaNombre}</p>
            </div>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-[#3c4a41] bg-[#1a2420] shadow-xl shadow-black/30"
              role="menu"
              aria-label="Opciones de usuario"
            >
              <div className="border-b border-[#3c4a41] px-4 py-3 flex items-center gap-3">
                {/* Mini logo in dropdown */}
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#3c4a41] bg-[#2f3731] overflow-hidden">
                  {empresaLogo ? (
                    <img
                      src={empresaLogo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-[#dde5dc]">
                      {empresaNombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#dde5dc] truncate">{usuarioNombre}</p>
                  <p className="text-xs text-[#bbcabe] truncate">{empresaNombre}</p>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={handleGoToProfile}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#dde5dc] transition-colors hover:bg-[#2f3731]"
                  role="menuitem"
                >
                  <User className="h-4 w-4 text-[#bbcabe]" strokeWidth={1.5} />
                  Perfil de empresa
                </button>
                <button
                  disabled
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#bbcabe]/50 cursor-not-allowed"
                  role="menuitem"
                  aria-disabled="true"
                >
                  <Settings className="h-4 w-4 text-[#bbcabe]/50" strokeWidth={1.5} />
                  Configuración
                  <span className="ml-auto text-[10px] rounded bg-[#2f3731] px-1.5 py-0.5 text-[#bbcabe]">Próximamente</span>
                </button>
              </div>

              <div className="border-t border-[#3c4a41] py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-[#2f3731]"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
