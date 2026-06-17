'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

interface ShellProps {
  children: React.ReactNode
  empresaNombre: string
  empresaLogo?: string | null
  usuarioNombre: string
}

export function Shell({
  children,
  empresaNombre: _empresaNombre,
  empresaLogo: _empresaLogo,
  usuarioNombre: _usuarioNombre,
}: ShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isInbox = pathname?.startsWith('/inbox')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      container.style.setProperty('--mouse-x', `${x}px`)
      container.style.setProperty('--mouse-y', `${y}px`)
    }

    container.addEventListener('mousemove', handleMouseMove)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0e1510]">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main
        ref={containerRef}
        className={`ml-[260px] flex flex-1 flex-col h-screen relative overflow-x-hidden ${
          isInbox ? 'overflow-y-hidden' : 'overflow-y-auto'
        }`}
        style={{
          backgroundColor: '#050906',
          backgroundImage: `
            radial-gradient(circle 600px at var(--mouse-x, -9999px) var(--mouse-y, -9999px), rgba(0, 187, 122, 0.08), transparent 80%),
            radial-gradient(circle at 50% 0%, rgba(0, 187, 122, 0.12) 0%, transparent 65%),
            radial-gradient(circle at 100% 100%, rgba(0, 187, 122, 0.03) 0%, transparent 50%),
            radial-gradient(rgba(255, 255, 255, 0.015) 1.5px, transparent 1.5px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 28px 28px',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Animated ambient drifting lights */}
        <div
          className="absolute -top-[20%] -left-[20%] w-[60%] h-[60%] rounded-full filter blur-[120px] pointer-events-none opacity-20 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0, 187, 122, 0.3) 0%, transparent 70%)',
            animationDuration: '8s',
          }}
        />
        <div
          className="absolute -bottom-[20%] -right-[20%] w-[60%] h-[60%] rounded-full filter blur-[120px] pointer-events-none opacity-15 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0, 187, 122, 0.25) 0%, transparent 70%)',
            animationDuration: '12s',
            animationDelay: '2s',
          }}
        />

        {/* Canvas content */}
        <div className="mx-auto w-full max-w-[1440px] flex-1 p-6 relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
