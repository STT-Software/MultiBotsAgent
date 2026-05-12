import { Plus } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <Link
      href="/agentes/crear"
      aria-label="Crear nuevo agente"
      className="inline-flex items-center gap-2 rounded-lg bg-[#00bb7a] px-5 py-3 font-semibold text-[#004329] transition-colors hover:bg-[#49df9a]"
    >
      <Plus className="h-5 w-5" />
      Crear agente
    </Link>
  )
}
