/**
 * Tokens de inyección para el módulo Orders.
 * Siguen las pautas de inyección por interfaces (AGENTS.md).
 */

/** Token para inyectar el repositorio de pedidos (orders) */
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
