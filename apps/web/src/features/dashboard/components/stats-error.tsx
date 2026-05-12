import { AlertCircle } from 'lucide-react'

interface StatsErrorProps {
  onRetry: () => void
}

export function StatsError({ onRetry }: StatsErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[#3c4a41] bg-[#242c27] p-8">
      <AlertCircle className="h-10 w-10 text-[#ffb4ab]" />
      <p className="text-sm text-[#bbcabe]">No pudimos cargar los datos</p>
      <button
        onClick={onRetry}
        className="rounded-lg border border-[#00bb7a] px-4 py-2 text-sm font-medium text-[#00bb7a] transition-colors hover:bg-[#00bb7a]/10"
      >
        Reintentar
      </button>
    </div>
  )
}
