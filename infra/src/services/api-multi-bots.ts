/**
 * API Multi Bots — Servicio Fargate para la API NestJS.
 *
 * Despliega el servicio api-multi-bots en ECS Fargate con capacidad SPOT.
 * Usa el Dockerfile del servicio con el contexto del monorepo root.
 * Recibe la URI de MongoDB como variable de entorno desde SST Secrets.
 *
 * El service registry en puerto 3001 habilita el descubrimiento de servicio
 * y la exposición pública vía API Gateway automáticamente.
 */

import { cluster } from "./cluster";
import { mongoDbUri } from "../databases/mongodb";
import { jwtSecrets, captchaSecret, captchaVerifyUrl } from "../shared/secrets";

export const apiMultiBots = new sst.aws.Service("ApiMultiBots", {
  cluster,
  image: {
    context: ".",
    dockerfile: "apps/services/api-multi-bots/Dockerfile",
  },
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  capacity: "spot",
  environment: {
    MONGODB_URI: mongoDbUri.value,
    JWT_SECRETS: jwtSecrets.value,
    CAPTCHA_SECRET: captchaSecret.value,
    CAPTCHA_VERIFY_URL: captchaVerifyUrl.value,
  },
  serviceRegistry: {
    port: 3001,
  },
  health: {
    command: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
    interval: "30 seconds",
    timeout: "5 seconds",
    retries: 3,
    startPeriod: "60 seconds",
  },
  dev: {
    command: "npx nest start --watch",
    directory: "apps/services/api-multi-bots",
  },
});
