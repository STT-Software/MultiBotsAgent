import {
  BarChart3,
  Bot,
  History,
  Inbox,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

interface NavCardItem {
  label: string
  href: string
  icon: ReactNode
}

const NAV_ITEMS: NavCardItem[] = [
  { label: 'Agentes', href: '/agentes', icon: <Bot className="h-6 w-6" /> },
  { label: 'Inbox', href: '/inbox', icon: <Inbox className="h-6 w-6" /> },
  {
    label: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-6 w-6" />,
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: <History className="h-6 w-6" />,
  },
  {
    label: 'Métricas',
    href: '/metricas',
    icon: <BarChart3 className="h-6 w-6" />,
  },
]

export function NavCards() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-3 rounded-lg border border-[#3c4a41] bg-[#1a211c] p-5 transition-colors hover:border-[#00bb7a]"
        >
          <span className="text-[#bbcabe]">{item.icon}</span>
          <span className="text-sm font-medium text-[#dde5dc]">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
