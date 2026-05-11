'use client'

import { LogOut, Bell, Search, LayoutGrid } from 'lucide-react'

interface HeaderProps {
  empresaNombre: string
  usuarioNombre: string
}

export function Header({ empresaNombre: _empresaNombre, usuarioNombre }: HeaderProps) {
  function handleLogout() {
    console.log('logout')
  }

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
        <button className="text-[#bbcabe] opacity-80 transition-colors hover:opacity-100 hover:text-[#00bb7a]">
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button className="text-[#bbcabe] opacity-80 transition-colors hover:opacity-100 hover:text-[#00bb7a]">
          <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#3c4a41] bg-[#2f3731] text-xs font-bold text-[#dde5dc]">
          {usuarioNombre.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="text-[#bbcabe] opacity-80 transition-colors hover:opacity-100 hover:text-[#00bb7a]"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
