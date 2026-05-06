# Comandos y Gestión de Dependencias

## Cómo ejecutar comandos en el monorepo

Turborepo orquesta la ejecución de tareas en todos los paquetes. Los scripts se definen en el `package.json` de **cada paquete**, y el root solo delega con `turbo run`.

### Ejecutar en todo el monorepo (desde la raíz)

```bash
# Type-check de los 7 paquetes en paralelo
pnpm run type-check

# Lint de los 6 paquetes que tienen script "lint"
pnpm run lint

# Build solo donde hay script "build" (web + example-service)
pnpm run build

# Dev servers de todas las apps
pnpm run dev
```

Turborepo se encarga de:

- Respetar el orden de dependencias (`@todo-list-poc/types` antes que `@todo-list-poc/core`)
- Ejecutar en paralelo lo que no tiene dependencias entre sí
- Cachear resultados para no repetir trabajo innecesario

### Ejecutar en un paquete específico (con `--filter`)

Desde la raíz, sin necesidad de cambiar de directorio:

```bash
# Frontend Next.js
pnpm --filter @todo-list-poc/web dev
pnpm --filter @todo-list-poc/web build
pnpm --filter @todo-list-poc/web lint

# Servicio NestJS (sin Docker)
pnpm --filter @todo-list-poc/example-service dev
pnpm --filter @todo-list-poc/example-service build

# Lambdas
pnpm --filter @todo-list-poc/functions type-check
pnpm --filter @todo-list-poc/functions lint

# Paquetes compartidos
pnpm --filter @todo-list-poc/types type-check
pnpm --filter @todo-list-poc/core lint
pnpm --filter @todo-list-poc/db type-check

# Infraestructura
pnpm --filter @todo-list-poc/infra type-check
```

### ¿Puedo entrar al directorio y ejecutar directamente?

Sí, funciona:

```bash
cd apps/web
pnpm dev
```

Pero pierdes el beneficio de que Turborepo buildee las dependencias primero si es necesario. La forma recomendada es siempre usar `--filter` desde la raíz.

---

## Ejecutar cada proyecto en desarrollo local

### Frontend (Next.js) — `http://localhost:3000`

```bash
# Opción recomendada (desde la raíz)
pnpm --filter @todo-list-poc/web dev

# Opción directa
cd apps/web && pnpm dev
```

No necesita AWS ni Docker. Los paquetes compartidos (`@todo-list-poc/types`, `@todo-list-poc/core`) se consumen directamente gracias a `transpilePackages` en `next.config.js`.

### Servicio NestJS sin Docker — `http://localhost:3001`

```bash
# Opción recomendada (desde la raíz)
pnpm --filter @todo-list-poc/example-service dev

# Opción directa
cd apps/services/example-service && pnpm dev
```

Ejecuta `nest start --watch` con hot-reload. No necesita Docker. Si el servicio se conecta a recursos de AWS (BD, colas, etc.), necesitas credenciales AWS configuradas y variables de entorno en un `.env`.

### Servicio NestJS con Docker — `http://localhost:3001`

```bash
# Todos los servicios
docker-compose up

# Solo uno
docker-compose up example-service
```

Útil cuando quieres simular el entorno de producción (Fargate) o cuando el servicio tiene dependencias de infraestructura local (Redis, bases de datos locales, etc.).

### Lambdas (Live Lambda Dev) — URL dinámica

```bash
sst dev --stage <tu-nombre>
```

Los handlers se ejecutan en tu máquina pero conectados a recursos reales de AWS. No hay forma de correr Lambdas 100% local sin AWS. Requiere que el entorno `dev` esté desplegado previamente (`sst deploy --stage dev`).

---

## Gestión de dependencias (¿dónde instalar qué?)

### Regla general

| ¿Qué es?                                                    | ¿Dónde se instala?         | Flag              |
| ----------------------------------------------------------- | -------------------------- | ----------------- |
| Herramienta del monorepo (eslint, turbo, typescript-eslint) | Raíz                       | `-Dw`             |
| Dependencia de una app o paquete específico                 | En ese workspace           | `--filter`        |
| Tipo de una librería (`@types/...`)                         | En el workspace que lo usa | `--filter` + `-D` |

### Ejemplos concretos

