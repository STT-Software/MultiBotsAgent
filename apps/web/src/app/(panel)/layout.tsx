'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from '@/components/layout/hooks/use-session'
import { Shell } from '@/components/layout/components/shell'
import { NotificationsProvider } from '@/features/notifications'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()

  // Redirige a login solo cuando el refresh terminó y no hay sesión
  useEffect(() => {
    if (!loading && session === null) {
      router.replace('/login')
    }
  }, [session, loading, router])

  // Mientras se recupera la sesión (refresh en curso), mostrar spinner
  if (loading || session === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <NotificationsProvider>
      <Shell
        empresaNombre={session.empresa.nombre}
        empresaLogo={session.empresa.logo}
        usuarioNombre={session.usuario.nombre}
      >
        {children}
      </Shell>
    </NotificationsProvider>
  )
}
