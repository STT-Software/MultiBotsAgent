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
    <div className="flex h-screen overflow-hidden font-[Inter] bg-[#0a0a0a]">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main className="flex-1 ml-[260px] flex flex-col h-screen overflow-y-auto">
        <Header empresaNombre={empresaNombre} usuarioNombre={usuarioNombre} />

        {/* Canvas content */}
        <div className="p-6 max-w-[1440px] mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
