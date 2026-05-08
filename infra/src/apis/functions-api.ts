/**
 * Functions API — API Gateway HTTP para Lambda handlers.
 *
 * Expone los handlers Lambda al internet público mediante
 * AWS API Gateway V2 (HTTP API) con integración directa.
 *
 * Nota: El endpoint POST /auth/register se movió al servicio NestJS
 * (apps/services/api-multi-bots) como módulo AuthModule.
 */

const functionsApi = new sst.aws.ApiGatewayV2("FunctionsApi");

export { functionsApi };
