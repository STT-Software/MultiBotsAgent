# AGENTS.md — multibotagents

Guía operativa para agentes de IA trabajando en este monorepo. Describe arquitectura, patrones y flujos de ejecución. Idioma del código, commits y comunicación: **español**. TypeScript strict en todo el monorepo.

---

## 1. Visión del proyecto

Plataforma cloud-native multibot: empresas activan agentes de IA (RAG, cotizador, agendamiento) sobre canales conversacionales (WhatsApp, panel web). Monorepo mixto con frontend, lambdas para eventos/webhooks, servicios para APIs de larga vida y capa de datos con patrón adaptador.

---

## 2. Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20 |
| Package manager | pnpm 9 |
| Monorepo | Turborepo |
| Lenguaje | TypeScript strict |
| Frontend | Next.js (App Router) + React + Tailwind |
| Lambdas | TypeScript nativo (sin framework) |
| Servicios | NestJS |
| LLM | LangChain + AWS Bedrock |
| Base de datos | MongoDB Atlas (con patrón adaptador para otros motores) |
| IaC | SST v3 (Ion/Pulumi) en AWS `us-east-1` |
| Testing | Vitest |
| Contenedores | Docker + Docker Compose |

---

## 3. Estructura del monorepo

```
apps/
  web/              → Frontend Next.js (Screaming Architecture)
  functions/        → AWS Lambda handlers nativos
  services/         → Servicios NestJS en Fargate

packages/
  types/            → Tipos, DTOs y enums compartidos
  core/             → Lógica de negocio pura (sin deps de AWS)
  db/               → Capa de datos con patrón adaptador
  config/           → tsconfig y eslint centralizados

infra/              → Infraestructura SST v3 por dominio de recursos
infra-docs/         → Documentación técnica del monorepo
Documentacion/      → Documentación funcional / producto
```

La raíz define `pnpm-workspace.yaml`, `turbo.json`, `sst.config.ts` y `docker-compose.yml`. El `package.json` raíz solo delega a `turbo run <task>` — nunca contiene lógica de tareas.

---

## 4. Arquitectura por área

### 4.1 Frontend — Screaming Architecture

La estructura **grita el dominio del negocio**, no la técnica. Cada feature es autocontenida.

```
apps/web/src/
├── app/                      → Routing Next.js (layouts, route groups, pages)
├── features/<dominio>/       → 🎯 DOMINIOS DE NEGOCIO
│   ├── <Feature>Container.tsx  → Entry point del feature
│   ├── components/             → UI del feature
│   ├── hooks/                  → Estado y lógica de presentación
│   ├── services/               → Llamadas HTTP
│   ├── types/                  → Tipos propios del feature
│   ├── constants/              → Labels, enums locales, datos estáticos
│   └── __tests__/
├── components/               → UI transversal (no pertenece a un feature)
└── lib/                      → Utilidades sin dominio
```

**Patrones**

- Las páginas en `app/` solo exportan `metadata` y renderizan el `Container` del feature correspondiente. No contienen lógica.
- React Server Components por defecto; `'use client'` solo cuando se necesitan hooks, estado o eventos del navegador.
- Llamadas HTTP siempre desde `features/<dominio>/services/`. Nada de `fetch` suelto en componentes.
- Estado local por feature con hooks de React (`useState`, `useMemo`, `useCallback`). Sin store global a menos que se justifique.
- Tipos compartidos con el backend viven en `packages/types` y se consumen como `@multibotagents/types`.
- Path alias `@/*` → `src/*`.

### 4.2 Lambdas — handlers nativos

Handlers TypeScript **sin framework**, tipando directamente los eventos AWS.

```
apps/functions/src/
├── handlers/<dominio>/<accion>.handler.ts   → Un archivo = un handler
└── shared/                                  → logger, middleware, error-handler
```

**Patrones**

- El handler solo orquesta entrada/salida y adapta errores. La lógica de negocio vive en `packages/core`; el acceso a datos en `packages/db`.
- Respuestas y errores se construyen con helpers compartidos (`successResponse`, `errorResponse`, `parseBody`).
- Las rutas se registran en `infra/src/apis/functions-api.ts`.

### 4.3 Servicios NestJS — arquitectura modular por dominio

