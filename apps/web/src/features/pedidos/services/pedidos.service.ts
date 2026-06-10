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

/**
 * Actualiza el estado de un pedido.
 */
export async function updatePedidoStatus(id: string, status: Order["status"]): Promise<Order> {
  const res = await fetchWithAuth(`/orders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar estado del pedido: ${res.status}`);
  }
  return res.json();
}

/**
 * Elimina físicamente un pedido de la base de datos.
 */
export async function deletePedido(id: string): Promise<{ success: boolean }> {
  const res = await fetchWithAuth(`/orders/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Error al eliminar pedido: ${res.status}`);
  }
  return res.json();
}
