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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header empresaNombre={empresaNombre} usuarioNombre={usuarioNombre} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
