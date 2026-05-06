/**
 * Services — Definiciones de Fargate.
 *
 * Los servicios Fargate se definen aquí para despliegue en AWS.
 * En desarrollo local, se ejecutan con Docker Compose (ver docker-compose.yml).
 *
 * TODO: Implementar cuando se necesite desplegar servicios a Fargate.
 *
 * Ejemplo con SST Cluster + Service:
 *
 * const cluster = new sst.aws.Cluster("MainCluster", {
 *   vpc: { id: vpc.id, ... },
 * });
 *
 * export const exampleService = cluster.addService("ExampleService", {
 *   image: {
 *     dockerfile: "apps/services/api-multi-bots/Dockerfile",
 *     context: ".",
 *   },
 *   port: 3001,
 *   link: [mongoUri, mainBucket],
 * });
 *
 * Ejemplo con Pulumi directamente (si SST no cubre el caso):
 *
 * import * as aws from "@pulumi/aws";
 *
 * const taskDef = new aws.ecs.TaskDefinition("ExampleTask", {
 *   family: "api-multi-bots",
 *   containerDefinitions: JSON.stringify([{
 *     name: "api-multi-bots",
 *     image: "...",
 *     portMappings: [{ containerPort: 3001 }],
 *   }]),
 *   ...
 * });
 */
