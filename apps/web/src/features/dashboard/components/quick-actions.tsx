import { Plus } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <Link
      href="/agentes/crear"
      aria-label="Crear nuevo agente"
      className="inline-flex items-center gap-2 rounded-lg bg-[#00bb7a] px-4 py-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold text-[#004329] transition-colors duration-200 hover:bg-[#49df9a]"
    >
      <Plus className="h-[18px] w-[18px]" />
      Crear agente
    </Link>
  )
}
