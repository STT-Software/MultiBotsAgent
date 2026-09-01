/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "multibotagents",
      removal: input.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          // Fijado para alinear con el estado del stage compartido `dev`:
          // - 6.66.2 falla al leer los buckets S3 ("missing expected [").
          // - 6.83.x no puede leer aws_instance, cuyo estado está en versión 2.
          version: "7.44.0",
          region: "us-east-1",
          profile: "multibot",
          defaultTags: {
            tags: {
              Project: "multibotagents",
              Stage: input.stage,
              ManagedBy: "sst",
            },
          },
        },
      },
    };
  },
  async run() {
    // Delega toda la definición de infraestructura al orquestador
    await import("./infra/src/app");
  },
  });
