"use client";

import {
  BarChart3,
  Bot,
  History,
  Inbox,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { motion } from 'motion/react'

interface NavCardItem {
  label: string
  href: string
  icon: ReactNode
}

const NAV_ITEMS: NavCardItem[] = [
  { label: 'Agentes', href: '/agentes', icon: <Bot className="h-6 w-6" strokeWidth={2} /> },
  { label: 'Inbox', href: '/inbox', icon: <Inbox className="h-6 w-6" strokeWidth={2} /> },
  {
    label: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-6 w-6" strokeWidth={2} />,
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: <History className="h-6 w-6" strokeWidth={2} />,
  },
  {
    label: 'Métricas',
    href: '/metricas',
    icon: <BarChart3 className="h-6 w-6" strokeWidth={2} />,
  },
]

export function NavCards() {
  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h2 className="font-[family-name:var(--font-inter)] text-xl font-bold text-gray-200">
          Secciones
        </h2>
        <Link
          href="/agentes"
          className="font-[family-name:var(--font-inter)] text-sm text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors duration-200"
        >
          Ver todo
          <span className="text-xs">→</span>
        </Link>
      </div>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.1,
            },
          },
        }}
        className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5"
      >
        {NAV_ITEMS.map((item) => (
          <motion.div
            key={item.href}
            variants={{
              hidden: { opacity: 0, scale: 0.95, y: 15 },
              show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
            }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="flex"
          >
            <Link
              href={item.href}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-5 w-full hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
            >
              <span className="text-gray-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300">
                {item.icon}
              </span>
              <span className="font-[family-name:var(--font-inter)] text-sm font-bold text-gray-200 group-hover:text-emerald-300 transition-colors">
                {item.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
