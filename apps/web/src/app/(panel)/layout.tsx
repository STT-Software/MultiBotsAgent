'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from '@/features/layout/hooks/use-session'
import { Shell } from '@/features/layout/components/shell'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session === null) {
      router.push('/login')
    }
  }, [session, router])

  if (session === null) {
    return null
  }

  return (
    <Shell
      empresaNombre={session.empresa.nombre}
      usuarioNombre={session.usuario.nombre}
    >
      {children}
    </Shell>
  )
}
