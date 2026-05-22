# Stage 1: Build
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY apps/services/api-multi-bots/package.json ./apps/services/api-multi-bots/

# Instalar dependencias (shamefully-hoist para compatibilidad con nest build en Docker)
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copiar código fuente
COPY packages/ ./packages/
COPY apps/services/api-multi-bots/ ./apps/services/api-multi-bots/

# Build de paquetes internos (orden: types → core, db)
WORKDIR /app/packages/types
RUN pnpm run build

WORKDIR /app/packages/core
RUN pnpm run build

WORKDIR /app/packages/db
RUN pnpm run build

# Build del servicio NestJS
WORKDIR /app/apps/services/api-multi-bots
RUN pnpm run build

# Stage 2: Production
FROM node:24-alpine AS production

RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/services/api-multi-bots/package.json ./apps/services/api-multi-bots/
COPY --from=builder /app/apps/services/api-multi-bots/dist/ ./apps/services/api-multi-bots/dist/

RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

WORKDIR /app/apps/services/api-multi-bots

EXPOSE 3001

CMD ["node", "dist/main"]
