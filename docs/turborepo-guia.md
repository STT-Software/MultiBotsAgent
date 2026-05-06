# Guía de Turborepo con pnpm — Monorepo desde cero

> Turborepo es un **orquestador de tareas** para monorepos. No reemplaza a pnpm, trabaja *encima* de él.
> pnpm maneja los paquetes y el workspace; Turborepo decide en qué orden ejecutar las tareas,
> cuáles corren en paralelo y qué resultados se pueden cachear.

---

## Tabla de contenidos

1. [Estructura del monorepo](#1-estructura-del-monorepo)
2. [Archivos de configuración clave](#2-archivos-de-configuración-clave)
3. [El pipeline y `dependsOn`](#3-el-pipeline-y-dependson)
4. [El sistema de caché](#4-el-sistema-de-caché)
5. [Referenciar packages entre sí](#5-referenciar-packages-entre-sí)
6. [Comandos esenciales](#6-comandos-esenciales)
7. [Propiedades de `turbo.json`](#7-propiedades-de-turbojson)
8. [Ejemplos punto a punto](#8-ejemplos-punto-a-punto)

---

## 1. Estructura del monorepo

Un monorepo con Turborepo sigue esta convención de carpetas:

```
my-monorepo/
├── apps/
│   ├── web/          ← Frontend (Next.js, Vite, etc.)
│   └── api/          ← Backend (Express, Hono, Fastify, etc.)
├── packages/
│   ├── ui/           ← Componentes compartidos
│   ├── config/       ← Configuraciones (tsconfig, eslint)
│   └── utils/        ← Helpers y utilidades compartidas
├── pnpm-workspace.yaml
├── package.json      ← Raíz (scripts globales + turbo como devDep)
└── turbo.json        ← Configuración de Turborepo
```

**Regla general:**
- `apps/` → aplicaciones que se despliegan (consumen packages)
- `packages/` → librerías internas (son consumidas por apps u otros packages)

---

## 2. Archivos de configuración clave

### `pnpm-workspace.yaml`

Le dice a pnpm dónde están los paquetes del workspace:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `package.json` raíz

Contiene los scripts globales y `turbo` como devDependency. **No va código de aplicación aquí.**

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### `turbo.json`

El cerebro de todo. Aquí defines el pipeline de tareas:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "*.json"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 3. El pipeline y `dependsOn`

Este es el concepto más importante de Turborepo.

### El operador `^` (caret)

| Sintaxis | Significado |
|---|---|
| `"^build"` | Las dependencias de workspace deben completar `build` primero |
| `"build"` | La tarea `build` del **mismo** paquete debe correr primero |
| `"lint"` | La tarea `lint` del mismo paquete debe correr primero |
| `"ui#build"` | El paquete `ui` específicamente debe completar `build` primero |

### Ejemplo visual del flujo

Con `"dependsOn": ["^build"]`, cuando corres `turbo run build`:

```
Paso 1 — packages corren en PARALELO (no dependen de nadie):
  ui: build  ──┐
  config: build ─┼──→  todos al mismo tiempo
  utils: build ─┘

Paso 2 — apps corren cuando sus deps terminaron:
  web: build   (espera a ui, config, utils)
  api: build   (espera a utils, config)
```

### Sin `^` — tarea en cascada del mismo paquete

```json
"test": {
  "dependsOn": ["build"]
}
```

Esto significa: dentro de `web`, primero corre `web: build` y luego `web: test`.

---

## 4. El sistema de caché

Antes de ejecutar cualquier tarea, Turborepo calcula un **hash** único basado en:

- El contenido de los archivos fuente del paquete
- Las variables de entorno declaradas en `env`
- Las dependencias del `package.json`
- La configuración de la tarea en `turbo.json`

Si el hash ya existe en caché → restaura los outputs y no ejecuta nada.

```
turbo run build
     │
     ▼
Calcula hash (archivos + env + deps)
     │
  ┌──┴──┐
  │     │
 HIT   MISS
  │     │
  │     ▼
  │  Ejecuta la tarea real
  │     │
  │     ▼
  │  Guarda outputs en caché
  │     │
  └──┬──┘
     │
     ▼
   Listo ✓
```

### Dónde se guarda el caché

- **Local:** `./node_modules/.cache/turbo` (por defecto)
- **Remoto:** Vercel Remote Cache, o tu propio servidor compatible

### Habilitar caché remoto (Vercel)

```bash
# Autenticarse con Vercel
npx turbo login

# Vincular el repo
npx turbo link
```

Luego en `turbo.json`:

```json
{
  "remoteCache": {
    "enabled": true
  }
}
```

### Ver si hubo hit o miss

Al correr cualquier tarea verás en la terminal:

```
web:build: cache hit, replaying logs  ← no ejecutó nada, restauró del caché
ui:build:  cache miss                 ← ejecutó la tarea y guardó en caché
```

### Forzar re-ejecución sin caché

```bash
turbo run build --force
```

---

## 5. Referenciar packages entre sí

### Declarar la dependencia con `workspace:`

En el `package.json` de la app que consume:

```json
{
  "name": "web",
  "dependencies": {
    "@mi-repo/ui": "workspace:*",
    "@mi-repo/utils": "workspace:*"
  }
}
```

El `workspace:*` le dice a pnpm "usa la versión local de este paquete, no la de npm".

### Configurar el `package.json` del package compartido

```json
{
  "name": "@mi-repo/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

> **Nota:** Apuntar directamente a `src/index.ts` funciona si las apps tienen TypeScript y entienden TS
> directamente. Si no, debes compilar primero y apuntar a `dist/`.

### Importar en el código

```typescript
// En apps/web/src/app/page.tsx
import { Button } from '@mi-repo/ui'
import { formatDate } from '@mi-repo/utils'

export default function Home() {
  return <Button>Click me — {formatDate(new Date())}</Button>
}
```

---

## 6. Comandos esenciales

### Instalación inicial

```bash
# Instalar todo desde la raíz (siempre desde la raíz)
pnpm install
```

### Correr tareas

```bash
# Todos los packages
pnpm turbo run build
pnpm turbo run dev
pnpm turbo run lint
pnpm turbo run test

# Solo un package específico
pnpm turbo run build --filter=web
pnpm turbo run build --filter=@mi-repo/ui

# Un package y todas sus dependencias (hacia abajo del grafo)
pnpm turbo run build --filter=web...

# Un package y todos los que dependen de él (hacia arriba)
pnpm turbo run build --filter=...@mi-repo/ui

# Ver el grafo de dependencias sin ejecutar nada
pnpm turbo run build --dry-run
```

### Agregar dependencias

```bash
# Dep a un package específico (siempre desde la raíz)
pnpm add react --filter=web
pnpm add typescript --filter=@mi-repo/config --save-dev

# Dep compartida en la raíz (herramientas de desarrollo globales)
pnpm add -w prettier --save-dev

# Un package del workspace como dep de otro
pnpm add @mi-repo/ui --filter=web --workspace
```

### Crear nuevo monorepo con la CLI

```bash
pnpm dlx create-turbo@latest
```

---

## 7. Propiedades de `turbo.json`

| Propiedad | Tipo | Para qué sirve |
|---|---|---|
| `dependsOn` | `string[]` | Define el orden de ejecución |
| `cache` | `boolean` | `false` para nunca cachear (ej: `dev`) |
| `persistent` | `boolean` | `true` para tareas de larga duración (`dev`, `watch`) |
| `outputs` | `string[]` | Qué guardar/restaurar del caché |
| `inputs` | `string[]` | Qué archivos determinan el hash del caché |
| `env` | `string[]` | Variables de entorno que afectan el hash |
| `passThroughEnv` | `string[]` | Env vars que se pasan pero NO afectan el hash |
| `interactive` | `boolean` | `true` si la tarea necesita stdin del usuario |

---

## 8. Ejemplos punto a punto

### Ejemplo 1 — Crear el monorepo desde cero

```bash
# 1. Crear la carpeta raíz
mkdir my-monorepo && cd my-monorepo

# 2. Inicializar pnpm
pnpm init

# 3. Crear la estructura de carpetas
mkdir -p apps/web apps/api packages/ui packages/utils packages/config

# 4. Crear pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# 5. Instalar turbo en la raíz
pnpm add turbo --save-dev -w

# 6. Crear turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {}
  }
}
EOF
```

---

### Ejemplo 2 — Configurar un package compartido (`@mi-repo/utils`)

```bash
# Crear package.json del package
cat > packages/utils/package.json << 'EOF'
{
  "name": "@mi-repo/utils",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
EOF

# Crear el código del package
mkdir packages/utils/src
cat > packages/utils/src/index.ts << 'EOF'
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}
EOF
```

---

### Ejemplo 3 — Configurar un package de UI (`@mi-repo/ui`)

```bash
# Instalar React como peerDependency
pnpm add react react-dom --filter=@mi-repo/ui --save-peer
pnpm add @types/react @types/react-dom --filter=@mi-repo/ui --save-dev

# package.json del package UI
cat > packages/ui/package.json << 'EOF'
{
  "name": "@mi-repo/ui",
  "version": "0.0.1",
  "main": "./src/index.tsx",
  "exports": {
    ".": "./src/index.tsx"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
EOF

# Crear componente de ejemplo
mkdir packages/ui/src
cat > packages/ui/src/button.tsx << 'EOF'
import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}
EOF

cat > packages/ui/src/index.tsx << 'EOF'
export { Button } from './button'
EOF
```

---

### Ejemplo 4 — Configurar `tsconfig` compartido (`@mi-repo/config`)

```bash
cat > packages/config/package.json << 'EOF'
{
  "name": "@mi-repo/config",
  "version": "0.0.1"
}
EOF

# tsconfig base compartido
cat > packages/config/tsconfig.base.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true
  }
}
EOF

# tsconfig para Next.js
cat > packages/config/tsconfig.nextjs.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF
```

---

### Ejemplo 5 — Conectar una app Next.js (`apps/web`)

```bash
# Crear la app con Next.js
cd apps/web
pnpm dlx create-next-app@latest . --typescript --tailwind --app

# Agregar las dependencias del workspace
cd ../..
pnpm add @mi-repo/ui --filter=web --workspace
pnpm add @mi-repo/utils --filter=web --workspace
pnpm add @mi-repo/config --filter=web --save-dev --workspace

# El package.json resultante de web se ve así:
```

```json
{
  "name": "web",
  "version": "0.0.1",
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "next lint",
    "start": "next start"
  },
  "dependencies": {
    "@mi-repo/ui": "workspace:*",
    "@mi-repo/utils": "workspace:*",
    "next": "14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@mi-repo/config": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

```bash
# tsconfig.json de web extendiendo el config compartido
cat > apps/web/tsconfig.json << 'EOF'
{
  "extends": "@mi-repo/config/tsconfig.nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
```

---

### Ejemplo 6 — Configurar el backend (`apps/api`)

```bash
# Inicializar el package del backend
cd apps/api
pnpm init
pnpm add hono --filter=api
pnpm add @mi-repo/utils --filter=api --workspace
pnpm add typescript tsx --filter=api --save-dev
cd ../..
```

```json
// apps/api/package.json
{
  "name": "api",
  "version": "0.0.1",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@mi-repo/utils": "workspace:*",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@mi-repo/config": "workspace:*",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono'
import { formatDate, slugify } from '@mi-repo/utils'

const app = new Hono()

app.get('/', (c) => {
  return c.json({
    message: 'API running',
    date: formatDate(new Date()),
  })
})

app.get('/slug/:title', (c) => {
  const title = c.req.param('title')
  return c.json({ slug: slugify(title) })
})

export default app
```

---

### Ejemplo 7 — Flujo de desarrollo diario

```bash
# Desde la raíz, levantar todo en desarrollo al mismo tiempo
pnpm dev
# Turborepo corre web:dev y api:dev en paralelo,
# mostrando los logs de ambos en la misma terminal

# Buildear todo
pnpm build
# Turbo buildea: config → utils → ui → (web y api en paralelo)

# Buildear solo la web y sus deps
pnpm turbo run build --filter=web...

# Si cambias algo en @mi-repo/ui y quieres ver qué paquetes se ven afectados
pnpm turbo run build --filter=...@mi-repo/ui --dry-run

# Correr lint solo en los paquetes que tienen cambios respecto a main
pnpm turbo run lint --filter=[main]

# Limpiar todos los dist/ y caches
pnpm turbo run clean --force
```

---

### Ejemplo 8 — Agregar un nuevo package desde cero

```bash
# 1. Crear la carpeta y el package.json
mkdir packages/validators
cat > packages/validators/package.json << 'EOF'
{
  "name": "@mi-repo/validators",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
EOF

# 2. Crear el código
mkdir packages/validators/src
cat > packages/validators/src/index.ts << 'EOF'
export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isPhoneNumber(phone: string): boolean {
  return /^\+?[\d\s\-()]{7,15}$/.test(phone)
}
EOF

# 3. Instalarlo en los paquetes que lo necesiten
pnpm add @mi-repo/validators --filter=web --workspace
pnpm add @mi-repo/validators --filter=api --workspace

# 4. pnpm install para actualizar los symlinks
pnpm install
```

---

### Ejemplo 9 — Variables de entorno con Turborepo

Las variables de entorno deben declararse en `turbo.json` para que afecten correctamente el hash del caché.

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": [
        "DATABASE_URL",
        "NEXT_PUBLIC_API_URL",
        "NODE_ENV"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "passThroughEnv": ["PORT", "DATABASE_URL"]
    }
  }
}
```

```bash
# Crear .env en la raíz (compartido)
cat > .env << 'EOF'
DATABASE_URL=postgresql://localhost:5432/mydb
EOF

# Crear .env en apps/web (específico de la app)
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
```

---

### Ejemplo 10 — Estructura final del `turbo.json` completo

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV", "DATABASE_URL", "NEXT_PUBLIC_API_URL"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "passThroughEnv": ["PORT", "DATABASE_URL", "NEXT_PUBLIC_API_URL"]
    },
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", ".eslintrc.*", "eslint.config.*"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/**", "*.config.*"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## Resumen mental del flujo completo

Cuando corres `pnpm turbo run build` desde la raíz:

1. Turbo lee el `turbo.json` y el grafo de dependencias de pnpm
2. Construye un **grafo dirigido acíclico (DAG)** de tareas respetando `dependsOn`
3. Por cada tarea, calcula un **hash único**
4. Revisa si ese hash existe en caché local (`./node_modules/.cache/turbo`)
5. **Cache HIT** → restaura los `outputs` y muestra los logs anteriores
6. **Cache MISS** → ejecuta la tarea real, guarda outputs en caché
7. Las tareas sin dependencia entre sí corren **en paralelo automáticamente**

**La regla de oro:** si solo cambias un archivo en `@mi-repo/ui`, solo `ui` y los paquetes que dependen de ella necesitan rebuildear. Todo lo demás sigue cacheado.

---

*Generado con Claude · Turborepo docs: https://turbo.build/repo/docs*
