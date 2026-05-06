# Estructura del Proyecto

```
todo-list-poc/
├── apps/
│   ├── web/                          # Frontend Next.js (App Router)
│   ├── functions/                    # Lambda handlers (TypeScript nativo)
│   │   ├── src/
│   │   │   ├── handlers/            # Handlers organizados por dominio
│   │   │   │   ├── users/
│   │   │   │   │   ├── create.handler.ts
│   │   │   │   │   ├── get.handler.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   └── users.types.ts
│   │   │   │   └── orders/
│   │   │   │       ├── process.handler.ts
│   │   │   │       └── orders.service.ts
│   │   │   └── shared/              # Utilidades compartidas entre handlers
│   │   │       ├── middleware.ts
│   │   │       ├── error-handler.ts
│   │   │       └── logger.ts
│   │   ├── package.json             # Dependencias de TODAS las lambdas
│   │   └── tsconfig.json
│   └── services/                    # Servicios Fargate (NestJS)
│       └── example-service/         # Cada servicio en su propia carpeta
│           ├── src/
│           │   ├── main.ts
│           │   ├── app.module.ts
│           │   └── modules/
│           ├── Dockerfile
│           ├── package.json
│           └── tsconfig.json
│
├── infra/                           # Infraestructura SST v3 (transversal)
│   ├── src/
│   │   ├── app.ts                   # Orquestador: importa todos los recursos
│   │   ├── apis/                    # API Gateway + rutas Lambda
│   │   ├── databases/               # Definiciones de bases de datos
│   │   ├── storage/                 # S3 buckets
│   │   ├── services/                # Definiciones de Fargate
│   │   ├── events/                  # SQS, SNS, EventBridge
│   │   ├── networking/              # VPC, subnets
│   │   └── shared/                  # Secrets Manager, Parameter Store
│   ├── package.json
│   └── tsconfig.json
│
├── packages/                        # Código compartido entre apps
│   ├── types/                       # DTOs, interfaces, enums (@todo-list-poc/types)
│   ├── core/                        # Lógica de negocio pura (@todo-list-poc/core)
│   ├── db/                          # Esquemas y clientes BD (@todo-list-poc/db)
│   └── config/                      # tsconfig, eslint bases (@todo-list-poc/config)
│
├── docs/                            # Documentación detallada del proyecto
├── sst.config.ts                    # Entry point de SST (único archivo SST en raíz)
├── turbo.json                       # Configuración de Turborepo
├── pnpm-workspace.yaml              # Definición de workspaces
├── package.json                     # Package raíz del monorepo
├── docker-compose.yml               # Servicios Fargate para desarrollo local
└── ARCHITECTURE.md                  # Índice de documentación
```

## Descripción de cada directorio

| Directorio | Propósito |
|------------|-----------|
| `apps/web/` | Aplicación frontend Next.js con App Router |
| `apps/functions/` | Handlers Lambda en TypeScript nativo, organizados por dominio. Un solo `package.json` para todas las lambdas; esbuild bundlea cada handler independientemente |
| `apps/services/<nombre>/` | Servicios Fargate con NestJS. Cada servicio es un mini-proyecto independiente con su propio Dockerfile |
| `infra/` | Infraestructura SST v3 organizada por tipo de recurso. `src/app.ts` es el orquestador que importa todo |
| `packages/types/` | Interfaces, DTOs y enums compartidos entre frontend y backend. Type-safety end-to-end |
| `packages/core/` | Lógica de negocio pura. Sin dependencias de AWS. Usable en frontend, Lambdas y Fargate |
| `packages/db/` | Abstracción de acceso a datos con patrón de adaptadores (MongoDB, PostgreSQL, DynamoDB). Solo estructura por ahora |
| `packages/config/` | Configuraciones base de TypeScript y ESLint que extienden todas las apps y paquetes |
| `docs/` | Documentación detallada del proyecto, organizada por tema |
