'use client'

import { useCallback, useEffect, useState } from 'react'

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const agentes = await fetchAgentes()
      const activos = agentes.filter((a) => a.estado === 'activo').length
      const borradores = agentes.filter((a) => a.estado === 'borrador').length

      setData({
        total: agentes.length,
        activos,
        borradores,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos cargar los datos'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const retry = useCallback(() => {
    loadData()
  }, [loadData])

  return { loading, error, data, retry }
}
