'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchAgentes } from '../services/dashboard.service'
import { AgentesSummary } from '../types/dashboard.types'

interface UseAgentesSummaryReturn {
  loading: boolean
  error: string | null
  data: AgentesSummary | null
  retry: () => void
}

export function useAgentesSummary(): UseAgentesSummaryReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AgentesSummary | null>(null)
  const abortRef = useRef(false)

  const loadData = useCallback(async (signal: { aborted: boolean }) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const agentes = await fetchAgentes()
      if (signal.aborted) return

      const activos = agentes.filter((a) => a.estado === 'activo').length
      const borradores = agentes.filter((a) => a.estado === 'borrador').length

      setData({
        total: agentes.length,
        activos,
        borradores,
      })
    } catch (err) {
      if (signal.aborted) return
      const message =
        err instanceof Error ? err.message : 'No pudimos cargar los datos'
      setError(message)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const signal = { aborted: false }
    loadData(signal)
    return () => {
      signal.aborted = true
    }
  }, [loadData])

  const retry = useCallback(() => {
    abortRef.current = false
    const signal = { aborted: false }
    loadData(signal)
  }, [loadData])

  return { loading, error, data, retry }
}
