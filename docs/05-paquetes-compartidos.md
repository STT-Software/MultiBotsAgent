# Paquetes Compartidos

## `packages/types` — Tipos compartidos

Contiene interfaces, DTOs y enums que son consumidos por múltiples aplicaciones. Es TypeScript puro, sin dependencias de runtime. No se compila a JavaScript; cada consumidor lo resuelve directamente.

```
packages/types/
├── src/
│   ├── index.ts              # Re-exporta todo
│   ├── dtos/                 # Data Transfer Objects (request/response de APIs)
│   ├── interfaces/           # Interfaces de entidades de dominio
│   └── enums/                # Enums compartidos
├── tsconfig.json
└── package.json
```

**Regla fundamental:** Si un tipo lo usa más de una app → va en `packages/types`. Si solo lo usa una app → va local en esa app.

**Cómo importar desde cualquier app:**

```typescript
import type { CreateExampleDto, ExampleStatus } from "@multibotagents/types";
```

Funciona igual en Next.js, Lambdas y servicios NestJS.

---

## `packages/core` — Lógica de negocio pura

Contiene validaciones, transformaciones y reglas de negocio. Sin dependencias de AWS (`aws-sdk`, `@aws-sdk/*`, `aws-lambda`, `sst`). Usable en frontend, Lambdas y Fargate.

```
packages/core/
├── src/
│   ├── index.ts
│   └── validators/
├── tsconfig.json
└── package.json
```

**Cómo importar:**

```typescript
import { validateCreateExample } from "@multibotagents/core";
```

### Validación con Zod (opcional)

El scaffold no incluye Zod por defecto. Si el equipo decide usar validación compartida entre front y back, se recomienda:

1. Instalar `zod` como dependencia de `packages/core` (no de `packages/types`):
   ```bash
   cd packages/core && pnpm add zod
   ```

2. Definir schemas en `packages/core/src/validators/`:
   ```typescript
   // packages/core/src/validators/user.validator.ts
   import { z } from "zod";
   import type { CreateUserDto } from "@multibotagents/types";

   export const CreateUserSchema: z.ZodType<CreateUserDto> = z.object({
     name: z.string().min(1),
     email: z.string().email(),
   });
   ```

3. Los tipos puros siguen en `packages/types` (sin Zod). Los schemas de validación van en `packages/core`.

Esto mantiene `packages/types` sin dependencias de runtime, evitando que el frontend cargue librerías innecesarias. Si el equipo prefiere que cada app maneje su propia validación de forma independiente, también es válido.

---

## `packages/db` — Capa de base de datos

Define la interfaz de abstracción de acceso a datos y la estructura de carpetas para adaptadores. La implementación concreta de adaptadores está diferida.

```
packages/db/
├── src/
│   ├── index.ts                        # Exporta SOLO interfaces (no adaptadores)
│   ├── interfaces/
│   │   └── repository.interface.ts     # Interfaz genérica Repository<T>
│   └── adapters/
│       ├── mongodb/index.ts            # Placeholder
│       ├── postgresql/index.ts         # Placeholder
│       └── dynamodb/index.ts           # Placeholder
├── tsconfig.json
└── package.json
```

### Interfaz `Repository<T>`

```typescript
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

### Patrón de adaptadores — Cómo funciona

El código de negocio (Lambdas, servicios Fargate) nunca sabe qué base de datos está usando. Solo conoce la interfaz `Repository<T>`. El adaptador concreto se inyecta en runtime.

#### Paso 1: Definir el tipo de la entidad en `packages/types`

```typescript
// packages/types/src/interfaces/todo.interface.ts
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}
```

#### Paso 2: Implementar el adaptador en `packages/db`

```typescript
// packages/db/src/adapters/mongodb/todo.repository.ts
import type { Repository } from "../../interfaces/repository.interface";
import type { Todo } from "@multibotagents/types";
import { MongoClient } from "mongodb";

export class MongoTodoRepository implements Repository<Todo> {
  private collection;

  constructor(client: MongoClient) {
    this.collection = client.db().collection("todos");
  }

