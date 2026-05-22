"use client";

import { MessageCircle } from "lucide-react";

export function AgenteTabCanal() {
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
            {/* Animated dots */}
            <div className="mt-3 flex gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#00bb7a" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#00bb7a", animationDelay: "200ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#00bb7a", animationDelay: "400ms" }}
              />
            </div>

            {/* Dashed orbitals */}
            <div
              className="absolute w-[120%] h-[120%] rounded-full rotate-[15deg]"
              style={{ border: "1px dashed rgba(0, 187, 122, 0.3)" }}
            />
            <div
              className="absolute w-[140%] h-[140%] rounded-full -rotate-[10deg]"
              style={{ border: "1px dashed rgba(60, 74, 65, 0.5)" }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-semibold mb-3"
          style={{ color: "#dde5dc", fontFamily: "Geist, Inter, sans-serif" }}
        >
          Canal de Comunicación
        </h2>

        {/* Description */}
        <p
          className="text-sm leading-relaxed max-w-md mb-8"
          style={{ color: "#869489" }}
        >
          Asociación de canal disponible cuando el conector WhatsApp esté implementado.
          Estamos preparando la integración para conectar tu agente con los canales de mensajería.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            className="px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              backgroundColor: "#00bb7a",
              color: "#0a0a0a",
              boxShadow: "0 0 15px rgba(0, 187, 122, 0.3)",
            }}
          >
            Notificar Disponibilidad
          </button>
          <button
            type="button"
            className="px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              backgroundColor: "transparent",
              color: "#00bb7a",
              border: "1px solid #00bb7a",
            }}
          >
            Ver Documentación
          </button>
        </div>
      </div>
    </div>
  );
}
