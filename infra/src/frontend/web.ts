/**
 * Web — Next.js desplegado con OpenNext via sst.aws.Nextjs.
 *
 * En `sst dev`: levanta `next dev` localmente en http://localhost:3000
 * En `sst deploy`: despliega a AWS con CloudFront + Lambda@Edge + S3
 *
 * Recibe NEXT_PUBLIC_API_URL desde la infra para apuntar al API Gateway
 * del servicio NestJS en deploy, o a localhost:3001 en dev.
 */

import { servicesApiUrl } from "../apis/services-api";
import { recaptchaSiteKey } from "../shared/secrets";

export const web = new sst.aws.Nextjs("Web", {
  path: "apps/web",
  environment: {
    NEXT_PUBLIC_API_URL: servicesApiUrl,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: recaptchaSiteKey.value,
  },
});
