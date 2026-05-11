'use client'

import Link from 'next/link'
import { icons } from 'lucide-react'

interface NavItemProps {
  label: string
  href: string
  icon: string
  isActive: boolean
}

export function NavItem({ label, href, icon, isActive }: NavItemProps) {
  const Icon = icons[icon as keyof typeof icons]

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'border-l-2 border-emerald-500 bg-emerald-500/5 font-semibold text-emerald-400'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} />}
      <span>{label}</span>
    </Link>
  )
}
