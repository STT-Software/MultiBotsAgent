# 10 — Docker y Servicios Fargate: Guía Completa

## Visión General

Los servicios Fargate (NestJS) se ejecutan localmente con Docker Compose. El `docker-compose.yml` en la raíz orquesta los contenedores, y cada servicio tiene su propio `Dockerfile` en `apps/services/<nombre>/`.

---

## Dockerfile — Explicación paso a paso

Ubicación: `apps/services/api-multi-bots/Dockerfile`

El Dockerfile usa **multi-stage build** (2 etapas) para optimizar el tamaño de la imagen final.

### Stage 1: `builder` — Compilación

```dockerfile
FROM node:18-alpine AS builder
```

Usa Node.js 18 sobre Alpine Linux (imagen ligera ~40MB).

```dockerfile
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
```

Activa pnpm 9.15.4 (la misma versión del monorepo) usando corepack de Node.js.

```dockerfile
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY apps/services/api-multi-bots/package.json ./apps/services/api-multi-bots/
```

Copia solo los `package.json` primero. Esto aprovecha el **cache de Docker**: si las dependencias no cambian, esta capa se reutiliza y no se reinstala todo.

```dockerfile
RUN pnpm install --frozen-lockfile
```

Instala dependencias exactas del lockfile (433 paquetes). `--frozen-lockfile` asegura reproducibilidad.

```dockerfile
COPY packages/ ./packages/
COPY apps/services/api-multi-bots/ ./apps/services/api-multi-bots/
```

Ahora sí copia el código fuente completo (paquetes compartidos + servicio).

```dockerfile
WORKDIR /app/apps/services/api-multi-bots
RUN pnpm run build
```

Ejecuta `nest build` → compila TypeScript a JavaScript en `dist/`.

### Stage 2: `production` — Imagen final

```dockerfile
FROM node:18-alpine AS production
```

Imagen limpia, sin el código fuente ni devDependencies del builder.

```dockerfile
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/services/api-multi-bots/package.json ./apps/services/api-multi-bots/
COPY --from=builder /app/apps/services/api-multi-bots/dist/ ./apps/services/api-multi-bots/dist/
```

Copia solo lo necesario del builder: configuración del monorepo, paquetes compartidos, y el `dist/` compilado.

```dockerfile
RUN pnpm install --frozen-lockfile --prod
```

Instala solo dependencias de producción (sin devDependencies como `@nestjs/cli`, `typescript`, etc.).

```dockerfile
EXPOSE 3001
CMD ["node", "dist/main"]
```

Expone el puerto 3001 y arranca el servicio compilado directamente con Node.js.

---

## docker-compose.yml — Explicación

Ubicación: raíz del monorepo

```yaml
services:
  api-multi-bots:
    build:
      context: . # Contexto = raíz del monorepo (necesario para acceder a packages/)
      dockerfile: apps/services/api-multi-bots/Dockerfile
      target: builder # ← USA SOLO EL STAGE 1 (builder), no la imagen de producción
```

El `target: builder` es clave: en desarrollo NO usa la imagen de producción. Usa el stage `builder` que tiene todas las devDependencies (incluyendo `ts-node-dev`).

```yaml
command: npx ts-node-dev --respawn --transpile-only src/main.ts
```

Sobreescribe el `CMD` del Dockerfile. Usa `ts-node-dev` para hot-reload: cada vez que cambias un archivo `.ts`, el servicio se reinicia automáticamente.

```yaml
working_dir: /app/apps/services/api-multi-bots
```

Establece el directorio de trabajo dentro del contenedor.

```yaml
volumes:
  - ./apps/services/api-multi-bots/src:/app/apps/services/api-multi-bots/src
  - ./packages:/app/packages
```

Monta el código fuente local dentro del contenedor. Esto permite que los cambios en tu editor se reflejen inmediatamente en el contenedor (hot-reload).

```yaml
ports:
  - "3001:3001"
```

Mapea el puerto 3001 del contenedor al 3001 de tu máquina. Accedes al servicio en `http://localhost:3001`.

```yaml
environment:
  - NODE_ENV=development
  - PORT=3001
  - AWS_REGION=${AWS_REGION:-us-east-1}
  - AWS_PROFILE=${AWS_PROFILE:-default}
env_file:
  - apps/services/api-multi-bots/.env
```

