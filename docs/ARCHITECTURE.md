# Arquitectura — todo-list-poc

Documentación completa de la arquitectura del monorepo cloud. Cada sección está en un archivo separado dentro de `docs/` para facilitar la navegación y el mantenimiento.

## Inicio Rápido

### Prerequisitos

- Node.js >= 18 (recomendado: usar `nvm`)
- pnpm >= 9.x (`npm install -g pnpm`)
- Docker y Docker Compose
- AWS CLI v2 configurado con perfiles para dev y prod
- SST CLI (`pnpm add -g sst` o se usa desde el proyecto)

### Instalación

```bash
git clone <repo-url>
cd todo-list-poc
pnpm install
```

### Verificar que todo funciona

```bash
# Type-check de todo el monorepo (7 paquetes)
pnpm run type-check

# Lint de todo el monorepo (6 paquetes)
pnpm run lint

# Build (Next.js + NestJS)
pnpm run build
```

### Comandos principales

| Comando                       | Descripción                                   |
| ----------------------------- | --------------------------------------------- |
| `pnpm install`                | Instalar dependencias de todo el monorepo     |
| `pnpm run build`              | Build de todas las apps (Next.js + NestJS)    |
| `pnpm run dev`                | Dev servers de todas las apps                 |
| `pnpm run type-check`         | Verificación de tipos en todo el monorepo     |
| `pnpm run lint`               | Lint de todo el monorepo                      |
| `pnpm run clean`              | Limpiar builds y node_modules                 |
| `sst dev --stage <nombre>`    | Desarrollo local de Lambdas (Live Lambda Dev) |
| `sst deploy --stage dev`      | Desplegar entorno dev completo                |
| `sst deploy --stage prod`     | Desplegar entorno prod completo               |
| `sst remove --stage <nombre>` | Eliminar recursos de un stage                 |
| `docker-compose up`           | Levantar servicios Fargate localmente         |

### Flujo de trabajo diario

```bash
# Terminal 1: Lambdas con live reload
sst dev --stage <tu-nombre>

# Terminal 2: Servicio NestJS (elegir una opción)
pnpm --filter @todo-list-poc/example-service dev   # Sin Docker
# o
docker-compose up                                   # Con Docker

# Terminal 3: Frontend Next.js
pnpm --filter @todo-list-poc/web dev
```

### Agregar un nuevo handler Lambda

1. Crear carpeta en `apps/functions/src/handlers/<dominio>/`
2. Crear `<accion>.handler.ts` con el patrón de handler nativo
3. Definir la ruta en `infra/src/apis/main-api.ts`

### Agregar un nuevo servicio Fargate

1. Crear carpeta en `apps/services/<nombre-servicio>/`
2. Inicializar NestJS con `package.json`, `tsconfig.json`, `Dockerfile`
3. Agregar al `docker-compose.yml`
4. Definir en `infra/src/services/workers.ts`

---

## Índice de Documentación

| #   | Sección                                                               | Descripción                                                                 |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 01  | [Visión General](docs/01-vision-general.md)                           | Qué es este proyecto, decisiones de diseño, prerequisitos                   |
| 02  | [Estructura del Proyecto](docs/02-estructura-proyecto.md)             | Árbol de carpetas completo y descripción de cada directorio                 |
| 03  | [Configuración Raíz](docs/03-configuracion-raiz.md)                   | package.json, pnpm-workspace, turbo.json, grafo de dependencias             |
| 04  | [Configuraciones Compartidas](docs/04-configuraciones-compartidas.md) | `packages/config`: TypeScript y ESLint centralizados                        |
| 05  | [Paquetes Compartidos](docs/05-paquetes-compartidos.md)               | `types`, `core`, `db`: tipos, lógica de negocio, capa de BD con adaptadores |
| 06  | [Aplicaciones](docs/06-aplicaciones.md)                               | `apps/web`, `apps/functions`, `apps/services`                               |
| 07  | [Infraestructura SST](docs/07-infraestructura-sst.md)                 | `infra/`, stacks, entornos, recursos compartidos vs aislados                |
| 08  | [Desarrollo Local](docs/08-desarrollo-local.md)                       | `sst dev`, Docker Compose, flujo de trabajo                                 |
| 09  | [Comandos y Dependencias](docs/09-comandos-y-dependencias.md)         | Cómo ejecutar comandos, `--filter`, dónde instalar paquetes                 |
| 10  | [Docker y Servicios](docs/10-docker-y-servicios.md)                   | Dockerfile, docker-compose, credenciales AWS, ejecución local               |

## Stack Tecnológico

| Capa              | Tecnología                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Monorepo          | Turborepo + pnpm                                                 |
| IaC               | SST v3 (Ion) / Pulumi                                            |
| Frontend          | Next.js 15 (App Router)                                          |
| Lambdas           | TypeScript nativo (sin framework)                                |
| Fargate           | NestJS                                                           |
| Tipos compartidos | `@todo-list-poc/types`                                           |
| Lógica de negocio | `@todo-list-poc/core` (sin deps AWS)                             |
| Base de datos     | `@todo-list-poc/db` (adaptadores: MongoDB, PostgreSQL, DynamoDB) |
| Configuración     | `@todo-list-poc/config` (tsconfig + eslint centralizados)        |
