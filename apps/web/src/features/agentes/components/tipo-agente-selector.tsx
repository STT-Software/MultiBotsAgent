"use client";

import { BookOpen, Calculator, Calendar } from "lucide-react";

import { TipoAgenteOption } from "../types/agentes.types";

const TIPOS_AGENTE: TipoAgenteOption[] = [
  {
    value: "rag",
    label: "RAG",
    description: "Asistente con base de conocimiento",
    icon: "BookOpen",
  },
  {
    value: "cotizador",
    label: "Cotizador",
    description: "Genera cotizaciones automáticas",
    icon: "Calculator",
  },
  {
    value: "agendamiento",
    label: "Agendamiento",
    description: "Gestiona citas y reservas",
    icon: "Calendar",
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  BookOpen,
  Calculator,
  Calendar,
};

interface TipoAgenteSelectorProps {
  value: string;
  onChange: (tipo: "rag" | "cotizador" | "agendamiento") => void;
  error?: string;
}

export function TipoAgenteSelector({ value, onChange, error }: TipoAgenteSelectorProps) {
  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Tipo de agente"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {TIPOS_AGENTE.map((option) => {
          const Icon = ICON_MAP[option.icon];
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className="flex flex-col items-center gap-2 rounded-lg p-4 text-center transition-all duration-150"
              style={{
                backgroundColor: isSelected ? "#1a2f23" : "#111d17",
                border: `1.5px solid ${isSelected ? "#00bb7a" : "#3c4a41"}`,
                cursor: "pointer",
              }}
            >
              {Icon && (
                <Icon
                  size={24}
                  className="transition-colors"
                  style={{ color: isSelected ? "#00bb7a" : "#bbcabe" }}
                />
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: isSelected ? "#e8f0ea" : "#bbcabe" }}
              >
                {option.label}
              </span>
              <span
                className="text-xs"
                style={{ color: "#869489" }}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
