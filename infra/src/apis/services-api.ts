/**
 * Services API — API Gateway HTTP para servicios Fargate.
 *
 * Expone los servicios ECS Fargate al internet público mediante
 * AWS API Gateway V2 (HTTP API) con integración privada vía Cloud Map.
 *
 * NOTA: En `sst dev` el servicio corre localmente y no tiene Cloud Map,
 * por lo que el API Gateway solo se crea en modo deploy.
 */

import { vpc } from "../networking/vpc";
import { apiMultiBots } from "../services/api-multi-bots";

if (!$dev) {
  const servicesApi = new sst.aws.ApiGatewayV2("ServicesApi", {
    vpc,
  });

  servicesApi.routePrivate("$default", apiMultiBots.nodes.cloudmapService.arn);
}
