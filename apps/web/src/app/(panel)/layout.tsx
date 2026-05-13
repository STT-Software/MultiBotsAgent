'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from '@/components/layout/hooks/use-session'
import { Shell } from '@/components/layout/components/shell'

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
      empresaLogo={session.empresa.logo}
      usuarioNombre={session.usuario.nombre}
    >
      {children}
    </Shell>
  )
}
