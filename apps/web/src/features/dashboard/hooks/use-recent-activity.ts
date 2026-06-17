'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchAgentes, fetchRecentActivity } from '../services/dashboard.service'
import type { ActivityItem } from '../types/dashboard.types'

interface UseRecentActivityReturn {
  loading: boolean
  error: string | null
  activities: ActivityItem[]
  retry: () => void
}

export function useRecentActivity(): UseRecentActivityReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const loadData = useCallback(async (signal: { aborted: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const agentes = await fetchAgentes()
      if (signal.aborted) return
      
      const recent = await fetchRecentActivity(agentes)
      if (signal.aborted) return

      setActivities(recent || [])
    } catch (err) {
      if (signal.aborted) return
      const message = err instanceof Error ? err.message : 'No pudimos cargar la actividad reciente'
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
    const signal = { aborted: false }
    loadData(signal)
  }, [loadData])

  return { loading, error, activities, retry }
}
