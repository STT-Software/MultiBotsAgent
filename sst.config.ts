/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "multibotagents",
      removal: input.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile: "multibot",
        },
      },
    };
  },
  async run() {
    // Delega toda la definición de infraestructura al orquestador
    await import("./infra/src/app");
  },
});
