import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAgentesSummary } from '../hooks/use-agentes-summary'
import * as service from '../services/dashboard.service'

vi.mock('../services/dashboard.service')

const mockFetchAgentes = vi.mocked(service.fetchAgentes)

describe('useAgentesSummary', () => {
  it('la suma de activos + borradores siempre es igual al total (propiedad de consistencia)', async () => {
    mockFetchAgentes.mockResolvedValue([
      { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
      { id: '2', empresaId: 'e1', nombre: 'B', tipo: 'cotizador', estado: 'activo', createdAt: '', updatedAt: '' },
      { id: '3', empresaId: 'e1', nombre: 'C', tipo: 'agendamiento', estado: 'borrador', createdAt: '', updatedAt: '' },
      { id: '4', empresaId: 'e1', nombre: 'D', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
      { id: '5', empresaId: 'e1', nombre: 'E', tipo: 'rag', estado: 'borrador', createdAt: '', updatedAt: '' },
    ])

    const { result } = renderHook(() => useAgentesSummary())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const { data } = result.current
    expect(data).not.toBeNull()
    expect(data!.total).toBe(data!.activos + data!.borradores)
  })

  it('el hook siempre está en exactamente uno de los 3 estados (completitud de estados)', async () => {
    mockFetchAgentes.mockResolvedValue([
      { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
    ])

    const { result } = renderHook(() => useAgentesSummary())

    // Estado loading: loading=true, error=null, data=null
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Estado success: loading=false, error=null, data!=null
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).not.toBeNull()
  })

  it('el hook en estado error tiene loading=false, error!=null, data=null', async () => {
    mockFetchAgentes.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAgentesSummary())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Network error')
    expect(result.current.data).toBeNull()
  })

  it('llamar retry() después de un error re-ejecuta el fetch y puede transicionar a success', async () => {
    mockFetchAgentes.mockRejectedValueOnce(new Error('Timeout'))
    mockFetchAgentes.mockResolvedValueOnce([
      { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
    ])

    const { result } = renderHook(() => useAgentesSummary())

    // Esperar error
    await waitFor(() => {
      expect(result.current.error).toBe('Timeout')
    })

    // Retry
    act(() => {
      result.current.retry()
    })

    // Esperar success
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data!.total).toBe(1)
    expect(result.current.data!.activos).toBe(1)
    expect(result.current.data!.borradores).toBe(0)
  })
})
