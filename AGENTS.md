# AGENTS.md — multibotagents

Monorepo cloud-native para una aplicación MultiBotAgents. Stack: Turborepo + pnpm, SST v3 (Ion/Pulumi) en AWS, Next.js 15 (App Router), Lambdas TypeScript nativas, NestJS en Fargate, MongoDB.

## Estructura del monorepo

```
apps/
  web/              → Frontend Next.js 15 (App Router)
  functions/        → AWS Lambda handlers (TypeScript nativo, sin framework)
  services/         → Servicios Fargate (NestJS)
packages/
  types/            → @multibotagents/types — tipos compartidos
  core/             → @multibotagents/core — lógica de negocio (sin deps AWS)
  db/               → @multibotagents/db — capa de BD con adaptadores (MongoDB, PostgreSQL, DynamoDB)
  config/           → @multibotagents/config — tsconfig y eslint centralizados
infra/              → Infraestructura SST v3 (apis, databases, events, networking, services, storage, shared)
docs/               → Documentación de arquitectura (10 secciones + ARCHITECTURE.md)
```

## Comandos de setup

```bash
pnpm install                    # Instalar dependencias de todo el monorepo
pnpm run build                  # Build de todas las apps (Next.js + NestJS)
pnpm run type-check             # Verificación de tipos en todo el monorepo
pnpm run lint                   # Lint de todo el monorepo
pnpm run clean                  # Limpiar builds y node_modules
```

## Desarrollo local

```bash
# Terminal 1: Lambdas con live reload
sst dev --stage <tu-nombre>

# Terminal 2: Servicio NestJS
pnpm --filter @multibotagents/api-multi-bots dev   # Sin Docker
docker compose up                                   # Con Docker

# Terminal 3: Frontend Next.js
pnpm --filter @multibotagents/web dev
```

## Filtrar comandos por paquete

```bash
pnpm --filter @multibotagents/web <comando>
pnpm --filter @multibotagents/core <comando>
pnpm --filter @multibotagents/functions <comando>
```

## Convenciones de código

- TypeScript strict mode en todo el monorepo.
- Configuraciones de tsconfig y eslint centralizadas en `packages/config/`.
- Cada paquete extiende las configuraciones base de `@multibotagents/config`.
- Turbo tasks: `build`, `dev`, `lint`, `type-check`, `transit`, `clean`.
- El task `lint` y `type-check` dependen de `transit` (generación de tipos).

## Patrones de arquitectura

- Lambdas: handlers nativos en `apps/functions/src/handlers/<dominio>/<accion>.handler.ts`. Sin framework, tipado directo de eventos AWS.
- Servicios Fargate: NestJS en `apps/services/<nombre>/`. Cada servicio tiene su propio `Dockerfile`.
- Lógica de negocio: siempre en `packages/core/`, sin dependencias de AWS. Los handlers y servicios consumen core.
- Tipos compartidos: definir en `packages/types/` para que sean consumidos por todas las apps y paquetes.
- Capa de BD: `packages/db/` usa patrón adaptador (MongoDB, PostgreSQL, DynamoDB).

## Infraestructura (SST v3)

- Config raíz: `sst.config.ts` → delega a `infra/src/app.ts`.
- Recursos organizados en: `apis/`, `databases/`, `events/`, `networking/`, `services/`, `storage/`, `shared/`.
- Stages: cada dev usa su propio stage (`sst dev --stage <nombre>`). `prod` tiene política `retain`.
- Región: `us-east-1`.
- Deploy: `sst deploy --stage dev` / `sst deploy --stage prod`.
- Eliminar: `sst remove --stage <nombre>`.

## Comandos SST v3

### Desarrollo local (live reload)

```bash
sst dev --stage <tu-nombre>           # Arranca entorno de desarrollo con live reload
sst dev --stage <tu-nombre> --verbose # Modo verbose para depuración
```

> Cada desarrollador usa su propio stage personal. Nunca usar `prod` para desarrollo.

### Deploy

```bash
sst deploy --stage dev                # Deploy al stage de desarrollo compartido
sst deploy --stage prod               # Deploy a producción (recursos con política retain)
sst deploy --stage <tu-nombre>        # Deploy a un stage personal
```

### Eliminar stacks

```bash
sst remove --stage <tu-nombre>        # Elimina todos los recursos del stage
```

> Precaución: `sst remove` destruye todos los recursos del stage. En `prod` los recursos con `retain` se conservan.

### Inspección y diagnóstico

```bash
sst version                           # Verificar versión de SST instalada
sst secrets list --stage <stage>      # Listar secrets configurados en un stage
sst secrets set <KEY> <value> --stage <stage>  # Configurar un secret
sst secrets remove <KEY> --stage <stage>       # Eliminar un secret
```

### Consola SST

```bash
sst console                           # Abre la consola web de SST para monitoreo
```

### Refresh de estado

```bash
sst refresh --stage <stage>           # Sincroniza el estado de SST con los recursos reales en AWS
```

> Útil cuando se modifican recursos manualmente en la consola de AWS o hay drift.

## Agregar nuevos componentes

### Nuevo handler Lambda

1. Crear carpeta en `apps/functions/src/handlers/<dominio>/`.
2. Crear `<accion>.handler.ts` con el patrón de handler nativo.
3. Definir la ruta en `infra/src/apis/main-api.ts`.

### Nuevo servicio Fargate

1. Crear carpeta en `apps/services/<nombre-servicio>/`.
2. Inicializar NestJS con `package.json`, `tsconfig.json`, `Dockerfile`.
3. Agregar al `docker-compose.yml`.
4. Definir en `infra/src/services/workers.ts`.

## Prerequisitos

- Node.js >= 18 (recomendado: usar `nvm`)
- pnpm >= 9.x (`npm install -g pnpm`)
- Docker y Docker Compose
- AWS CLI v2 configurado
- SST CLI

## Documentación adicional

La documentación completa de arquitectura está en `docs/` (10 archivos numerados) y en `docs/ARCHITECTURE.md`.
