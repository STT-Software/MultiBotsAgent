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
      notify(args: Record<string, unknown>): void;
      subscribeQueue(queueArn: string, args?: Record<string, unknown>): void;
      name: string;
      arn: string;
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
      subscribe(handler: string | Function, args?: Record<string, unknown>): void;
      arn: string;
      url: string;
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

/** Interpola Output<string> en template literals (equivalente a pulumi.interpolate) */
declare const $interpolate: (
  literals: TemplateStringsArray,
  ...placeholders: any[]
) => any;

/** Concatena strings y Output<string> (equivalente a pulumi.concat) */
declare function $concat(...args: any[]): any;
