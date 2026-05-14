'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Shield } from 'lucide-react'

const settingsNavItems = [
  {
    label: 'Perfil de Empresa',
    href: '/settings/profile',
    icon: Building2,
  },
  {
    label: 'Seguridad',
    href: '/settings/security',
    icon: Shield,
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar - Sub_Navegación_Settings */}
      <aside className="w-60 shrink-0 border-r border-[#3c4a41] bg-[#0e1510]/50 p-4">
        <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-[#bbcabe]">
          Configuración
        </h2>
        <nav className="flex flex-col gap-1" aria-label="Configuración">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#00bb7a]/10 font-medium text-[#00bb7a]'
                    : 'text-[#bbcabe] hover:bg-[#2f3731] hover:text-[#dde5dc]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
