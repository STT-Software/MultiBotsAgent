/**
 * Shared — Secrets Manager, Parameter Store.
 *
 * TODO: Implementar cuando se necesiten secrets compartidos.
 * En stages personales, se referencian los secrets del entorno dev.
 * En entornos reales, se crean secrets propios.
 *
 * Ejemplo de implementación:
 *
 * import { isPersonalStage } from "../helpers/stage";
 *
 * export const dbConnectionString = isPersonalStage($app.stage)
 *   ? new sst.Secret("DbConnectionString")  // Referencia al secret de dev
 *   : new sst.Secret("DbConnectionString");  // Secret propio del entorno
 *
 * // Uso en una Lambda:
 * new sst.aws.Function("MyFn", {
 *   handler: "apps/functions/src/handlers/example/create.handler",
 *   link: [dbConnectionString],
 * });
 *
 * // En el handler, acceder con:
 * import { Resource } from "sst";
 * const connStr = Resource.DbConnectionString.value;
 */