  async findById(id: string): Promise<Todo | null> {
    return this.collection.findOne({ _id: id }) as Promise<Todo | null>;
  }

  async findAll(filter?: Partial<Todo>): Promise<Todo[]> {
    return this.collection.find(filter || {}).toArray() as Promise<Todo[]>;
  }

  async create(entity: Omit<Todo, "id">): Promise<Todo> {
    const result = await this.collection.insertOne(entity);
    return { id: result.insertedId.toString(), ...entity } as Todo;
  }

  async update(id: string, entity: Partial<Todo>): Promise<Todo> {
    await this.collection.updateOne({ _id: id }, { $set: entity });
    return this.findById(id) as Promise<Todo>;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
```

#### Paso 3: Crear un factory que decide qué adaptador usar

```typescript
// apps/functions/src/shared/repositories.ts
import type { Repository } from "@multibotagents/db";
import type { Todo } from "@multibotagents/types";
import { MongoTodoRepository } from "@multibotagents/db/adapters/mongodb/todo.repository";
import { getMongoClient } from "./mongo-client";

export function getTodoRepository(): Repository<Todo> {
  // Se puede leer de una variable de entorno para cambiar el motor:
  // if (process.env.DB_ENGINE === "dynamodb") return new DynamoTodoRepository();
  return new MongoTodoRepository(getMongoClient());
}
```

#### Paso 4: Usar en un handler Lambda

```typescript
// apps/functions/src/handlers/todos/list.handler.ts
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { Repository } from "@multibotagents/db";
import type { Todo } from "@multibotagents/types";
import { getTodoRepository } from "../../shared/repositories";

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const repo: Repository<Todo> = getTodoRepository();
  const todos = await repo.findAll();

  return {
    statusCode: 200,
    body: JSON.stringify(todos),
  };
};
```

#### Paso 5: Usar en un servicio Fargate (NestJS)

En NestJS se usa inyección de dependencias nativa:

```typescript
// apps/services/api-multi-bots/src/modules/todos/todos.module.ts
import { Module } from "@nestjs/common";
import { MongoTodoRepository } from "@multibotagents/db/adapters/mongodb/todo.repository";
import { getMongoClient } from "../../shared/mongo-client";
import { TodosService } from "./todos.service";

@Module({
  providers: [
    {
      provide: "TODO_REPOSITORY",
      useFactory: () => new MongoTodoRepository(getMongoClient()),
    },
    TodosService,
  ],
})
export class TodosModule {}

// apps/services/api-multi-bots/src/modules/todos/todos.service.ts
import { Inject, Injectable } from "@nestjs/common";
import type { Repository } from "@multibotagents/db";
import type { Todo } from "@multibotagents/types";

@Injectable()
export class TodosService {
  constructor(
    @Inject("TODO_REPOSITORY") private readonly todoRepo: Repository<Todo>
  ) {}

  async findAll(): Promise<Todo[]> {
    return this.todoRepo.findAll();
  }
}
```

#### Cambiar de motor de base de datos

Si mañana se cambia de MongoDB a PostgreSQL:

1. Implementar `PostgresTodoRepository` en `packages/db/src/adapters/postgresql/`
2. Cambiar el factory (`shared/repositories.ts`) o la variable de entorno para que devuelva el nuevo adaptador
3. Los handlers y servicios no cambian ni una línea

**Regla:** Los consumidores importan solo `Repository` desde `@multibotagents/db`, nunca un adaptador directamente.

---

## Cómo agregar un nuevo paquete compartido

1. Crear la carpeta en `packages/<nombre>/`
2. Crear `package.json` con nombre `@multibotagents/<nombre>` y dependencias internas necesarias
3. Crear `tsconfig.json` extendiendo `@multibotagents/config/tsconfig.node.json`
4. Crear `src/index.ts` como punto de entrada
5. Agregar como dependencia en las apps que lo necesiten: `"@multibotagents/<nombre>": "workspace:*"`
6. Ejecutar `pnpm install` desde la raíz