NestJS con módulos organizados **por dominio de negocio**, no por capa técnica. Equivalente a Clean Architecture liviana: la lógica pura vive en `packages/core` y los módulos NestJS son la capa de adaptación/entrada.

```
apps/services/<servicio>/src/
├── main.ts                       → Bootstrap + Swagger
├── app.module.ts                 → Registra módulos de dominio
└── modules/<dominio>/
    ├── <dominio>.module.ts       → DI con tokens
    ├── <dominio>.controller.ts   → HTTP + Swagger
    ├── <dominio>.service.ts      → Adaptador NestJS → servicios de core
    ├── dto/                      → class-validator + @ApiProperty
    ├── providers/                → Adaptadores a servicios externos (LLM, BD, etc.)
    ├── services/                 → Helpers del dominio (inyectables)
    ├── exceptions/               → Excepciones del dominio
    ├── constants/                → Injection tokens (Symbol)
    └── __tests__/
```

**Patrones**

- Un módulo por dominio; módulos desacoplados y enfocados (single responsibility).
- Inyección de dependencias por **interfaces** usando tokens `Symbol` (no strings).
- Repository pattern: los repos se consumen desde `@multibotagents/db` detrás de interfaces.
- DTOs con `class-validator` y `@ApiProperty`; Swagger expuesto en `/docs`.
- Errores de dominio tipados (extienden `DomainError`) mapeados a códigos HTTP en el controller.
- Transacciones atómicas para flujos multi-documento con `abortTransaction` explícito en error.

### 4.4 Capa compartida — `packages/*`

**`@multibotagents/types`** — Solo interfaces, DTOs y enums. Sin lógica ni dependencias de runtime pesadas. Regla: tipo usado por ≥2 apps → aquí; tipo de una sola app → local en esa app.

**`@multibotagents/core`** — Lógica de negocio pura. Prohibido importar `aws-sdk`, `aws-lambda`, `sst`, `@nestjs/*` o `next`. Los servicios reciben dependencias por constructor tipadas por interfaces, lo que los hace reutilizables desde lambdas, NestJS y el frontend.

**`@multibotagents/db`** — Patrón adaptador: una interfaz `Repository<T>` común y adaptadores concretos por motor (`adapters/mongodb/`, `adapters/postgresql/`, `adapters/dynamodb/`). Cada adaptador define sus esquemas, índices y validación junto al código. Migraciones ejecutables vía script.

**`@multibotagents/config`** — tsconfig y eslint base. Cada paquete/app extiende `tsconfig.nextjs.json` o `tsconfig.node.json` según su runtime.

---

## 5. Infraestructura (SST v3)

`sst.config.ts` delega a `infra/src/app.ts`, que importa los recursos en un orden fijo (la importación crea el recurso en Pulumi).

```
infra/src/
├── app.ts              → Orquestador (orden de creación)
├── helpers/            → Utilidades de stage
├── networking/         → VPC, subnets, NAT
├── shared/             → Secrets, cross-cutting concerns
├── databases/          → Conexiones y secrets de BD
├── services/           → Cluster ECS + servicios Fargate
├── apis/               → API Gateway (lambdas y servicios)
└── frontend/           → Deploy del frontend
```

**Patrones**

- Cada recurso en su archivo, exportado como constante. Se importa en `app.ts` en el bloque correspondiente para que se cree.
- Valores sensibles con `sst.Secret` — nunca hardcodeados ni en `.env` commiteados.
- Los servicios declaran sus `permissions` y `environment` junto a su definición de infra.
- **Stages**: cada desarrollador tiene el suyo (`sst dev --stage <nombre>`); `dev` es compartido; `prod` aplica `removal: "retain"`. Nunca usar `prod` para desarrollo.

---

## 6. Turborepo

Tareas definidas en `turbo.json` y ejecutadas vía `turbo run`:

- **`build`** — depende de `^build`; produce `dist/**` y `.next/**`.
- **`dev`** — no cachea, persistente.
- **`transit`** — transit node: genera tipos en paralelo para que `lint` y `type-check` tengan las declaraciones de paquetes dependientes sin correr el build completo.
- **`lint`** y **`type-check`** — dependen de `transit`.
- **`clean`** — no cachea.

Cada `package.json` define sus propios scripts. El `package.json` raíz solo invoca `turbo run`.

---

## 7. Convenciones de código

- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- Evitar `any`; parámetros no usados se prefijan con `_`.
- Imports por paquete con `@multibotagents/<pkg>`. Nunca navegar al `dist` de otro paquete con rutas relativas.
- Barrel files (`index.ts`) en subcarpetas de features y en dominios de los packages.
- Errores de dominio con `code` + `statusCode`; el borde (controller/handler) los mapea a HTTP.
- Logging estructurado en JSON. Nunca loguear passwords, tokens ni PII.
- Comentarios y mensajes al usuario en español. Timestamps en ISO 8601.
- IDs de Mongo se convierten `ObjectId ↔ string` en la frontera del adaptador; nunca fuera.

---

## 8. Comandos

### Setup

```bash
nvm use
pnpm install
pnpm run type-check
pnpm run build
```

### Desarrollo local (3 terminales)

```bash
# Terminal 1 — lambdas con live reload + recursos efímeros
sst dev --stage <tu-nombre>

# Terminal 2 — servicio NestJS
pnpm --filter @multibotagents/api-multi-bots dev      # o: docker compose up

# Terminal 3 — frontend
pnpm --filter @multibotagents/web dev                 # http://localhost:3000
```

### Filtrar por paquete

```bash
pnpm --filter @multibotagents/<paquete> <script>
```

### Tests

```bash
pnpm --filter <paquete> test
```

### Base de datos

```bash
pnpm --filter @multibotagents/db migrate
```

### SST

```bash
sst dev     --stage <tu-nombre>
sst deploy  --stage <stage>
sst remove  --stage <tu-nombre>
sst refresh --stage <stage>
sst secrets list/set/remove --stage <stage>
sst console
```

Operaciones como `sst remove`, `sst deploy --stage prod` y `sst secrets remove` son de alto impacto: confirmar con el usuario antes de ejecutar.

---

## 9. Testing

- Vitest en todo el monorepo. Archivos `*.test.ts[x]` o `*.spec.ts`, agrupados en `__tests__/` junto al código.
- Frontend: `jsdom` + `@testing-library/react`.
- NestJS: `unplugin-swc` para decoradores; `Test.createTestingModule` con providers mockeados.
- `packages/core` usa property-based tests con `fast-check`. Avisar al usuario antes de correrlos (pueden ser lentos).
- Cobertura con provider `v8`, excluyendo `*.spec.ts`, `*.test.ts` e `index.ts`.

No agregar tests sin que el usuario los pida, pero sí actualizar los existentes cuando se modifica código cubierto.

---

## 10. Flujos recurrentes

**Agregar un feature en el frontend** — crear `apps/web/src/features/<dominio>/` con la plantilla de carpetas; crear la página en `app/.../page.tsx` renderizando solo el `Container`; colocar tipos compartidos en `packages/types` si también los consume el backend.

**Agregar un handler Lambda** — crear `apps/functions/src/handlers/<dominio>/<accion>.handler.ts` con la lógica delegada a `packages/core`; registrar la ruta en `infra/src/apis/functions-api.ts`.

**Agregar un endpoint NestJS** — si es un dominio nuevo, crear `src/modules/<dominio>/`; mover la lógica pura a `packages/core/src/<dominio>/`; nuevos repos en `packages/db/src/adapters/mongodb/` con sus esquemas en `packages/db/src/schemas/`; registrar el módulo en `app.module.ts`.

**Agregar un servicio Fargate** — crear `apps/services/<nombre>/` siguiendo la misma estructura NestJS; definir el recurso en `infra/src/services/` e importarlo en `infra/src/app.ts`; exponerlo vía API Gateway; agregarlo al `docker-compose.yml` si se usará en local.

**Agregar un secret** — `sst secrets set` por cada stage, declararlo en `infra/src/shared/secrets.ts` y pasarlo al recurso en `environment` o `link`.

**Agregar un adaptador de BD** — implementar `Repository<T>` en `packages/db/src/adapters/<motor>/`, definir esquemas equivalentes, declarar el recurso en `infra/src/databases/<motor>.ts`.

---

## 11. Verificación antes de dar por terminada una tarea

1. `type-check` limpio en el paquete tocado.
2. `lint` sin errores nuevos.
3. Tests verdes en el área tocada si existían.
4. Si se modificó `packages/core`, `packages/db` o `packages/types`: `pnpm run build` completo para validar el graph.
5. Si se tocó infra: revisar cambios antes de hacer deploy.
6. Comentarios y commits en español.
7. Operaciones destructivas o de alto impacto: confirmar con el usuario antes de ejecutar.

