/**
 * Cluster — ECS Cluster para servicios Fargate.
 *
 * Define un cluster ECS compartido dentro de la VPC.
 * Todos los servicios Fargate (ej: api-multi-bots) se despliegan en este cluster.
 *
 * Los módulos de servicio importan `cluster` desde aquí.
 */

import { vpc } from "../networking/vpc";

export const cluster = new sst.aws.Cluster("MainCluster", { vpc });