```bash
# ─── En la raíz (herramientas del monorepo) ───
pnpm add -Dw eslint                          # Linter compartido
pnpm add -Dw turbo                           # Build system
pnpm add -Dw @typescript-eslint/parser       # Parser de ESLint

# ─── En apps/web (frontend) ───
pnpm --filter @todo-list-poc/web add axios              # Dependencia runtime
pnpm --filter @todo-list-poc/web add -D @types/lodash   # Tipos (devDep)

# ─── En apps/functions (lambdas) ───
pnpm --filter @todo-list-poc/functions add zod           # Validación en handlers
pnpm --filter @todo-list-poc/functions add dayjs          # Manejo de fechas

# ─── En apps/services/example-service (NestJS) ───
pnpm --filter @todo-list-poc/example-service add @nestjs/config   # Config module
pnpm --filter @todo-list-poc/example-service add mongoose          # Driver de BD

# ─── En packages/core (lógica de negocio) ───
pnpm --filter @todo-list-poc/core add zod                # Validación pura (sin AWS)

# ─── En packages/db (capa de BD) ───
pnpm --filter @todo-list-poc/db add mongoose             # Adaptador MongoDB
```

### ¿Por qué no poner todo en la raíz?

1. **Bundling de Lambdas**: SST usa esbuild para bundlear cada handler. Si una dependencia está en el `package.json` de `apps/functions`, esbuild la incluye correctamente. Si está solo en la raíz, puede no resolverla.
2. **Claridad**: Cada workspace declara exactamente lo que necesita. No hay dependencias fantasma.
3. **Bundles más pequeños**: Solo se incluye lo que cada app realmente importa.
4. **Aislamiento**: Actualizar `mongoose` en un servicio no afecta a otro que usa una versión diferente.

### ¿Qué pasa con los paquetes internos del monorepo?

Los paquetes internos (`@todo-list-poc/types`, `@todo-list-poc/core`, etc.) se declaran como dependencias con `workspace:*`:

```json
{
  "dependencies": {
    "@todo-list-poc/types": "workspace:*",
    "@todo-list-poc/core": "workspace:*"
  }
}
```

Esto le dice a pnpm "usa la versión local del monorepo". No se descargan de npm. Turborepo usa estas declaraciones para saber el orden de build (`^build` solo buildea paquetes listados como dependencias).

### Resumen rápido de flags

| Flag                      | Significado                                | Ejemplo                                      |
| ------------------------- | ------------------------------------------ | -------------------------------------------- |
| `-w` o `--workspace-root` | Instalar en la raíz del monorepo           | `pnpm add -Dw eslint`                        |
| `-D`                      | Instalar como devDependency                | `pnpm add -D @types/node`                    |
| `--filter <nombre>`       | Instalar en un workspace específico        | `pnpm --filter @todo-list-poc/web add axios` |
| `workspace:*`             | Referencia a un paquete local del monorepo | En `package.json`                            |

---

## Docker: Ejecución de servicios Fargate

### Prerequisitos

- Docker y Docker Compose instalados
- Archivo `.env` configurado en el servicio (ver más abajo)

### Comandos esenciales

```bash
# ─── Levantar servicios ───
docker compose up                         # Todos los servicios
docker compose up example-service         # Solo uno
docker compose up -d example-service      # En background (detached)

# ─── Verificar que funciona ───
curl http://localhost:3001/health
# → {"status":"ok","service":"example-service"}

# ─── Ver logs (si está en background) ───
docker compose logs -f example-service

# ─── Detener ───
docker compose down

# ─── Rebuild (después de cambiar dependencias en package.json) ───
docker compose build example-service
docker compose up example-service

# ─── Rebuild forzado (sin cache) ───
docker compose build --no-cache example-service
```

### Configurar el `.env` antes de levantar

Cada servicio necesita su archivo `.env` con las variables de conexión:

```bash
cp apps/services/example-service/.env.example apps/services/example-service/.env
```

Editar `apps/services/example-service/.env` con los valores reales:

```dotenv
NODE_ENV=development
PORT=3001
AWS_REGION=us-east-1

# Credenciales AWS (necesarias cuando el servicio accede a recursos de AWS)
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=wJalr...

# Recursos del entorno dev (obtener de sst deploy outputs)
# MONGO_URI=mongodb+srv://...
# S3_BUCKET_NAME=todo-list-poc-dev-mainbucket
# SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/...
```

### Cómo funciona en desarrollo

Docker Compose usa el stage `builder` del Dockerfile (no la imagen de producción) y ejecuta `ts-node-dev` con hot-reload. Los volúmenes montan tu código local dentro del contenedor, así que los cambios en `src/` o `packages/` se reflejan automáticamente sin rebuild.

```
Tu editor → (volume mount) → Contenedor Docker → ts-node-dev detecta cambio → restart automático
```

Cuándo SÍ necesitas rebuild:

- Cambiaste dependencias en algún `package.json`
- Modificaste el `Dockerfile`
- Agregaste un nuevo paquete al monorepo

Cuándo NO necesitas rebuild:

- Cambiaste código en `src/`
- Cambiaste código en `packages/`

### Credenciales AWS para Docker

Tres opciones, de más simple a más segura:

