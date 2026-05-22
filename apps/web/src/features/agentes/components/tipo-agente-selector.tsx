"use client";

import { BookOpen, Calculator, Calendar } from "lucide-react";

import { TipoAgenteOption } from "../types/agentes.types";

// Colores por tipo de agente (extraídos del diseño de referencia)
const TIPO_COLORS: Record<string, { icon: string; bg: string; border: string }> = {
  BookOpen: {
    icon: "#5b9bd5",      // azul
    bg: "#1e2a35",        // fondo azul-gris oscuro
    border: "#3a5068",
  },
  Calculator: {
    icon: "#e6a817",      // amarillo/dorado
    bg: "#2a2410",        // fondo amarillo oscuro
    border: "#5c4a10",
  },
  Calendar: {
    icon: "#b366ff",      // púrpura
    bg: "#1f1530",        // fondo púrpura oscuro
    border: "#4a2d6e",
  },
};

const TIPOS_AGENTE: TipoAgenteOption[] = [
  {
    value: "rag",
    label: "RAG",
    description: "Retrieval Augmented Generation para respuestas basadas en datos.",
    icon: "BookOpen",
  },
  {
    value: "cotizador",
    label: "Workflow",
    description: "Basado en flujos lógicos y decisiones estructuradas paso a paso.",
    icon: "Calculator",
  },
  {
    value: "agendamiento",
    label: "Conversacional",
    description: "Chat simple optimizado para interacciones humanas naturales.",
    icon: "Calendar",
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
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
          const colors = TIPO_COLORS[option.icon];
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className="relative flex flex-col gap-3 rounded-xl p-4 text-left transition-all duration-150"
              style={{
                backgroundColor: isSelected ? "#1a2f23" : "#0e1510",
                border: `1.5px solid ${isSelected ? "#00bb7a" : "#3c4a41"}`,
                cursor: "pointer",
              }}
            >
              {/* Top row: icon left, radio right */}
              <div className="flex items-start justify-between">
                {Icon && colors && (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Icon
                      size={18}
                      className="transition-colors"
                      style={{ color: colors.icon }}
                    />
                  </div>
                )}

                {/* Radio indicator */}
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{
                    border: `2px solid ${isSelected ? "#00bb7a" : "#3c4a41"}`,
                  }}
                >
                  {isSelected && (
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: "#00bb7a" }}
                    />
                  )}
                </div>
              </div>

              {/* Text content */}
              <div className="flex flex-col gap-1">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? "#e8f0ea" : "#bbcabe" }}
                >
                  {option.label}
                </span>
                <span
                  className="text-xs leading-relaxed"
                  style={{ color: "#869489" }}
                >
                  {option.description}
                </span>
              </div>
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
