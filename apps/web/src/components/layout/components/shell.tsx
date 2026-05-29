'use client'

import { Sidebar } from './sidebar'

interface ShellProps {
  children: React.ReactNode
  empresaNombre: string
  empresaLogo?: string | null
  usuarioNombre: string
}

export function Shell({ children, empresaNombre: _empresaNombre, empresaLogo: _empresaLogo, usuarioNombre: _usuarioNombre }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0e1510]">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main className="ml-[260px] flex flex-1 flex-col h-screen overflow-y-auto bg-[#0a0a0a]">
        {/* Canvas content */}
        <div className="mx-auto w-full max-w-[1440px] flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

