/**
 * APIs — API Gateway + rutas Lambda.
 *
 * El API Gateway es un recurso AISLADO por stage.
 * Cada desarrollador tiene su propio endpoint.
 *
 * TODO: Descomentar cuando se ejecute con SST.
 *
 * Ejemplo funcional:
 *
 * export const api = new sst.aws.ApiGatewayV2("MainApi");
 *
 * // Ruta al handler de ejemplo
 * api.route("POST /examples", "apps/functions/src/handlers/example/create.handler");
 *
 * // Si el handler necesita acceso a recursos (bucket, secret, etc.):
 * api.route("POST /examples", {
 *   handler: "apps/functions/src/handlers/example/create.handler",
 *   link: [mainBucket, mongoUri],
 * });
 *
 * // Exportar la URL del API para uso en el frontend
 * return { apiUrl: api.url };
 */
