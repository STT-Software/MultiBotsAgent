'use client'

import { useEffect, useState } from 'react'
import { AuthStore, SessionCookie, refreshAccessToken, fetchWithAuth } from '@/lib/auth'
import type { Session } from '../types/layout.types'

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Solo para uso en el frontend (la verificación se hace en el backend).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Construye un objeto Session a partir de los claims del JWT.
 */
function buildSessionFromToken(token: string, logo?: string | null): Session | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const userId = payload.userId as string | undefined
  const companyId = payload.companyId as string | undefined
  const email = payload.email as string | undefined
  const companyName = (payload.companyName as string) || 'Mi Empresa'
  const userName = email?.split('@')[0] || 'Usuario'

  if (!userId || !companyId || !email) return null

  return {
    empresa: {
      id: companyId,
      nombre: companyName,
      logo: logo ?? null,
    },
    usuario: {
      id: userId,
      nombre: userName,
      email,
    },
  }
}

export interface UseSessionResult {
  session: Session | null
  /** true mientras se intenta recuperar la sesión (refresh en curso) */
  loading: boolean
}

/**
 * Hook que obtiene la sesión del usuario a partir del access token JWT.
 * También carga el logo de la empresa desde el endpoint de perfil.
 * Si no hay token, intenta refresh. Si falla, retorna null (redirige a login).
 *
 * Retorna { session, loading } para que el layout pueda mostrar un spinner
 * mientras se intenta recuperar la sesión al recargar la página.
 */
export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(() => {
    const token = AuthStore.getToken()
    if (token) return buildSessionFromToken(token)
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    // Si ya hay token en memoria, no necesitamos cargar
    return !AuthStore.getToken()
  })

  useEffect(() => {
    // Si ya tenemos sesión (token estaba en memoria), no hacer nada
    if (session) {
      setLoading(false)
      return
    }

    async function tryRefresh() {
      setLoading(true)
      const success = await refreshAccessToken()
      if (success) {
        const token = AuthStore.getToken()
        if (token) {
          setSession(buildSessionFromToken(token))
        }
      } else {
        // Refresh falló — limpiar cookie de sesión para que el middleware
        // redirija correctamente en futuras navegaciones
        SessionCookie.clear()
      }
      setLoading(false)
    }

    tryRefresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch logo from profile endpoint (non-blocking)
  useEffect(() => {
    if (!session) return

    async function fetchLogo() {
      try {
        const res = await fetchWithAuth('/company-profile', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (data.logo) {
            setSession((prev) =>
              prev
                ? { ...prev, empresa: { ...prev.empresa, logo: data.logo } }
                : prev,
            )
          }
        }
      } catch {
        // Non-critical — logo just won't show
      }
    }

    fetchLogo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.empresa.id])

  return { session, loading }
}