Variables de entorno: las inline tienen prioridad, y el `env_file` carga las del archivo `.env`.

---

## Credenciales AWS y Conexión a Recursos

### ¿Cuándo se necesitan?

Cuando el servicio accede a recursos de AWS desplegados por SST (MongoDB Atlas vía VPC, DynamoDB, S3, SQS, etc.). En desarrollo local, el servicio Docker se conecta a los recursos del **entorno dev compartido** en AWS.

### Opción 1: Variables de entorno en `.env` (recomendada para Docker)

```bash
# apps/services/api-multi-bots/.env
NODE_ENV=development
PORT=3001
AWS_REGION=us-east-1

# Credenciales explícitas (obtener de AWS IAM o SSO)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
# AWS_SESSION_TOKEN=...  # Solo si usas credenciales temporales (SSO/STS)

# Recursos del entorno dev (obtener de SST outputs o consola AWS)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/todo-list-dev
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
# S3_BUCKET_NAME=multibotagents-dev-mainbucket
# SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/queue-name
```

### Opción 2: Montar credenciales de AWS CLI

Si ya tienes AWS CLI configurado en tu máquina, puedes montar el directorio `~/.aws` en el contenedor. Agrega al `docker-compose.yml`:

```yaml
volumes:
  - ./apps/services/api-multi-bots/src:/app/apps/services/api-multi-bots/src
  - ./packages:/app/packages
  - ~/.aws:/root/.aws:ro # ← Monta credenciales de AWS CLI (solo lectura)
```

Esto permite usar `AWS_PROFILE` para seleccionar el perfil correcto:

```yaml
environment:
  - AWS_PROFILE=dev # Nombre del perfil en ~/.aws/credentials
```

### Opción 3: AWS SSO (credenciales temporales)

1. Ejecuta `aws sso login --profile dev` en tu terminal
2. Exporta las credenciales temporales:
   ```bash
   eval $(aws configure export-credentials --profile dev --format env)
   ```
3. Pásalas al contenedor vía `.env` o variables de entorno

### ¿De dónde salen los valores de los recursos?

Después de desplegar con `sst deploy --stage dev`, SST muestra los outputs:

```bash
sst deploy --stage dev

# Output ejemplo:
# MongoUri: mongodb+srv://...
# MainBucket: multibotagents-dev-mainbucket
# QueueUrl: https://sqs.us-east-1.amazonaws.com/...
```

También puedes consultarlos con:

```bash
sst shell --stage dev -- printenv | grep -i mongo
```

O directamente en la consola de AWS (CloudFormation → Stacks → Outputs).

---

## Cómo ejecutar correctamente

### Paso 1: Configurar el `.env`

```bash
cp apps/services/api-multi-bots/.env.example apps/services/api-multi-bots/.env
# Editar .env con los valores reales
```

### Paso 2: Levantar el servicio

```bash
# Levantar solo el api-multi-bots
docker compose up api-multi-bots

# Levantar todos los servicios definidos
docker compose up

# En background (detached)
docker compose up -d api-multi-bots
```

### Paso 3: Verificar que funciona

```bash
curl http://localhost:3001/health
# → {"status":"ok","service":"api-multi-bots"}
```

### Paso 4: Detener

```bash
docker compose down
```

### Rebuild (después de cambiar dependencias)

```bash
docker compose build api-multi-bots
docker compose up api-multi-bots
```

---

## Resumen del flujo

```
Tu editor (cambias código)
    ↓ (volume mount)
Contenedor Docker (ts-node-dev detecta cambio → hot-reload)
    ↓ (variables de .env)
Servicio NestJS en localhost:3001
    ↓ (credenciales AWS)
Recursos AWS del entorno dev (MongoDB, S3, SQS, etc.)
```

---

## Seguridad: Reglas importantes

- **NUNCA** commitear el archivo `.env` con credenciales reales (ya está en `.gitignore`)
- Usar `.env.example` como plantilla sin valores sensibles
- Preferir credenciales temporales (SSO/STS) sobre access keys permanentes
- Cada desarrollador configura su propio `.env` local
