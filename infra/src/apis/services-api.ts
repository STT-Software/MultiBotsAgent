/**
 * Services API — API Gateway HTTP para servicios Fargate.
 *
 * Expone los servicios ECS Fargate al internet público mediante
 * AWS API Gateway V2 (HTTP API) con integración privada vía Cloud Map.
 *
 * En `sst dev` el servicio corre localmente en localhost:3001.
 * En `sst deploy` se crea el API Gateway y se exporta su URL.
 */

import { vpc } from "../networking/vpc";
import { apiMultiBots } from "../services/api-multi-bots";
import { frontendDomain } from "../shared/secrets";

/**
 * URL pública de la API de servicios.
 * - En dev: apunta a localhost:3001 (servicio NestJS local).
 * - En deploy: URL del API Gateway V2.
 */
export let servicesApiUrl: string = "http://localhost:3001";

if (!$dev) {
  servicesApiUrl = apiMultiBots.url;
}

