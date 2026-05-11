'use client'

import { LogOut } from 'lucide-react'

interface HeaderProps {
  empresaNombre: string
  usuarioNombre: string
}

export function Header({ empresaNombre, usuarioNombre }: HeaderProps) {
  function handleLogout() {
    console.log('logout')
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-background/80 px-lg backdrop-blur-md">
      <h2 className="font-display text-sm font-semibold text-on-surface">
        {empresaNombre}
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest text-xs font-medium text-on-surface">
          {usuarioNombre.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-on-surface-variant">{usuarioNombre}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-highest hover:text-primary"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
