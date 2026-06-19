import { NavItemConfig } from '../types/layout.types'

export const NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Agentes',
    href: '/agentes',
    icon: 'Bot',
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: 'Inbox',
  },
  {
    label: 'Pedidos',
    href: '/pedidos',
    icon: 'ShoppingCart',
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: 'History',
  },
  {
    label: 'Métricas',
    href: '/metricas',
    icon: 'ChartBar',
  },
  {
    label: 'Integraciones',
    href: '/integraciones',
    icon: 'Plug',
  },
]
