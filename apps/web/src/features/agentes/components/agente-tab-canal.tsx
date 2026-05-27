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
    <div className="flex flex-1 items-center justify-center py-12">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl p-10 flex flex-col items-center text-center"
        style={{
          background: "rgba(26, 33, 28, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3c4a41",
          boxShadow:
            "inset 0 0 15px rgba(0, 187, 122, 0.05), 0 0 20px rgba(0, 187, 122, 0.05)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, #00bb7a, transparent)",
            opacity: 0.5,
          }}
        />

        {/* Technical illustration */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          {/* Pulsing rings */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              border: "1px solid rgba(0, 187, 122, 0.2)",
              animationDuration: "3s",
            }}
          />
          <div
            className="absolute inset-4 rounded-full animate-ping"
            style={{
              border: "1px solid rgba(0, 187, 122, 0.1)",
              animationDuration: "4s",
              animationDelay: "1s",
            }}
          />

          {/* Central icon container */}
          <div
            className="relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center"
            style={{
              backgroundColor: "#0e1510",
              border: "1px solid #3c4a41",
            }}
          >
            <MessageCircle size={56} strokeWidth={1.2} style={{ color: "#00bb7a" }} aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-semibold mb-3"
          style={{ color: "#dde5dc", fontFamily: "Geist, Inter, sans-serif" }}
        >
          Canal de WhatsApp
        </h2>

        {/* Description */}
        <p
          className="text-sm leading-relaxed max-w-md mb-8"
          style={{ color: "#869489" }}
        >
          Conecta este agente a un número de WhatsApp usando el proceso de Embedded Signup de Meta.
        </p>

        {/* Embedded Signup */}
        <div className="w-full bg-[#151c17] rounded-xl p-6 border border-[#3c4a41]">
          <EmbeddedSignupContainer agentId={agente.id} />
        </div>
      </div>
    </div>
  );
}
