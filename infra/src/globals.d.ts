/**
 * Tipos globales de SST.
 *
 * SST inyecta estas variables globales en runtime.
 * Este archivo provee las declaraciones mínimas para que TypeScript
 * no falle cuando .sst/ no existe (antes del primer `sst dev`).
 *
 * Cuando ejecutas `sst dev` o `sst deploy`, SST genera tipos completos
 * en .sst/platform/config.d.ts con autocompletado de todos los componentes.
 */

declare namespace sst {
  namespace aws {
    class Nextjs {
      constructor(name: string, args?: Record<string, unknown>);
      url: string;
    }
    class Bucket {
      constructor(name: string, args?: Record<string, unknown>);
      static get(name: string, arn: string): Bucket;
      name: string;
      arn: string;
      notify(args: Record<string, unknown>): void;
    }
    class Function {
      constructor(name: string, args?: Record<string, unknown>);
      arn: string;
    }
    class ApiGatewayV2 {
      constructor(name: string, args?: Record<string, unknown>);
      route(path: string, handler: string | Record<string, unknown>): void;
      routePrivate(path: string, serviceArn: string): void;
      url: string;
    }
    class Queue {
      constructor(name: string, args?: Record<string, unknown>);
      arn: string;
      url: string;
      subscribe(handler: string | sst.aws.Function, args?: Record<string, unknown>): void;
    }
    class Cluster {
      constructor(name: string, args?: Record<string, unknown>);
    }
    class Service {
      constructor(name: string, args?: Record<string, unknown>);
      nodes: {
        cloudmapService: {
          arn: string;
        };
      };
      url: string;
    }
    class Vpc {
      constructor(name: string, args?: Record<string, unknown>);
    }
  }
  class Secret {
    constructor(name: string);
    value: string;
  }
}

declare const $app: {
  name: string;
  stage: string;
  removal: string;
};

declare const $dev: boolean;

/**
 * Interpolación de strings con Outputs de Pulumi.
 * Permite componer strings a partir de valores Output sin resolverlos manualmente.
 */
declare function $interpolate(
  literals: TemplateStringsArray,
  ...placeholders: unknown[]
): string;
