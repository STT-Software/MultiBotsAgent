"use client";

import { MessageCircle } from "lucide-react";
import { Agente } from "../types/agentes.types";
import { EmbeddedSignupContainer } from "@/features/embedded-signup";

interface AgenteTabCanalProps {
  agente: Agente;
}

export function AgenteTabCanal({ agente }: AgenteTabCanalProps) {
  // Para la fase actual, asumimos que el channel no viene incluido en el agente completo
  // Si en el futuro `agente.channel` existe, lo pasamos a currentChannel.
  // const currentChannel = agente.channel;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 w-full">
      {/* Columna Izquierda: Integración de Meta */}
      <div
        className="relative overflow-hidden rounded-xl p-8 flex flex-col gap-6"
        style={{
          background: "rgba(26, 33, 28, 0.5)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3c4a41",
          boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
          style={{
            background: "linear-gradient(to right, transparent, #00bb7a, transparent)",
            opacity: 0.3,
          }}
        />

        {/* Encabezado */}
        <div className="flex items-start gap-4 pb-4" style={{ borderBottom: "1.5px solid #3c4a41" }}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{
              backgroundColor: "rgba(0, 187, 122, 0.1)",
              border: "1px solid rgba(0, 187, 122, 0.3)",
            }}
          >
            <MessageCircle size={24} style={{ color: "#00bb7a" }} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold" style={{ color: "#e8f0ea", fontFamily: "Geist, Inter, sans-serif" }}>
              Canal de WhatsApp
            </h2>
            <p className="text-xs" style={{ color: "#869489" }}>
              Conecta este agente a un número de WhatsApp usando el proceso de Embedded Signup de Meta.
            </p>
          </div>
        </div>

        {/* Embedded Signup Widget */}
        <div className="w-full bg-[#0e1510] rounded-xl p-6 border border-[#3c4a41]">
          <EmbeddedSignupContainer agentId={agente.id} />
        </div>
      </div>

      {/* Columna Derecha: Requisitos e Información */}
      <div className="flex flex-col gap-6">
        {/* Estado / Ilustración */}
        <div
          className="flex flex-col items-center text-center gap-4 rounded-xl p-6"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02)",
          }}
        >
          {/* Technical illustration with pulsing rings */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                border: "1px solid rgba(0, 187, 122, 0.2)",
                animationDuration: "3s",
              }}
            />
            <div
              className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "#0e1510",
                border: "1px solid #3c4a41",
              }}
            >
              <MessageCircle size={32} style={{ color: "#00bb7a" }} aria-hidden="true" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold" style={{ color: "#e8f0ea" }}>
              Integración Oficial (Meta API)
            </h3>
            <p className="text-xs" style={{ color: "#869489" }}>
              Conexión directa sin intermediarios, garantizando velocidad y alta disponibilidad.
            </p>
          </div>
        </div>

        {/* Requisitos Checklist */}
        <div
          className="rounded-xl p-6 border border-[#3c4a41]"
          style={{ background: "rgba(14, 21, 16, 0.3)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#dde5dc" }}>
            Requisitos Previos
          </h3>
          <ul className="text-xs space-y-3 leading-relaxed" style={{ color: "#869489" }}>
            <li className="flex items-start gap-2">
              <span className="text-[#00bb7a] font-bold">✓</span>
              <span>Una cuenta comercial de <strong>Meta Business Suite</strong> verificada o apta para verificación.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00bb7a] font-bold">✓</span>
              <span>Un número de teléfono que <strong>no esté registrado</strong> en una cuenta de WhatsApp personal o Business activa.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00bb7a] font-bold">✓</span>
              <span>Acceso de administrador a la cuenta comercial de Meta.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
