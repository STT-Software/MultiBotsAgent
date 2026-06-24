import { AlertCircle } from 'lucide-react';

interface MetricasErrorStateProps {
  onRetry: () => void;
}

export function MetricasErrorState({ onRetry }: MetricasErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <AlertCircle size={32} style={{ color: '#f87171' }} aria-hidden="true" />
      <p className="text-sm" style={{ color: '#869489' }}>
        Error al cargar métricas
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: '#1a3d2f', color: '#00bb7a', border: '1px solid #00bb7a' }}
      >
        Reintentar
      </button>
    </div>
  );
}
