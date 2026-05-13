/**
 * Company Logos Bucket — S3 Bucket para almacenar logos de empresas.
 *
 * Bucket dedicado para logos corporativos subidos por los usuarios.
 * Configurado con:
 * - CORS: permite PUT desde el dominio del frontend (presigned URL upload).
 * - Acceso público de lectura para servir logos directamente desde S3.
 *
 * Key pattern: logos/{companyId}/{timestamp}-{sanitizedFileName}
 *
 * El servicio api-multi-bots genera presigned URLs para upload
 * y gestiona el ciclo de vida de los objetos (crear/eliminar).
 */

import { frontendDomain } from "../shared/secrets";

/**
 * Orígenes permitidos para CORS.
 * - En dev: localhost:3000 (Next.js local)
 * - En deploy: dominio del frontend desde secrets
 */
const allowedOrigins = $dev
  ? ["http://localhost:3000"]
  : [frontendDomain.value];

export const companyLogosBucket = new sst.aws.Bucket("CompanyLogosBucket", {
  access: "public",
  cors: {
    allowHeaders: ["*"],
    allowMethods: ["PUT", "GET", "HEAD"],
    allowOrigins: allowedOrigins,
    maxAge: "3600 seconds",
  },
});
