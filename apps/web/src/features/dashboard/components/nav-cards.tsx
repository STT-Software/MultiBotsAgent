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
  staggerClass: string
}

const NAV_ITEMS: NavCardItem[] = [
  { label: 'Agentes', href: '/agentes', icon: <Bot className="h-6 w-6" strokeWidth={2} />, staggerClass: 'stagger-1' },
  { label: 'Inbox', href: '/inbox', icon: <Inbox className="h-6 w-6" strokeWidth={2} />, staggerClass: 'stagger-2' },
  {
    label: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-6 w-6" strokeWidth={2} />,
    staggerClass: 'stagger-3',
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: <History className="h-6 w-6" strokeWidth={2} />,
    staggerClass: 'stagger-4',
  },
  {
    label: 'Métricas',
    href: '/metricas',
    icon: <BarChart3 className="h-6 w-6" strokeWidth={2} />,
    staggerClass: 'stagger-5',
  },
]

export function NavCards() {
  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h2 className="font-[family-name:var(--font-inter)] text-xl font-bold text-[#dde5dc]">
          Secciones
        </h2>
        <Link
          href="/agentes"
          className="font-[family-name:var(--font-inter)] text-sm text-[#49df9a] flex items-center gap-1 hover:text-[#00bb7a] transition-colors duration-200"
        >
          Ver todo
          <span className="text-xs">→</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex flex-col items-center gap-3 rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-5 transition-all duration-200 hover:border-[rgba(0,187,122,0.4)] hover:shadow-[inset_0_0_10px_rgba(0,187,122,0.05)] ${item.staggerClass}`}
          >
            <span className="text-[#bbcabe] group-hover:text-[#49df9a] transition-colors duration-200">
              {item.icon}
            </span>
            <span className="font-[family-name:var(--font-inter)] text-sm font-bold text-[#dde5dc]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
