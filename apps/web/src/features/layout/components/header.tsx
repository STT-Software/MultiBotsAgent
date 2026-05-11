'use client'

import { LogOut, Bell, Search } from 'lucide-react'

interface HeaderProps {
  empresaNombre: string
  usuarioNombre: string
}

export function Header({ empresaNombre, usuarioNombre }: HeaderProps) {
  function handleLogout() {
    console.log('logout')
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-6 backdrop-blur-md">
      {/* Search */}
      <div className="flex flex-1 items-center max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-lg border border-gray-700 bg-[#0d1117]/80 pl-10 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none backdrop-blur-sm transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="hidden text-xs text-gray-500 sm:block">{empresaNombre}</span>
        <button className="text-gray-400 transition-colors hover:text-emerald-400">
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-xs font-medium text-gray-200">
          {usuarioNombre.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 transition-colors hover:text-emerald-400"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
