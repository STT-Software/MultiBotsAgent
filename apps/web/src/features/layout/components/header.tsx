'use client'

import { LogOut, Bell, LayoutGrid, Search } from 'lucide-react'

interface HeaderProps {
  empresaNombre: string
  usuarioNombre: string
}

export function Header({ empresaNombre: _empresaNombre, usuarioNombre }: HeaderProps) {
  function handleLogout() {
    console.log('logout')
  }

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-[#0e1510]/80 backdrop-blur-md border-b border-[#3c4a41] flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 flex items-center max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbcabe] h-5 w-5" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-[#242c27] border border-[#3c4a41] text-[#dde5dc] text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-[#49df9a] focus:border-[#49df9a] placeholder-[#bbcabe]/50 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="text-[#bbcabe] opacity-80 hover:opacity-100 hover:text-[#49df9a] transition-colors">
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button className="text-[#bbcabe] opacity-80 hover:opacity-100 hover:text-[#49df9a] transition-colors">
          <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#2f3731] border border-[#3c4a41] overflow-hidden ml-2 flex items-center justify-center text-xs font-medium text-[#dde5dc]">
          {usuarioNombre.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="text-[#bbcabe] opacity-80 hover:opacity-100 hover:text-[#49df9a] transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
