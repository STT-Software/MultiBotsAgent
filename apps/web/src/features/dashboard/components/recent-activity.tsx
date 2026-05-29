"use client";

import { MessageSquare, ShoppingCart, ArrowUpRight, ShieldCheck, UserCheck, Bot } from "lucide-react";
import { motion } from "motion/react";

interface ActivityItem {
  id: string;
  time: string;
  type: "chat" | "order" | "escalate" | "system";
  message: string;
  agent: string;
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    time: "Hace 2 min",
    type: "chat",
    message: "Respuesta automática enviada a cliente +54 9 11 5902...",
    agent: "Agente Ventas",
  },
  {
    id: "act-2",
    time: "Hace 15 min",
    type: "order",
    message: "Cotización enviada y carrito guardado de $45,200 ARS",
    agent: "Cotizador Auto",
  },
  {
    id: "act-3",
    time: "Hace 45 min",
    type: "escalate",
    message: "Conversación escalada a operador humano (Usuario requiere soporte técnico)",
    agent: "Soporte IA",
  },
  {
    id: "act-4",
    time: "Hace 2 horas",
    type: "system",
    message: "Sincronización exitosa con Base de Datos de Productos",
    agent: "Sistema",
  },
  {
    id: "act-5",
    time: "Hace 4 horas",
    type: "chat",
    message: "Cliente agendó videollamada para demostración técnica",
    agent: "Agente Demo",
  },
];

export function RecentActivity() {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "chat":
        return <MessageSquare className="h-4 w-4 text-emerald-400" />;
      case "order":
        return <ShoppingCart className="h-4 w-4 text-teal-400" />;
      case "escalate":
        return <UserCheck className="h-4 w-4 text-amber-400" />;
      case "system":
        return <ShieldCheck className="h-4 w-4 text-blue-400" />;
      default:
        return <Bot className="h-4 w-4 text-gray-400" />;
    }
  };

  const getBadgeStyle = (type: ActivityItem["type"]) => {
    switch (type) {
      case "chat":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "order":
        return "bg-teal-500/10 border-teal-500/20";
      case "escalate":
        return "bg-amber-500/10 border-amber-500/20";
      case "system":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-gray-500/10 border-gray-500/20";
    }
  };

  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between hover:border-gray-800/90 transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-inter)] text-xl font-bold text-gray-200">
              Actividad Reciente
            </h2>
            <p className="font-[family-name:var(--font-inter)] text-sm text-gray-400 mt-1">
              Registro de eventos en vivo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">En Vivo</span>
          </div>
        </div>

        {/* List of Activities */}
        <div className="flex flex-col gap-4">
          {ACTIVITIES.map((act, index) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex gap-3 pb-3.5 border-b border-gray-800/50 last:border-b-0 last:pb-0"
            >
              <div className={`mt-0.5 rounded-lg border p-2 shrink-0 ${getBadgeStyle(act.type)}`}>
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-[family-name:var(--font-inter)] text-xs font-semibold text-gray-400">
                    {act.agent}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500 whitespace-nowrap">
                    {act.time}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-inter)] text-xs text-gray-200 mt-1 leading-relaxed line-clamp-2">
                  {act.message}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800/50">
        <a
          href="/historial"
          className="w-full flex items-center justify-center gap-1.5 font-[family-name:var(--font-inter)] text-xs font-bold text-gray-400 hover:text-white transition-colors duration-200 py-2 border border-gray-800 hover:border-gray-700 rounded-lg bg-gray-950/20"
        >
          Ver historial completo
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
