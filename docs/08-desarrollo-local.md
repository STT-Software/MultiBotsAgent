# Desarrollo Local

## Guía Rápida para Nuevos Desarrolladores

### 1. Prerequisitos

Verificar que tienes instalado:

```bash
node --version    # >= 18
pnpm --version    # >= 9
docker --version  # Docker Desktop o Docker Engine
aws --version     # AWS CLI v2
```

### 2. Clonar e instalar

```bash
git clone <repo-url>
cd multibotagents
pnpm install
```

### 3. Configurar AWS

Necesitas credenciales configuradas para la cuenta de dev:

```bash
aws configure --profile multibotagents-dev
# Ingresar: Access Key, Secret Key, Region (us-east-1)
```

### 4. Primer desarrollo

```bash
# Lambdas — ejecuta en tu máquina, conectado a AWS
sst dev --stage <tu-nombre>

# Servicios Fargate — ejecuta en Docker local
docker-compose up

# Frontend Next.js (desde la raíz)
pnpm --filter @multibotagents/web dev

# Servicio NestJS sin Docker (desde la raíz)
pnpm --filter @multibotagents/api-multi-bots dev
```

---

## Flujo de Desarrollo con Lambdas (`sst dev`)

```bash
sst dev --stage juan
```

Esto hace:

1. Crea recursos aislados en AWS para el stage "juan" (API Gateway, colas, etc.)
2. Los handlers Lambda se ejecutan en tu máquina local (Live Lambda Dev)
3. Se conectan a los recursos compartidos del entorno dev (BD, S3, secrets)
4. Cuando cambias un archivo handler, se recarga automáticamente

Cada desarrollador tiene su propio endpoint de API Gateway. No interfieren entre sí.

### Requisito previo

El entorno dev debe estar desplegado primero para que existan los recursos compartidos:

```bash
sst deploy --stage dev
```

Si no está desplegado, `sst dev` fallará al intentar referenciar recursos que no existen.

---

## Flujo de Desarrollo con Fargate (Docker Compose)

```bash
docker-compose up
```

Esto levanta los servicios NestJS en contenedores Docker locales. Los servicios se conectan a los recursos compartidos de AWS del entorno dev mediante variables de entorno.

### Configuración

Cada servicio tiene su propio `.env`:

```bash
# Copiar el ejemplo y completar con valores reales
cp apps/services/api-multi-bots/.env.example apps/services/api-multi-bots/.env
```

Variables típicas:

```env
NODE_ENV=development
PORT=3001
AWS_REGION=us-east-1
MONGO_URI=mongodb://...
```

### Hot-reload

El `docker-compose.yml` monta volúmenes para que los cambios en `src/` se reflejen automáticamente sin reconstruir el contenedor:

```yaml
volumes:
  - ./apps/services/api-multi-bots/src:/app/apps/services/api-multi-bots/src
  - ./packages:/app/packages # Paquetes compartidos también se montan
```

### Comandos útiles

```bash
docker-compose up                     # Levantar todos los servicios
docker-compose up api-multi-bots     # Levantar solo uno
docker-compose down                   # Detener todo
docker-compose build                  # Reconstruir imágenes
docker-compose logs -f api-multi-bots  # Ver logs de un servicio
```

---

## Flujo de Desarrollo con Next.js

```bash
# Desde la raíz (recomendado)
pnpm --filter @multibotagents/web dev

# O directamente
cd apps/web && pnpm dev
```

El frontend se ejecuta localmente en `http://localhost:3000`. Importa tipos y lógica de los paquetes compartidos directamente (sin build intermedio).

---

## Flujo de Desarrollo con NestJS sin Docker

```bash
# Desde la raíz (recomendado)
pnpm --filter @multibotagents/api-multi-bots dev

# O directamente
cd apps/services/api-multi-bots && pnpm dev
```

Ejecuta `nest start --watch` en `http://localhost:3001` con hot-reload. No necesita Docker. Si el servicio se conecta a recursos de AWS, necesitas credenciales configuradas y un archivo `.env` con las variables de conexión.

---

## Resumen de Puertos

| Servicio                            | Puerto   | Comando                                            |
| ----------------------------------- | -------- | -------------------------------------------------- |
| Next.js (web)                       | 3000     | `pnpm --filter @multibotagents/web dev`             |
| Example Service (NestJS sin Docker) | 3001     | `pnpm --filter @multibotagents/api-multi-bots dev` |
| Example Service (Docker)            | 3001     | `docker-compose up api-multi-bots`                |
| API Gateway (Lambdas)               | Dinámico | `sst dev --stage <nombre>` (URL en output)         |

---

## Flujo Completo de un Día de Trabajo

```bash
# 1. Levantar Lambdas con live reload
sst dev --stage juan

# 2. En otra terminal, levantar servicios Fargate (elegir una opción)
pnpm --filter @multibotagents/api-multi-bots dev   # Sin Docker
# o
docker-compose up                                   # Con Docker

# 3. En otra terminal, levantar el frontend
pnpm --filter @multibotagents/web dev

# 4. Desarrollar, los cambios se reflejan automáticamente

# 5. Al terminar el día (opcional: limpiar stage personal)
sst remove --stage juan
docker-compose down
```
