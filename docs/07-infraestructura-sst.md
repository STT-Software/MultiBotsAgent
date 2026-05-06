# Infraestructura SST v3

## Visión General

SST v3 (Ion) es el framework de infraestructura como código (IaC) del proyecto. Usa Pulumi internamente (no CloudFormation). El `sst.config.ts` vive en la raíz del monorepo como único archivo de SST fuera de `infra/`.

## Estructura

```
sst.config.ts                    # Entry point de SST (raíz del monorepo)
infra/
├── src/
│   ├── app.ts                   # Orquestador: importa todos los módulos en orden
│   ├── helpers/
│   │   └── stage.ts             # isPersonalStage(), isProduction()
│   ├── apis/
│   │   └── main-api.ts          # API Gateway + rutas Lambda
│   ├── databases/
│   │   └── mongodb.ts           # Definiciones de bases de datos
│   ├── storage/
│   │   └── buckets.ts           # S3 buckets
│   ├── services/
│   │   └── workers.ts           # Definiciones de Fargate
│   ├── events/
│   │   └── queues.ts            # SQS, SNS, EventBridge
│   ├── networking/
│   │   └── vpc.ts               # VPC, subnets
│   └── shared/
│       └── secrets.ts           # Secrets Manager, Parameter Store
├── package.json
└── tsconfig.json
```

## Flujo de ejecución

```
sst.config.ts → run() → import("./infra/src/app")
                              ↓
                         app.ts importa en orden:
                         1. networking/vpc
                         2. shared/secrets
                         3. storage/buckets
                         4. databases/mongodb
                         5. events/queues
                         6. apis/main-api
                         7. services/workers
```

El orden importa: los recursos base (VPC, secrets) se crean primero, luego almacenamiento y BD, luego eventos, y finalmente cómputo (APIs y servicios) que dependen de los anteriores.

## `sst.config.ts`

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "todo-list-poc",
      removal: input.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-1" },
      },
    };
  },
  async run() {
    await import("./infra/src/app");
  },
});
```

- `removal: "retain"` en prod evita borrar recursos accidentalmente
- `removal: "remove"` en otros stages permite limpieza fácil con `sst remove`

---

## Patrón de Recursos Compartidos vs Aislados

La función `isPersonalStage()` en `infra/src/helpers/stage.ts` determina el comportamiento:

```typescript
const REAL_ENVIRONMENTS = ["dev", "prod"];

export function isPersonalStage(stage: string): boolean {
  return !REAL_ENVIRONMENTS.includes(stage);
}
```

### Recursos compartidos (estado persistente)

En stages personales, se referencian los recursos del entorno dev. En entornos reales, se crean propios.

```typescript
import { isPersonalStage } from "../helpers/stage";

// S3 Bucket — compartido en stages personales
export const mainBucket = isPersonalStage($app.stage)
  ? sst.aws.Bucket.get("MainBucket", "arn:aws:s3:::todo-list-poc-dev-mainbucket")
  : new sst.aws.Bucket("MainBucket");
```

Recursos compartidos: bases de datos, S3, Secrets Manager, Parameter Store, VPC, CloudFront, ECR.

### Recursos aislados (cómputo/eventos)

Siempre se crean nuevos, independientemente del stage:

```typescript
// API Gateway — siempre aislado
export const api = new sst.aws.ApiGatewayV2("MainApi");

// SQS Queue — siempre aislada
export const queue = new sst.aws.Queue("ProcessingQueue");
```

Recursos aislados: Lambdas, API Gateway, SQS/SNS, Step Functions, EventBridge rules.

### Regla de decisión

| Tipo de recurso | Stage personal | Entorno real |
|----------------|---------------|-------------|
| Estado persistente (BD, S3, secrets) | Compartido (referencia a dev) | Propio |
| Cómputo/eventos (Lambda, API, colas) | Aislado (nuevo) | Propio |

---

## Estrategia de Entornos

| Entorno | Cuenta AWS | Stage | Comando |
|---------|-----------|-------|---------|
| Desarrollo personal | Dev | `sst dev --stage <nombre>` | Lambdas locales + recursos compartidos |
| Desarrollo (deploy) | Dev | `sst deploy --stage dev` | Todo desplegado como unidad |
| Producción | Prod | `sst deploy --stage prod` | Todo desplegado como unidad |

Cada entorno real vive en una cuenta AWS separada. Los stages personales comparten la cuenta de dev.

### Cómo agregar un nuevo entorno (staging, qa)

1. Agregar el nombre del stage a `REAL_ENVIRONMENTS` en `infra/src/helpers/stage.ts`:
   ```typescript
   const REAL_ENVIRONMENTS = ["dev", "staging", "prod"];
   ```
2. Configurar las credenciales AWS para la nueva cuenta
3. Desplegar: `sst deploy --stage staging`

No se necesitan cambios en el código de infraestructura. Solo la lista de entornos y las credenciales.

---

## Comandos Principales

```bash
# Desarrollo local — Lambdas ejecutan en tu máquina, conectadas a AWS
sst dev --stage <tu-nombre>

# Desplegar a un entorno
sst deploy --stage dev
sst deploy --stage prod

# Eliminar todos los recursos de un stage personal
sst remove --stage <tu-nombre>

# Ver el estado de los recursos
sst status
```

### Limpieza de stages personales

Cuando un desarrollador termina o quiere limpiar:

```bash
sst remove --stage juan
```

Esto elimina solo los recursos aislados (Lambdas, API Gateway, colas). Los recursos compartidos (BD, S3) no se tocan.

---

## Cómo agregar un nuevo tipo de recurso

1. Crear archivo en la carpeta correspondiente de `infra/src/` (ej: `infra/src/storage/cdn.ts`)
2. Usar el patrón compartido/aislado según el tipo de recurso
3. Exportar el recurso para que otros módulos puedan referenciarlo
4. Importar en `infra/src/app.ts` en el orden correcto
5. Si una Lambda necesita acceso, usar `link: [recurso]` en la definición de la función

## Uso de Pulumi directamente

Si SST no tiene un componente nativo para algo, puedes usar Pulumi directamente:

```typescript
import * as aws from "@pulumi/aws";

const customResource = new aws.someService.SomeResource("MyResource", {
  // configuración de Pulumi
});
```

Ambos (SST y Pulumi) coexisten en el mismo archivo sin problema.
