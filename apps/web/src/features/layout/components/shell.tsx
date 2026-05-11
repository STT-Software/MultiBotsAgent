'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

interface ShellProps {
  children: React.ReactNode
  empresaNombre: string
  usuarioNombre: string
}

export function Shell({ children, empresaNombre, usuarioNombre }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12]">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main className="ml-[260px] flex flex-1 flex-col h-screen overflow-y-auto">
        <Header empresaNombre={empresaNombre} usuarioNombre={usuarioNombre} />

        {/* Canvas content */}
        <div className="mx-auto w-full max-w-[1440px] flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
