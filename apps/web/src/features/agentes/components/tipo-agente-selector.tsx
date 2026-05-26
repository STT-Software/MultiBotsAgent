"use client";

import { BookOpen, Calculator, Calendar } from "lucide-react";
import { TipoAgenteOption } from "../types/agentes.types";
import { motion } from "motion/react";

// Colores por tipo de agente (extraídos del diseño de referencia)
const TIPO_COLORS: Record<string, { icon: string; bg: string; border: string }> = {
  BookOpen: {
    icon: "#10b981",      // emerald
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
  },
  Calculator: {
    icon: "#e6a817",      // amarillo/dorado
    bg: "rgba(230, 168, 23, 0.1)",
    border: "rgba(230, 168, 23, 0.2)",
  },
  Calendar: {
    icon: "#b366ff",      // púrpura
    bg: "rgba(179, 102, 255, 0.1)",
    border: "rgba(179, 102, 255, 0.2)",
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
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value as any)}
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex flex-col gap-3 rounded-xl p-4 text-left border bg-gray-900/40 backdrop-blur-md transition-colors duration-300 group cursor-pointer overflow-hidden"
              style={{
                borderColor: isSelected ? "#10b981" : "rgba(39, 39, 42, 0.8)",
                boxShadow: isSelected ? "0 0 15px rgba(16, 185, 129, 0.1)" : "none",
              }}
            >
              {/* Highlight gradient background on select */}
              {isSelected && (
                <motion.div
                  layoutId="selectedTypeBg"
                  className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 -z-10"
                  transition={{ type: "spring", stiffness: 150, damping: 18 }}
                />
              )}

              {/* Top row: icon left, radio right */}
              <div className="flex items-start justify-between">
                {Icon && colors && (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 group-hover:scale-105"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    <Icon
                      size={18}
                      className="transition-transform duration-300 group-hover:rotate-6"
                      style={{ color: colors.icon }}
                    />
                  </div>
                )}

                {/* Radio indicator */}
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
                  style={{
                    borderColor: isSelected ? "#10b981" : "#3c4a41",
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId={`radioDot-${option.value}`}
                      className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Text content */}
              <div className="flex flex-col gap-1">
                <span
                  className="text-sm font-semibold transition-colors duration-300 group-hover:text-emerald-300"
                  style={{ color: isSelected ? "#e8f0ea" : "#bbcabe" }}
                >
                  {option.label}
                </span>
                <span
                  className="text-xs leading-relaxed text-gray-500 group-hover:text-gray-400 transition-colors"
                >
                  {option.description}
                </span>
              </div>
            </motion.button>
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
