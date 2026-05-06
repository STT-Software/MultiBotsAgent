# Visión General

Este proyecto es una plantilla base (scaffold) de monorepo cloud diseñada para servir como punto de partida para todos los proyectos futuros del equipo. Combina:

- **Turborepo + pnpm** como sistema de build y gestor de paquetes del monorepo
- **SST v3 (Ion)** como framework de infraestructura como código (usa Pulumi internamente)
- **Next.js** para el frontend web
- **TypeScript nativo** para handlers Lambda (sin framework, mínimo cold start)
- **NestJS** para servicios Fargate de larga duración
- **Paquetes compartidos** para tipos, lógica de negocio, esquemas de BD y configuraciones

El primer caso de uso es un PoC de lista de tareas (todo-list), pero la arquitectura es agnóstica a la aplicación.

---

## Decisiones de Diseño

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Gestor de monorepo | Turborepo + pnpm | Más ligero que NX, cacheo nativo, configuración mínima. Equipo de 3-5 personas. |
| IaC | SST v3 (Ion) | Gestión de estado propia, Live Lambda Dev, componentes de alto nivel para AWS. Usa Pulumi internamente. |
| Lambdas | TypeScript nativo | Mínimo overhead en cold start, sin capa de framework innecesaria. |
| Fargate | NestJS | Framework robusto para servicios de larga duración con DI y módulos. |
| Bundling Lambda | esbuild (vía SST) | Tree-shaking automático, bundle independiente por handler. |
| Base de datos | Abstracción con adaptadores | Solo estructura por ahora. Soporta MongoDB, PostgreSQL (Aurora Serverless), DynamoDB. |
| Entornos | dev + prod (cuentas separadas) | Aislamiento de cargas, escalable a staging/qa. |
| Scope del monorepo | `@multibotagents` | Reemplazable con el script `scripts/init.sh` para nuevos proyectos. |

---

## Prerequisitos

Antes de trabajar con este proyecto, asegúrate de tener instalado:

- **Node.js** >= 18 (recomendado: usar `nvm` con el `.nvmrc` del proyecto)
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** y **Docker Compose** (para servicios Fargate locales)
- **AWS CLI** v2 configurado con perfiles para las cuentas de dev y prod
- **SST CLI** (`pnpm add -g sst` o se usa desde el proyecto)
