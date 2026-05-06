# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY apps/services/example-service/package.json ./apps/services/example-service/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/ ./packages/
COPY apps/services/example-service/ ./apps/services/example-service/

# Build
WORKDIR /app/apps/services/example-service
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/services/example-service/package.json ./apps/services/example-service/
COPY --from=builder /app/apps/services/example-service/dist/ ./apps/services/example-service/dist/

RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/apps/services/example-service

EXPOSE 3001

CMD ["node", "dist/main"]
