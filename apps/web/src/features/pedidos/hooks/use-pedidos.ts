import { useState, useEffect } from "react";
import { fetchPedidos } from "../services/pedidos.service";
import { fetchAgentes } from "@/features/agentes/services/agentes.service";
import type { Order } from "@multibotagents/types";
import type { Agente } from "@/features/agentes/types/agentes.types";

export interface UiOrder {
  id: string;
  cliente: string;
  total: string;
  estado: "procesando" | "pendiente" | "completado" | "cancelado";
  agenteName: string;
  fecha: string;
}

const ESTADO_MAP: Record<string, "procesando" | "pendiente" | "completado" | "cancelado"> = {
  pending_confirmation: "pendiente",
  confirmed: "procesando",
  preparing: "procesando",
  shipped: "procesando",
  delivered: "completado",
  cancelled: "cancelado",
};

export function usePedidos() {
  const [pedidos, setPedidos] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rawOrders, rawAgentsRes] = await Promise.all([
        fetchPedidos(),
        fetchAgentes(),
      ]);

      const agentsMap = new Map<string, string>();
      rawAgentsRes.data.forEach((agent: Agente) => {
        agentsMap.set(agent.id, agent.nombre);
      });

      const formatted = rawOrders.map((order: Order): UiOrder => {
        // Formateador de moneda en pesos colombianos para coincidir con la localización por defecto
        const totalFormatted = new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(order.total);

        return {
          id: order.id,
          cliente: order.customerName,
          total: totalFormatted,
          estado: ESTADO_MAP[order.status] || "pendiente",
          agenteName: agentsMap.get(order.agentId) || `Agente (${order.agentId.substring(0, 6)})`,
          fecha: new Date(order.createdAt).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });

      setPedidos(formatted);
    } catch (err: any) {
      setError(err.message || "Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { pedidos, loading, error, refetch: loadData };
}
