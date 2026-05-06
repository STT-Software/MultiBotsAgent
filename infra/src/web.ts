/**
 * Web — Next.js desplegado con OpenNext via sst.aws.Nextjs.
 *
 * En `sst dev`: levanta `next dev` localmente en http://localhost:3000
 * En `sst deploy`: despliega a AWS con CloudFront + Lambda@Edge + S3
 */

export const web = new sst.aws.Nextjs("Web", {
  path: "apps/web",
});