1. **Variables en `.env`** — Poner `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` directamente en el `.env` del servicio.

2. **Montar `~/.aws`** — Agregar al `docker-compose.yml`:

   ```yaml
   volumes:
     - ~/.aws:/root/.aws:ro
   ```

   Y usar `AWS_PROFILE=dev` en las variables de entorno.

3. **AWS SSO (temporal)** — Ejecutar `aws sso login --profile dev`, exportar credenciales y pasarlas al `.env`.

Los valores de los recursos (URIs de BD, nombres de buckets, URLs de colas) se obtienen de los outputs de SST después de desplegar:

```bash
sst deploy --stage dev
# Los outputs muestran las URIs y nombres de recursos
```

---

## SST v3: Comandos de infraestructura

SST v3 (Ion/Pulumi) gestiona toda la infraestructura en AWS. La configuración raíz está en `sst.config.ts` y delega a `infra/src/app.ts`.

### Conceptos clave

- **Stage**: Cada desarrollador usa su propio stage (`<tu-nombre>`). Esto crea un stack aislado con todos los recursos (APIs, BD, colas, buckets, etc.).
- **Región**: Todos los stages se despliegan en `us-east-1`.
- **Política de retención**: En `prod`, los recursos críticos tienen política `retain` (no se destruyen al eliminar el stage).

### Desarrollo local (Live Lambda Dev)

```bash
sst dev --stage <tu-nombre>              # Arranca entorno con live reload
sst dev --stage <tu-nombre> --verbose    # Modo verbose para depuración
```

`sst dev` conecta tus handlers locales a recursos reales de AWS. Los cambios en código se reflejan al instante sin necesidad de redesplegar. La primera ejecución tarda más porque crea todos los recursos del stage.

> Cada dev debe usar su propio stage. Nunca usar `prod` ni el stage de otro compañero.

### Deploy de stacks

```bash
# ─── Deploy a un stage personal ───
sst deploy --stage <tu-nombre>

# ─── Deploy a entornos compartidos ───
sst deploy --stage dev                   # Entorno de desarrollo compartido
sst deploy --stage prod                  # Producción (recursos con retain)
```

Al finalizar, SST muestra los outputs del stack (URLs de APIs, nombres de buckets, URIs de BD, etc.). Estos valores son los que se configuran en los `.env` de los servicios Docker.

### Eliminar stacks

```bash
sst remove --stage <tu-nombre>           # Elimina TODOS los recursos del stage
```

> **Precaución**: `sst remove` destruye todos los recursos del stage, incluyendo bases de datos y buckets. En `prod`, los recursos con política `retain` se conservan en AWS (hay que eliminarlos manualmente si se desea).

Cuándo eliminar un stage:

- Ya no necesitas tu entorno personal de desarrollo
- Quieres empezar limpio después de cambios grandes en la infra
- Limpieza de stages huérfanos de devs que ya no están en el equipo

### Secrets

SST maneja secrets encriptados por stage. Se almacenan en AWS SSM Parameter Store.

```bash
# ─── Listar secrets de un stage ───
sst secrets list --stage <tu-nombre>

# ─── Configurar un secret ───
sst secrets set MONGO_URI "mongodb+srv://..." --stage <tu-nombre>
sst secrets set API_KEY "sk-..." --stage dev

# ─── Eliminar un secret ───
sst secrets remove API_KEY --stage <tu-nombre>
```

Los secrets se acceden en el código a través de los recursos de SST (linkeo automático). No necesitas leerlos manualmente de SSM.

### Refresh de estado

```bash
sst refresh --stage <tu-nombre>          # Sincroniza estado con AWS
```

Útil cuando:

- Se modificaron recursos manualmente en la consola de AWS
- Hay drift entre el estado de SST y los recursos reales
- Un deploy anterior falló a mitad de camino

### Consola SST

```bash
sst console                              # Abre la consola web de SST
```

La consola web permite monitorear invocaciones de Lambdas, ver logs en tiempo real y depurar errores sin salir del navegador.

### Verificar instalación

```bash
sst version                              # Muestra la versión instalada de SST
```

### Flujo típico de un nuevo desarrollador

```bash
# 1. Instalar dependencias del monorepo
pnpm install

# 2. Desplegar tu stage personal (primera vez tarda ~5 min)
sst deploy --stage <tu-nombre>

# 3. Copiar los outputs a los .env de los servicios Docker
#    (URIs de BD, nombres de buckets, URLs de colas)

# 4. Arrancar desarrollo local con live reload
sst dev --stage <tu-nombre>

# 5. En otra terminal, levantar el frontend
pnpm --filter @todo-list-poc/web dev

# 6. Cuando termines, puedes eliminar tu stage
sst remove --stage <tu-nombre>
```
