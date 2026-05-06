/**
 * Services API — API Gateway HTTP para servicios Fargate.
 *
 * Expone los servicios ECS Fargate al internet público mediante
 * AWS API Gateway V2 (HTTP API) con integración privada vía Cloud Map.
 *
 * Usa `routePrivate` para enrutar tráfico al servicio a través de
 * su service registry (Cloud Map), sin exponer el servicio directamente.
 *
 * Ventaja: pay-per-request, ideal para stages de desarrollo y tráfico bajo.
 */

import { vpc } from "../networking/vpc";
import { apiMultiBots } from "../services/api-multi-bots";

export const servicesApi = new sst.aws.ApiGatewayV2("ServicesApi", {
  vpc,
});

servicesApi.routePrivate("$default", apiMultiBots.nodes.cloudmapService.arn);
