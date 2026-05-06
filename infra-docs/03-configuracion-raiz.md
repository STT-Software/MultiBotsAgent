# Configuración Raíz

## `package.json`

```json
{
  "name": "multibotagents",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

## `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "apps/services/*"
  - "packages/*"
  - "infra"
```

`apps/services/*` se declara por separado porque cada servicio Fargate es un workspace independiente dentro de `apps/services/`.

## `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "transit": {
      "dependsOn": ["^transit"]
    },
    "lint": {
      "dependsOn": ["transit"]
    },
    "type-check": {
      "dependsOn": ["transit"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- `^build` significa "primero buildea las dependencias internas antes de buildear este paquete"
- `dev` no se cachea y es persistente (procesos de larga duración como Next.js dev server)
- `outputs` define qué carpetas se cachean entre builds
- `!.next/cache/**` excluye el cache interno de Next.js del cache de Turborepo
- `transit` es un nodo de tránsito (Transit Node pattern): permite que `lint` y `type-check` corran en paralelo entre paquetes, pero mantiene la invalidación de cache correcta cuando cambia el código de una dependencia

## Grafo de Dependencias entre Paquetes

```
@multibotagents/config  ← Base (sin dependencias internas)
       ↑
@multibotagents/types   ← Depende de config
       ↑
@multibotagents/core    ← Depende de types + config
@multibotagents/db      ← Depende de types + config
       ↑
apps/web               ← Depende de types + core + config
apps/functions         ← Depende de types + core + db + config
apps/services/*        ← Depende de types + core + db + config
```
