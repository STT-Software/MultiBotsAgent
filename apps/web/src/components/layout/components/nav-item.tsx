'use client'

import Link from 'next/link'
import { icons } from 'lucide-react'

interface NavItemProps {
  label: string
  href: string
  icon: string
  isActive: boolean
  badge?: number
}

export function NavItem({ label, href, icon, isActive, badge }: NavItemProps) {
  const Icon = icons[icon as keyof typeof icons]

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
        isActive
          ? 'bg-[#00bb7a]/5 text-[#00bb7a]'
          : 'text-[#dde5dc] hover:bg-[#2f3731] hover:text-white'
      }`}
    >
      {/* Left accent bar — only on active */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[#00bb7a]" />
      )}
      {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} />}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
          style={{ backgroundColor: '#00bb7a', color: '#004329' }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
