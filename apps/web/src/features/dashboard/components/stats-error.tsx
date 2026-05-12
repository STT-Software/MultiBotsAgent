import { AlertCircle } from 'lucide-react'

interface StatsErrorProps {
  onRetry: () => void
}

export function StatsError({ onRetry }: StatsErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-8">
      <AlertCircle className="h-10 w-10 text-[#ffb4ab]" />
      <p className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe]">
        No pudimos cargar los datos
      </p>
      <button
        onClick={onRetry}
        className="rounded-lg border border-[#00bb7a] px-4 py-2.5 text-sm font-semibold text-[#00bb7a] transition-colors duration-200 hover:bg-[#00bb7a]/10 hover:shadow-[0_0_12px_rgba(0,187,122,0.15)]"
      >
        Reintentar
      </button>
    </div>
  )
}
