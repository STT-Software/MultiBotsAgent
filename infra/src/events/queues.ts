/**
 * Events — SQS, SNS, EventBridge.
 *
 * Las colas y eventos son recursos AISLADOS por stage.
 * Cada desarrollador tiene sus propias colas para evitar que uno consuma mensajes de otro.
 *
 * TODO: Implementar cuando se necesiten colas o eventos.
 *
 * Ejemplo de cola SQS (siempre aislada por stage):
 *
 * export const processingQueue = new sst.aws.Queue("ProcessingQueue");
 *
 * // Suscribir una Lambda a la cola:
 * processingQueue.subscribe("apps/functions/src/handlers/queue/process.handler");
 *
 * Ejemplo de EventBridge rule:
 *
 * const bus = new sst.aws.Bus("MainBus");
 * bus.subscribe("apps/functions/src/handlers/events/handler.handler", {
 *   pattern: { source: ["my-app"], detailType: ["OrderCreated"] },
 * });
 */
