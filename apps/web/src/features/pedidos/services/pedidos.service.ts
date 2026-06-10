import { fetchWithAuth } from "@/lib/auth";
import type { Order } from "@multibotagents/types";

/**
 * Obtiene el listado de pedidos reales del backend NestJS.
 */
export async function fetchPedidos(): Promise<Order[]> {
  const res = await fetchWithAuth("/orders");
  if (!res.ok) {
    throw new Error(`Error al obtener pedidos: ${res.status}`);
  }
  return res.json();
}
