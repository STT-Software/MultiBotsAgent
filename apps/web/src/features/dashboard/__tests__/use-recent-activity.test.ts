import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useRecentActivity } from '../hooks/use-recent-activity'
import * as service from '../services/dashboard.service'

vi.mock('../services/dashboard.service')

const mockFetchAgentes = vi.mocked(service.fetchAgentes)
const mockFetchRecentActivity = vi.mocked(service.fetchRecentActivity)

describe('useRecentActivity', () => {
  it('el hook carga los agentes y luego la actividad reciente en estado success', async () => {
    const mockAgentes = [
      { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag' as const, estado: 'activo' as const, createdAt: '', updatedAt: '' }
    ]
    const mockActivities = [
      { id: 'act-1', time: 'Hace 5 min', type: 'chat' as const, message: 'Mensaje de prueba', agent: 'A' }
    ]

    mockFetchAgentes.mockResolvedValue(mockAgentes)
    mockFetchRecentActivity.mockResolvedValue(mockActivities)

    const { result } = renderHook(() => useRecentActivity())

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.activities).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.activities).toEqual(mockActivities)
  })

  it('el hook maneja correctamente los errores en fetchAgentes', async () => {
    mockFetchAgentes.mockRejectedValue(new Error('DB Error'))

    const { result } = renderHook(() => useRecentActivity())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('DB Error')
    expect(result.current.activities).toEqual([])
  })

  it('el hook maneja correctamente los errores en fetchRecentActivity', async () => {
    mockFetchAgentes.mockResolvedValue([])
    mockFetchRecentActivity.mockRejectedValue(new Error('API Timeout'))

    const { result } = renderHook(() => useRecentActivity())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('API Timeout')
    expect(result.current.activities).toEqual([])
  })

  it('llamar retry() vuelve a cargar los datos', async () => {
    mockFetchAgentes.mockRejectedValueOnce(new Error('Network error'))
    mockFetchAgentes.mockResolvedValueOnce([])
    mockFetchRecentActivity.mockResolvedValueOnce([])

    const { result } = renderHook(() => useRecentActivity())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.activities).toEqual([])
  })
})
