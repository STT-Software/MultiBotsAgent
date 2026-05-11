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
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'border-l-2 border-primary bg-primary/5 font-bold text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-highest'
      }`}
    >
      {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} />}
      <span>{label}</span>
    </Link>
  )
}
