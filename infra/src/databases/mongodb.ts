/**
 * Databases — MongoDB / DocumentDB.
 *
 * Las bases de datos son SIEMPRE recursos compartidos en stages personales.
 * Solo se crean en entornos reales (dev, prod).
 *
 * MongoDB no es un servicio nativo de AWS. Opciones:
 * 1. MongoDB Atlas (externo) — Configurar connection string como Secret
 * 2. Amazon DocumentDB (compatible con MongoDB) — Recurso de Pulumi/AWS
 *
 * TODO: Implementar cuando se defina el motor de BD del proyecto.
 *
 * Ejemplo con MongoDB Atlas (connection string como secret):
 *
 * export const mongoUri = new sst.Secret("MongoUri");
 *
 * // Uso en una Lambda:
 * new sst.aws.Function("MyFn", {
 *   handler: "apps/functions/src/handlers/example/create.handler",
 *   link: [mongoUri],
 * });
 *
 * // En el handler:
 * import { Resource } from "sst";
 * const uri = Resource.MongoUri.value;
 *
 * Ejemplo con DocumentDB (recurso compartido):
 *
 * import { isPersonalStage } from "../helpers/stage";
 * import * as aws from "@pulumi/aws";
 *
 * export const docDbCluster = isPersonalStage($app.stage)
 *   ? aws.docdb.Cluster.get("DocDb", "cluster-id-del-entorno-dev")
 *   : new aws.docdb.Cluster("DocDb", { ... });
 */
