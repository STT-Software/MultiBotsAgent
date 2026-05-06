# Aplicaciones

## `apps/web` — Frontend Next.js

Aplicación Next.js con App Router. Consume los paquetes compartidos `@multibotagents/types` y `@multibotagents/core`.

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   └── lib/
├── next.config.js        # transpilePackages para paquetes internos
├── tsconfig.json          # Extiende tsconfig.nextjs.json
├── .eslintrc.js           # Extiende eslint.nextjs.js
└── package.json
```

`next.config.js` incluye `transpilePackages` para que Next.js compile los paquetes internos del monorepo:

```js
const nextConfig = {
  transpilePackages: ["@multibotagents/types", "@multibotagents/core"],
};
```

---

## `apps/functions` — Lambda Handlers

Handlers Lambda en TypeScript nativo (sin framework). Organizados por dominio, cada dominio puede tener múltiples archivos.

```
apps/functions/
├── src/
│   ├── handlers/
│   │   ├── example/
│   │   │   ├── create.handler.ts     # Entry point → SST apunta aquí
│   │   │   ├── get.handler.ts
│   │   │   ├── example.service.ts    # Lógica específica del dominio
│   │   │   └── example.types.ts      # Tipos locales
│   │   └── otro-dominio/
│   │       └── ...
│   └── shared/
│       ├── error-handler.ts          # parseBody, successResponse, errorResponse
│       ├── logger.ts                 # Logger estructurado JSON
│       └── middleware.ts             # Utilidades de request
├── tsconfig.json
├── .eslintrc.js
└── package.json                      # Dependencias de TODAS las lambdas
```

### Cómo funciona el bundling

Un solo `package.json` centraliza todas las dependencias. Cuando SST hace el build, esbuild toma cada handler como entry point independiente y genera un bundle que solo incluye lo que ese handler importa (tree-shaking).

Si `create.handler.ts` usa `zod` pero no `axios`, su bundle solo lleva `zod`.

### Cómo SST identifica cada Lambda

En la definición de infraestructura (`infra/src/apis/`):

```typescript
const createExample = new sst.aws.Function("CreateExample", {
  handler: "apps/functions/src/handlers/example/create.handler",
});
```

### Patrón de handler

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { CreateExampleDto } from "@multibotagents/types";
import { validateCreateExample } from "@multibotagents/core";
import { parseBody, successResponse, errorResponse } from "../../shared/error-handler";
import { logger } from "../../shared/logger";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const dto = parseBody<CreateExampleDto>(event.body ?? null);
    const errors = validateCreateExample(dto);
    if (errors.length > 0) return errorResponse(errors.join(", "), 400);

    logger.info("Creando recurso", { dto });
    // TODO: usar Repository<T> para persistir
    return successResponse({ id: crypto.randomUUID(), ...dto }, 201);
  } catch (error) {
    logger.error("Error", error);
    return errorResponse("Error interno", 500);
  }
};
```

### Cómo agregar un nuevo handler Lambda

1. Crear carpeta en `apps/functions/src/handlers/<dominio>/`
2. Crear `<accion>.handler.ts` con el export `handler`
3. Si necesita lógica específica, agregar `<dominio>.service.ts`, `<dominio>.types.ts`, etc.
4. Registrar en `infra/src/apis/` con `new sst.aws.Function("Nombre", { handler: "apps/functions/src/handlers/<dominio>/<accion>.handler" })`
5. Si necesita dependencias nuevas, agregarlas al `package.json` de `apps/functions`

---

## `apps/services` — Servicios Fargate (NestJS)

Cada servicio es un mini-proyecto NestJS independiente con su propia carpeta, Dockerfile y dependencias.

```
apps/services/
└── api-multi-bots/
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   └── modules/
    │       └── health/
    │           ├── health.module.ts
    │           └── health.controller.ts
    ├── Dockerfile            # Multi-stage build (builder + production)
    ├── tsconfig.json          # Extiende tsconfig.node.json + decorators
    ├── .eslintrc.js
    └── package.json
```

### Dockerfile multi-stage

- Stage 1 (builder): Instala dependencias del monorepo, copia código, compila con `nest build`
- Stage 2 (production): Copia solo el `dist/` compilado y dependencias de producción

### Cómo agregar un nuevo servicio Fargate

1. Crear carpeta `apps/services/<nombre-servicio>/`
2. Crear `package.json` con nombre `@multibotagents/<nombre-servicio>` y dependencias a NestJS + paquetes internos
3. Crear `tsconfig.json` extendiendo la base con `emitDecoratorMetadata` y `experimentalDecorators`
4. Crear estructura NestJS: `src/main.ts`, `src/app.module.ts`, `src/modules/`
5. Crear `Dockerfile` basado en el ejemplo de `api-multi-bots`
6. Agregar el servicio al `docker-compose.yml` raíz para desarrollo local
7. Registrar en `infra/src/services/` para el despliegue en Fargate
8. Ejecutar `pnpm install` desde la raíz
