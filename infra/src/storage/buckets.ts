/**
 * Storage — S3 Buckets.
 *
 * Patrón compartido/aislado:
 * - Stages personales (sst dev): referencian el bucket del entorno dev
 * - Entornos reales (dev, prod): crean su propio bucket
 */

// TODO: Descomentar cuando se ejecute con SST (necesita el contexto de $app)
//
// import { isPersonalStage } from "../helpers/stage";
//
// export const mainBucket = isPersonalStage($app.stage)
//   ? sst.aws.Bucket.get("MainBucket", "arn:aws:s3:::multibotagents-dev-mainbucket")
//   : new sst.aws.Bucket("MainBucket");
