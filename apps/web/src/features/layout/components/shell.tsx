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
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header empresaNombre={empresaNombre} usuarioNombre={usuarioNombre} />
        <main className="flex-1 overflow-y-auto p-lg">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
