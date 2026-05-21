import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DashboardView } from '../components/dashboard-view'
import * as service from '../services/dashboard.service'

vi.mock('../services/dashboard.service')

const mockFetchAgentes = vi.mocked(service.fetchAgentes)

// Mock next/link para testing
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('DashboardView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })
  it('QuickActions y NavCards se renderizan incluso cuando la API falla (propiedad de independencia)', async () => {
    mockFetchAgentes.mockRejectedValue(new Error('Server error'))

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getAllByText('No pudimos cargar los datos').length).toBeGreaterThanOrEqual(1)
    })

    // QuickActions siempre visible
    expect(screen.getByLabelText('Crear nuevo agente')).toBeInTheDocument()

    // NavCards siempre visibles
    expect(screen.getByText('Agentes')).toBeInTheDocument()
    expect(screen.getByText('Inbox')).toBeInTheDocument()
    expect(screen.getByText('Pedidos')).toBeInTheDocument()
    expect(screen.getByText('Historial')).toBeInTheDocument()
    expect(screen.getByText('Métricas')).toBeInTheDocument()
  })

  it('el botón Reintentar en estado de error ejecuta el retry (propiedad de idempotencia)', async () => {
    const user = userEvent.setup()

    // Primera llamada rechaza, retry resuelve
    let shouldResolve = false
    mockFetchAgentes.mockImplementation(() => {
      if (shouldResolve) {
        return Promise.resolve([
          { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
          { id: '2', empresaId: 'e1', nombre: 'B', tipo: 'cotizador', estado: 'borrador', createdAt: '', updatedAt: '' },
        ])
      }
      return Promise.reject(new Error('Timeout'))
    })

    render(<DashboardView />)

    // Esperar estado de error
    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar los datos')).toBeInTheDocument()
    })

    // Cambiar comportamiento del mock antes de hacer retry
    shouldResolve = true

    // Click en reintentar
    const button = screen.getByRole('button', { name: 'Reintentar' })
    await user.click(button)

    // Esperar que se muestren los datos
    await waitFor(() => {
      expect(screen.getByText('Total de agentes')).toBeInTheDocument()
    })

    expect(screen.queryByText('No pudimos cargar los datos')).not.toBeInTheDocument()
  })

  it('muestra los indicadores correctamente en estado success', async () => {
    mockFetchAgentes.mockResolvedValue([
      { id: '1', empresaId: 'e1', nombre: 'A', tipo: 'rag', estado: 'activo', createdAt: '', updatedAt: '' },
      { id: '2', empresaId: 'e1', nombre: 'B', tipo: 'cotizador', estado: 'activo', createdAt: '', updatedAt: '' },
      { id: '3', empresaId: 'e1', nombre: 'C', tipo: 'agendamiento', estado: 'borrador', createdAt: '', updatedAt: '' },
    ])

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('Total de agentes')).toBeInTheDocument()
    })

    expect(screen.getByText('Agentes activos')).toBeInTheDocument()
    expect(screen.getByText('Agentes en borrador')).toBeInTheDocument()
  })
})
