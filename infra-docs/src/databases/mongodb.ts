/**
 * MongoDB — Conexión a MongoDB Atlas (cluster DevMultiBot).
 *
 * Usa SST Secrets para almacenar la URI de conexión de forma segura.
 * La URI se configura por stage con: `sst secrets set MongoDbUri "<uri>" --stage <stage>`
 *
 * Los servicios (Lambdas, Fargate) que necesiten acceso a MongoDB
 * deben vincular este secret usando `link: [mongoDbUri]`.
 */

export const mongoDbUri = new sst.Secret("MongoDbUri");