---

## Screaming Architecture (Patrón obligatorio para features)

Se usa **Screaming Architecture** en todo el proyecto. "Las carpetas gritan su propósito": la organización está centrada en capacidades del producto, no en tipos de archivos.

Referencias:
- https://github.com/juanF18/screaming-architecture-react-native
- https://github.com/juanF18/SGR-Frontend

### Estructura por Feature

```
src/
  features/
    <nombre-feature>/
      ├── components/       # Componentes UI específicos del feature
      │   └── index.ts      # Barrel export
      ├── hooks/            # Lógica de negocio reutilizable
      │   └── index.ts
      ├── services/         # Conexión con APIs/externos
      │   └── index.ts
      ├── context/          # Context API si el feature lo requiere
      ├── types/            # Tipos TS específicos del feature
      │   └── index.ts
      └── <Feature>Container.tsx  # Contenedor principal del feature
  components/               # Componentes compartidos (reutilizables entre features)
  hooks/                    # Hooks compartidos globales
  providers/                # Providers globales (Theme, Auth, etc.)
  types/                    # Tipos globales compartidos
```

### Flujo de datos (unidireccional)

```
Contenedor Routeado (page/route) → Contenedor UI (FeatureContainer)
  → Componentes UI → Hook de Negocio → Servicio API → Backend
```

### Reglas de oro

1. **Flujo unidireccional**: UI → Hook (opcional) → Service → Backend. No saltarse capas.
2. **Componentes específicos** del feature van dentro de `features/<nombre>/components/`. Componentes compartidos van en `src/components/`.
3. **Hooks de negocio** nunca importan componentes. Pueden consumir servicios y contextos.
4. **Services** encapsulan toda comunicación con sistemas externos (HTTP, storage, etc.).
5. **Types** siempre tipados. Prohibido usar `any`. Usar `unknown` si el tipo es incierto.
6. **Dependencias internas**: un feature solo puede importar de:
   - Sus propios archivos
   - Features más abstractos (ej: `shared/`)
   - Componentes/hooks/types globales (`src/components/`, `src/hooks/`, `src/types/`)
   - Librerías externas

### Context API (manejo de estado)

- Contextos modulares y específicos por feature.
- Patrón `useXContext()` para encapsular acceso seguro al contexto.
- Providers colocados solo donde se necesitan (no envolver toda la app innecesariamente).
- Composición limpia entre contextos y el router.

```typescript
// Patrón de Context por feature
const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  return (
    <FeatureContext.Provider value={{ state, setState }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeatureContext = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error("useFeatureContext must be used within a FeatureProvider");
  }
  return context;
};
```

### Aplicación en este monorepo

| App/Paquete | Aplicación de Screaming Architecture |
|-------------|--------------------------------------|
| `apps/web/` (Next.js) | `src/features/<feature>/` con components, hooks, services, types |
| `apps/functions/` (Lambdas) | `src/handlers/<dominio>/` ya sigue el patrón por dominio |
| `apps/services/` (NestJS) | Módulos NestJS organizados por dominio/feature |
| `packages/core/` | Lógica de negocio organizada por dominio |

### Beneficios

| Ventaja | Descripción |
|---------|-------------|
| Descubribilidad | Todo lo relacionado a un feature está en su carpeta |
| Reusabilidad | Hooks y services se pueden reutilizar entre plataformas |
| Testabilidad | Se puede mockear cada capa fácilmente |
| Escalabilidad | Nuevos features copian la misma estructura |

---

## 12. Documentación complementaria

- `infra-docs/` — Documentación técnica del monorepo e infraestructura (10 secciones numeradas + `ARCHITECTURE.md` + guía Turborepo).
- `Documentacion/plataforma-agentes-conversacionales/` — Documentación funcional y de producto.
- `README.md` — Overview de alto nivel.

**Orden de consulta para una tarea nueva:**

1. Este `AGENTS.md` (arquitectura y convenciones).
2. `infra-docs/` si la tarea es de infra o monorepo.
3. `Documentacion/` si es una feature de producto.
4. Código existente del dominio más cercano (la mejor referencia).
