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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 group ${
        isActive
          ? 'text-[#49df9a] font-bold border-l-2 border-[#49df9a] bg-[rgba(73,223,154,0.05)]'
          : 'text-[#bbcabe] hover:bg-[#2f3731]'
      }`}
    >
      {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} />}
      <span className="text-sm">{label}</span>
    </Link>
  )
}
