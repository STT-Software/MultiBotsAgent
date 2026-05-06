# Configuraciones Compartidas (`packages/config`)

Este paquete centraliza las configuraciones de TypeScript y ESLint para todo el monorepo. Evita duplicación y garantiza consistencia.

## Estructura

```
packages/config/
├── tsconfig.base.json      # Opciones comunes de TypeScript (strict, esModuleInterop, etc.)
├── tsconfig.node.json      # Extiende base. Para Lambdas, NestJS, paquetes backend (target: ES2022, module: commonjs)
├── tsconfig.nextjs.json    # Extiende base. Para Next.js (jsx: preserve, module: esnext, plugin next)
├── eslint.base.js          # Reglas comunes de ESLint (@typescript-eslint)
├── eslint.node.js          # Extiende base. Para entornos Node.js
├── eslint.nextjs.js        # Extiende base. Para Next.js (next/core-web-vitals)
└── package.json
```

## Cómo usar desde una app o paquete

**TypeScript** — En el `tsconfig.json` de cada app/paquete:

```json
// Para apps/functions, apps/services/*, packages/types, packages/core, packages/db:
// Usar ruta relativa al archivo tsconfig.node.json de packages/config
{ "extends": "../../packages/config/tsconfig.node.json" }

// Para apps/web (Next.js):
{ "extends": "../../packages/config/tsconfig.nextjs.json" }
```

> Nota: TypeScript no resuelve `extends` con nombres de paquetes npm (`@multibotagents/config/...`). Se usan rutas relativas. La profundidad de la ruta depende de dónde esté el tsconfig (para `packages/*` es `../../packages/config/`, para `apps/*` también es `../../packages/config/`, para `apps/services/*/` es `../../../../packages/config/`).

**ESLint** — En el `.eslintrc.js` de cada app/paquete:

```js
// Para apps/functions, apps/services/*, packages/*:
module.exports = { extends: [require.resolve("@multibotagents/config/eslint.node.js")] };

// Para apps/web (Next.js):
module.exports = { extends: [require.resolve("@multibotagents/config/eslint.nextjs.js")] };
```

Si una app necesita opciones específicas, sobrescribe solo lo necesario sin tocar la base.
