import type { Session } from '../types/layout.types'

export const MOCK_SESSION: Session = {
  empresa: {
    id: 'emp-001',
    nombre: 'Mi Empresa',
  },
  usuario: {
    id: 'usr-001',
    nombre: 'Oscar Gomez',
    email: 'oscar@miempresa.com',
  },
}

export function useSession(): Session | null {
  return MOCK_SESSION
}
