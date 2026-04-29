---
taxonomy: solution
key: POCP-C0
solution: fundacion-capa0
initiative: plataforma-omnicanal-pymes
product: Plataforma Omnicanal IA para PYMES
author: Kiro (Solutions Architect Power)
created: 2025-04-29
updated: 2025-04-29
version: 1.0.0
status: designed
language: es
changelog:
  - date: 2025-04-29
    author: Kiro (Solutions Architect Power)
    description: "Diseño completo de la Capa 0 — Fundación. 12 slices definidos con criterios de aceptación. Decisiones validadas: RLS, bus in-process, router centralizado (Opción B), SQLAlchemy, Alembic, JWT in-house."
---

# Solución C0 — Fundación (Capa 0)

## 1. Overview

### Contexto

La Capa 0 es el esqueleto del sistema sobre el cual se construyen todas las soluciones posteriores (S1-S7). Define los contratos que cada solución implementa, la persistencia compartida, el bus de eventos interno, la infraestructura multi-tenant, y la API base.

**Regla fundamental:** Nadie puede trabajar en S1-S7 hasta que la Capa 0 exista. Los contratos definidos aquí son sagrados — si alguien necesita cambiar un contrato, se discute primero con el equipo.

### Relación con la Iniciativa

Esta solución implementa los componentes C0.1 a C0.7 del Solution Map de la iniciativa POCP-001:

| Componente | Descripción |
|-----------|-------------|
| C0.1 | Modelo de datos + PostgreSQL + Multi-tenant |
| C0.2 | Contrato genérico de canal (D4) |
| C0.3 | Contrato del orquestador de agentes |
| C0.4 | Contrato genérico de integración (D5) |
| C0.5 | Bus de eventos interno |
| C0.6 | API base FastAPI + autenticación |
| C0.7 | Estructura del proyecto |

### Resultado esperado

Un sistema que arranca, recibe un mensaje por un canal genérico (stub), lo pasa a un orquestador que clasifica la intención y rutea al agente correcto (stub), lo persiste en PostgreSQL con aislamiento multi-tenant, y emite eventos. Los contratos están definidos, las implementaciones son stubs. Cada desarrollador puede tomar una solución (S1-S7) y trabajar contra los contratos sin depender de los demás.

### Soluciones que habilita

| Solución | Dependencia de Capa 0 |
|----------|----------------------|
| S1 — Adaptador WhatsApp | Contrato de canal (C0.2), Bus de eventos (C0.5) |
| S2 — Agente de Consultas | Contrato de agente (C0.3), Bus de eventos (C0.5) |
| S3 — Agente de Agendamiento | Contrato de agente (C0.3), Contrato de integración (C0.4) |
| S4 — Agente de Cotización | Contrato de agente (C0.3) |
| S5 — Módulo de Handoff | Bus de eventos (C0.5), API base (C0.6) |
| S6 — Sincronización de Conocimiento | Contrato de integración (C0.4), Bus de eventos (C0.5) |
| S7 — Panel del Consultor + Dashboard | API base (C0.6), Modelo de datos (C0.1) |

---

## 2. Solution Narrative

### 2.1 Modelo de Datos + PostgreSQL + Multi-Tenant (C0.1)

Toda la plataforma es multi-tenant. Cada PYME es un tenant aislado.

**Estrategia de aislamiento: Row-Level Security (RLS).**

Cada tabla que contiene datos de un tenant tiene una columna `tenant_id` (UUID, FK a `tenants`). Las políticas RLS garantizan que una query solo ve datos de su tenant activo. La variable de sesión `app.current_tenant_id` se setea en cada request por el middleware de FastAPI, antes de que cualquier query se ejecute.

**Justificación de RLS sobre schema-per-tenant:**

| Criterio | RLS | Schema-per-tenant |
|----------|-----|-------------------|
| Complejidad de setup | Baja-Media | Alta |
| Migraciones | Una sola migración aplica a todos | Migración por schema |
| Queries cross-tenant (consultant) | Media (desactivar RLS) | Alta (queries cross-schema) |
| Recomendación para MVP | ✅ Recomendado | ❌ Over-engineering |

**Entidades core del modelo de datos:**

| Entidad | Propósito | Tenant-scoped |
|---------|-----------|---------------|
| `tenants` | Registro de cada PYME. Config global del tenant. | No (es la tabla raíz) |
| `users` | Usuarios del sistema (consultores, admins, operadores). | Sí (excepto consultores que ven múltiples tenants) |
| `conversations` | Cada conversación con un cliente final. | Sí |
| `messages` | Mensajes individuales dentro de una conversación. | Sí (vía conversation) |
| `sessions` | Estado de la sesión de conversación (agent_active, escalated, human_active, closed). | Sí (vía conversation) |
| `agents` | Configuración de agentes activos por tenant. | Sí |
| `knowledge_items` | Items de la base de conocimiento (catálogo, FAQs, docs). | Sí |
| `integrations` | Integraciones conectadas por tenant (Calendar, Drive, etc.). | Sí |
| `channel_connections` | Canales conectados por tenant (WhatsApp, futuro: IG, etc.). | Sí |
| `events_log` | Log de eventos del bus interno (auditoría). | Sí |

**Convenciones:**
- Todas las tablas usan UUID como `id` (no autoincremental).
- Todas las tablas tienen `created_at` y `updated_at` (timestamps con timezone).
- Índices en `tenant_id` en todas las tablas tenant-scoped.

### 2.2 Contrato Genérico de Canal — Abstracción D4 (C0.2)

La decisión D4 de la iniciativa exige abstracción de canales desde el diseño. MVP solo WhatsApp, pero agregar un canal debe ser "enchufar un adaptador".

**Interfaz `ChannelAdapter`:**

```
ChannelAdapter (interfaz abstracta):
  - receive_webhook(raw_payload) → NormalizedMessage
  - send_message(conversation_id, content) → DeliveryStatus
  - get_channel_type() → ChannelType
  - validate_webhook(raw_payload, signature) → bool
```

**Modelo `NormalizedMessage`** — contrato interno independiente del canal:

```
NormalizedMessage:
  - external_id: str           # ID del mensaje en el canal externo
  - channel_type: ChannelType  # whatsapp, instagram, telegram, webchat, stub
  - sender_id: str             # ID del cliente en el canal
  - sender_name: str           # Nombre del cliente (si disponible)
  - content: str               # Texto del mensaje
  - content_type: MessageContentType  # text, image, audio, document, location, unknown
  - timestamp: datetime
  - metadata: dict             # Datos específicos del canal
  - tenant_id: UUID
```

**Enums:**
- `ChannelType`: whatsapp, instagram, telegram, webchat, stub
- `MessageContentType`: text, image, audio, document, location, unknown

El stub de canal simula mensajes entrantes/salientes en memoria para testing sin depender de WhatsApp real.

### 2.3 Contrato del Orquestador de Agentes — Router Centralizado (C0.3)

DA2 define multi-agente con orquestador. Se eligió **Opción B — Router centralizado**: el orquestador clasifica la intención una sola vez y consulta un registro declarativo de capacidades para decidir a qué agente enviar. Los agentes no evalúan si pueden manejar un mensaje — solo procesan.

**Justificación de Opción B sobre Opción A (broadcast):**

| Criterio | Opción A (Broadcast) | Opción B (Router centralizado) |
|----------|---------------------|-------------------------------|
| Latencia por mensaje | ❌ O(N) agentes | ✅ O(1) clasificación |
| Costo de tokens | ❌ N × evaluación | ✅ 1 × clasificación |
| Precisión en intenciones claras | ✅ Igual | ✅ Igual |
| Debuggeabilidad | ⚠️ Difícil | ✅ Fácil (regla → agente) |
| Impacto en RNF2 (latencia < 3s) | ❌ Riesgo directo | ✅ Compatible |
| Impacto en RNF7 (costos controlables) | ❌ Multiplica costos | ✅ Costos predecibles |

**Interfaz `AgentContract`:**

```
AgentContract (interfaz abstracta):
  - get_agent_type() → AgentType
  - process(message: NormalizedMessage, context: ConversationContext) → AgentResponse
  - get_required_integrations() → list[IntegrationType]
```

**Modelo `AgentCapability`** — registro declarativo:

```
AgentCapability:
  - agent_type: AgentType
  - handled_intents: list[IntentType]
  - priority: int
  - requires_integrations: list[IntegrationType]
  - is_fallback: bool
```

**Modelo `AgentResponse`:**

```
AgentResponse:
  - response_text: str
  - action: AgentAction  # respond, transfer, escalate, execute_action
  - transfer_to: AgentType | None
  - escalation_reason: str | None
  - executed_action: ActionResult | None
  - context_update: dict
```

**Modelo `ConversationContext`:**

```
ConversationContext:
  - conversation_id: UUID
  - tenant_id: UUID
  - session_state: SessionState  # agent_active, escalated, human_active, closed
  - message_history: list[Message]
  - current_intent: Intent | None
  - shared_context: dict
  - active_agent: AgentType
```

**Enums:**
- `AgentType`: general_query, scheduling, quoting, custom
- `AgentAction`: respond, transfer, escalate, execute_action
- `SessionState`: agent_active, escalated, human_active, closed
- `IntentType`: general_query, scheduling, quoting, purchase_intent, complaint, escalation_request, greeting, farewell, unknown

**Flujo del orquestador de agentes (Opción B):**

1. Mensaje llega → orquestador verifica `session_state`.
2. Si `agent_active` → clasifica intención (una sola llamada).
3. Consulta el registro: ¿qué agente maneja esta intención para este tenant? (lookup, no evaluación).
4. Verifica que las integraciones requeridas estén activas para el tenant.
5. Si no hay agente disponible → fallback al agente base → si no resuelve → escala a humano.
6. Agente procesa → respuesta sale.

**`AgentRegistry`:**

```
AgentRegistry:
  - register_agent(agent: AgentContract, capabilities: AgentCapability)
  - get_agent_for_intent(intent: IntentType, tenant_id: UUID) → AgentContract
  - get_fallback_agent() → AgentContract
```

### 2.4 Contrato Genérico de Integración — Abstracción D5 (C0.4)

D5 exige abstracción de integraciones desde el diseño. D6 exige sincronización continua.

**Interfaz `IntegrationAdapter`:**

```
IntegrationAdapter (interfaz abstracta):
  - get_integration_type() → IntegrationType
  - authenticate(credentials: dict) → AuthResult
  - fetch_data(query: dict) → list[IntegrationDataItem]
  - push_action(action: IntegrationAction) → ActionResult
  - check_for_changes(since: datetime) → list[ChangeEvent]
  - get_sync_status() → SyncStatus
```

**Modelos:**

```
IntegrationDataItem:
  - external_id: str
  - source: IntegrationType
  - content: str | dict
  - content_type: str
  - last_modified: datetime
  - metadata: dict

ChangeEvent:
  - external_id: str
  - change_type: ChangeType  # created, updated, deleted
  - timestamp: datetime
  - data: IntegrationDataItem | None
```

**Enum `IntegrationType`:** google_calendar, google_drive, notion, confluence, custom_api, manual_upload, stub

### 2.5 Bus de Eventos In-Process (C0.5)

Para el MVP, el bus de eventos es in-process: un patrón pub/sub en Python con asyncio. Sin broker externo (no Kafka, no RabbitMQ). Si el volumen lo justifica post-MVP, se migra a un broker externo.

**Eventos definidos:**

| Evento | Productor | Consumidores |
|--------|-----------|-------------|
| `message_received` | Canal adapter | Orquestador de conversaciones |
| `response_generated` | Agente | Canal adapter, Events log |
| `escalation_detected` | Agente / Orquestador | Módulo de handoff |
| `appointment_created` | Agente de agendamiento | Events log, Notificaciones |
| `quote_generated` | Agente de cotización | Events log, Notificaciones |
| `knowledge_updated` | Sincronización | Base de conocimiento |
| `conversation_closed` | Orquestador | Events log, Métricas |
| `human_response_sent` | Módulo de handoff | Canal adapter |
| `integration_sync_completed` | Sincronización | Events log |
| `integration_sync_failed` | Sincronización | Events log, Alertas |

**Implementación:**

```
EventBus (singleton):
  - subscribe(event_type: EventType, handler: AsyncCallable)
  - publish(event_type: EventType, payload: dict)
```

- Los handlers son async.
- Cada evento publicado se persiste en `events_log` para auditoría (RNF6).
- Si un handler falla, los demás siguen ejecutándose (aislamiento de fallos).
- Errores de handlers se loguean pero no propagan al publisher.

### 2.6 API Base FastAPI + Autenticación (C0.6)

- **Framework:** FastAPI (async-native).
- **Autenticación:** JWT in-house con roles (consultant, admin, operator).
- **Middleware de tenant:** Extrae `tenant_id` del JWT y setea `app.current_tenant_id` en la sesión de PostgreSQL.
- **Rol consultant:** El middleware detecta rol consultant y setea un flag que desactiva RLS (vía `SET ROLE` a un rol PostgreSQL sin restricción RLS), permitiendo queries cross-tenant.
- **Passwords:** Almacenados con bcrypt.
- **JWT:** Expiración configurable (default: 24h). Incluye `user_id`, `tenant_id`, `role`.
- **Rate limiting:** 100 requests/minuto por tenant (configurable).
- **CORS:** Configurado para frontend Next.js.
- **Formato de responses:** `{"data": ..., "error": null}` para éxito, `{"data": null, "error": {"code": ..., "message": ...}}` para error.

**Routers (stubs iniciales):**
- `/api/v1/auth` — Login, refresh
- `/api/v1/conversations` — CRUD conversaciones
- `/api/v1/agents` — Configuración de agentes
- `/api/v1/tenants` — Gestión de tenants
- `/api/v1/knowledge` — Base de conocimiento
- `/api/v1/integrations` — Integraciones
- `/api/v1/webhooks/{channel}` — Webhooks de canales
- `/health` — Health check

### 2.7 Estructura del Proyecto (C0.7)

Monorepo con backend (Python/FastAPI) y frontend (React/Next.js).

```
/
├── backend/
│   ├── app/
│   │   ├── main.py                # Entry point FastAPI
│   │   ├── config.py              # Settings (env vars)
│   │   ├── database.py            # PostgreSQL connection + session
│   │   ├── models/                # SQLAlchemy models
│   │   │   ├── tenant.py
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── session.py
│   │   │   ├── agent.py
│   │   │   ├── knowledge.py
│   │   │   ├── integration.py
│   │   │   └── event_log.py
│   │   ├── schemas/               # Pydantic schemas (request/response)
│   │   ├── api/                   # FastAPI routers
│   │   │   ├── v1/
│   │   │   │   ├── conversations.py
│   │   │   │   ├── agents.py
│   │   │   │   ├── tenants.py
│   │   │   │   ├── knowledge.py
│   │   │   │   ├── integrations.py
│   │   │   │   └── webhooks.py
│   │   │   └── health.py
│   │   ├── core/                  # Core business logic
│   │   │   ├── orchestrator.py            # Orquestador de conversaciones
│   │   │   ├── agent_orchestrator.py      # Orquestador de agentes
│   │   │   ├── intent_classifier.py       # Clasificador de intenciones
│   │   │   ├── event_bus.py               # Bus de eventos
│   │   │   └── security.py               # Auth, JWT, RLS
│   │   ├── contracts/             # Interfaces abstractas (contratos)
│   │   │   ├── channel.py         # ChannelAdapter
│   │   │   ├── agent.py           # AgentContract
│   │   │   └── integration.py     # IntegrationAdapter
│   │   ├── adapters/              # Implementaciones de contratos
│   │   │   ├── channels/
│   │   │   │   ├── whatsapp.py        # (S1)
│   │   │   │   └── stub.py           # Stub para testing
│   │   │   ├── agents/
│   │   │   │   ├── base_query.py      # (S2)
│   │   │   │   ├── scheduling.py      # (S3)
│   │   │   │   ├── quoting.py         # (S4)
│   │   │   │   └── stub.py           # Stub para testing
│   │   │   └── integrations/
│   │   │       ├── google_calendar.py  # (S3)
│   │   │       ├── google_drive.py     # (S6)
│   │   │       ├── notion.py           # (S6)
│   │   │       └── stub.py            # Stub para testing
│   │   └── middleware/
│   │       ├── tenant.py          # Middleware multi-tenant
│   │       └── rate_limit.py
│   ├── migrations/                # Alembic migrations
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── contracts/             # Tests de contrato
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── frontend/                      # React + Next.js
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml             # PostgreSQL + Backend + Frontend
├── .github/
│   └── workflows/
│       └── ci.yml                # CI/CD básico
└── README.md
```

---

## 3. Out of Scope

Lo siguiente queda explícitamente fuera de esta solución:

- Implementación real de adaptadores de canal (WhatsApp, Instagram, etc.) — eso es S1.
- Implementación real de agentes de IA (consultas, agendamiento, cotización) — eso es S2, S3, S4.
- Implementación real de integraciones (Google Calendar, Drive, Notion, Confluence) — eso es S3, S6.
- Módulo de handoff completo (detección, notificación, vista web) — eso es S5.
- Panel del consultor y dashboard de métricas — eso es S7.
- Frontend funcional más allá de la página base de Next.js.
- Clasificador de intenciones basado en LLM (se entrega clasificador basado en reglas/keywords; la interfaz permite reemplazar por LLM sin cambiar el orquestador).
- Despliegue en infraestructura de producción (Render/Fly/Railway).
- Configuración de WhatsApp Business API con Meta.

---

## 4. Technical Context

### 4.1 Stack Tecnológico

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Backend | Python + FastAPI | Python 3.11+, FastAPI 0.100+ |
| ORM | SQLAlchemy | 2.0+ |
| Migraciones | Alembic | 1.12+ |
| Base de datos | PostgreSQL | 15+ (soporte RLS maduro) |
| Frontend | React + Next.js | Next.js 14+ (App Router) |
| Contenedores | Docker + Docker Compose | Docker 24+, Compose v2 |
| Linter | Ruff | 0.1+ |
| Testing | Pytest | 7.0+ |
| CI/CD | GitHub Actions | — |

### 4.2 Decisiones Técnicas Consolidadas

| ID | Decisión | Detalle | Origen |
|----|----------|---------|--------|
| DT1 | RLS para multi-tenant | Row-Level Security con `tenant_id` en todas las tablas tenant-scoped. Variable de sesión `app.current_tenant_id`. | Validada con stakeholder |
| DT2 | Bus de eventos in-process | Pub/sub async en Python con asyncio. Sin broker externo para MVP. | Validada con stakeholder |
| DT3 | Router centralizado (Opción B) | El orquestador clasifica intención una sola vez y consulta registro declarativo. Los agentes no evalúan si pueden manejar — solo procesan. | Validada con stakeholder |
| DT4 | SQLAlchemy como ORM | Estándar en ecosistema FastAPI/Python. SQLAlchemy 2.0 con async support. | Validada con stakeholder |
| DT5 | Alembic para migraciones | Migraciones versionadas. Una sola migración aplica a todos los tenants (coherente con RLS). | Validada con stakeholder |
| DT6 | JWT in-house | Autenticación construida in-house. Sin proveedor externo (Auth0, Supabase, Clerk). Roles: consultant, admin, operator. | Validada con stakeholder |
| DT7 | Consultant cross-tenant | Middleware detecta rol consultant y setea flag que desactiva RLS vía `SET ROLE` a rol PostgreSQL sin restricción. | Validada con stakeholder |
| DT8 | UUID como primary key | Todas las tablas usan UUID v4 como `id`. No autoincremental. | Decisión de diseño |
| DT9 | Formato de response consistente | `{"data": ..., "error": null}` para éxito. `{"data": null, "error": {"code": ..., "message": ...}}` para error. | Decisión de diseño |

### 4.3 Patrones de Diseño

| Patrón | Aplicación |
|--------|-----------|
| Adapter Pattern | Contratos de canal (C0.2), agente (C0.3), integración (C0.4). Cada implementación es un adaptador intercambiable. |
| Strategy Pattern | Clasificador de intenciones: interfaz abstracta, implementación por reglas (MVP), reemplazable por LLM. |
| Singleton | EventBus: una sola instancia por proceso. |
| Pub/Sub | Bus de eventos: productores publican, consumidores suscriben. Desacoplamiento entre componentes. |
| Registry | AgentRegistry: registro declarativo de capacidades de agentes. Lookup por intención. |
| Middleware | Multi-tenant (RLS), autenticación (JWT), rate limiting. |

### 4.4 Modelo de Datos a Alto Nivel

```
tenants
  ├── users (tenant_id FK)
  ├── conversations (tenant_id FK)
  │     ├── messages (conversation_id FK)
  │     └── sessions (conversation_id FK)
  ├── agents (tenant_id FK)
  ├── knowledge_items (tenant_id FK)
  ├── integrations (tenant_id FK)
  ├── channel_connections (tenant_id FK)
  └── events_log (tenant_id FK)
```

**Relaciones clave:**
- `conversations` → `channel_connections` (por qué canal llegó).
- `messages` → `conversations` (mensajes dentro de una conversación).
- `sessions` → `conversations` (estado de la sesión de una conversación).
- `agents` → `tenants` (agentes configurados por PYME).
- `knowledge_items` → `tenants` (base de conocimiento por PYME).
- `integrations` → `tenants` (integraciones conectadas por PYME).

---

## 5. Acceptance Criteria

### 5.1 Dominio: Infraestructura

| # | Criterio |
|---|---------|
| AC-I1 | `docker compose up` levanta PostgreSQL, backend y frontend sin errores, los 3 servicios healthy |
| AC-I2 | Backend responde en `http://localhost:8000/health` con status 200 |
| AC-I3 | Frontend responde en `http://localhost:3000` |
| AC-I4 | PostgreSQL accesible desde backend (query de prueba al arrancar) |
| AC-I5 | CI pipeline ejecuta lint + tests en cada push, falla si hay errores |

### 5.2 Dominio: Persistencia y Multi-Tenant

| # | Criterio |
|---|---------|
| AC-P1 | Migración `alembic upgrade head` crea todas las tablas sin errores |
| AC-P2 | RLS habilitado en todas las tablas tenant-scoped |
| AC-P3 | Un usuario de tenant A no puede ver datos de tenant B |
| AC-P4 | Rol consultant puede ver datos de múltiples tenants |
| AC-P5 | Al finalizar un request, la sesión de PostgreSQL se limpia |
| AC-P6 | Todas las tablas usan UUID como primary key |
| AC-P7 | Todas las tablas tienen `created_at` y `updated_at` |

### 5.3 Dominio: Autenticación

| # | Criterio |
|---|---------|
| AC-A1 | Login con credenciales válidas retorna JWT con `user_id`, `tenant_id`, `role` |
| AC-A2 | Login con credenciales inválidas retorna 401 |
| AC-A3 | Endpoints protegidos rechazan requests sin JWT (401) |
| AC-A4 | Endpoints protegidos rechazan JWT expirado (401) |
| AC-A5 | Decorador de rol restringe acceso (403 si rol insuficiente) |
| AC-A6 | Passwords almacenados con bcrypt |

### 5.4 Dominio: Contratos

| # | Criterio |
|---|---------|
| AC-C1 | `ChannelAdapter` es clase abstracta con métodos definidos |
| AC-C2 | `AgentContract` es clase abstracta con métodos definidos |
| AC-C3 | `IntegrationAdapter` es clase abstracta con métodos definidos |
| AC-C4 | Stubs de canal, agente e integración implementan sus contratos |
| AC-C5 | Tests de contrato ejecutables contra stubs |
| AC-C6 | `AgentRegistry` permite registrar agentes y consultar por intención |

### 5.5 Dominio: Orquestación

| # | Criterio |
|---|---------|
| AC-O1 | Mensaje con sesión `agent_active` se pasa al orquestador de agentes |
| AC-O2 | Mensaje con sesión `human_active` se rutea directo al handoff |
| AC-O3 | Mensaje sin conversación previa crea nueva conversación + sesión |
| AC-O4 | Clasificador de intenciones retorna `IntentClassification` con tipo y confidence |
| AC-O5 | Router consulta registro y retorna agente correcto |
| AC-O6 | Transferencia inter-agente preserva contexto compartido |
| AC-O7 | Límite de transferencias (default: 3) previene loops infinitos |
| AC-O8 | Confidence < umbral → fallback al agente base |

### 5.6 Dominio: Bus de Eventos

| # | Criterio |
|---|---------|
| AC-E1 | `EventBus.publish()` ejecuta todos los handlers suscritos |
| AC-E2 | Cada evento se persiste en `events_log` |
| AC-E3 | Handler fallido no afecta a otros handlers del mismo evento |
| AC-E4 | Errores de handlers se loguean pero no propagan al publisher |

---

## 6. Risks & Assumptions

### 6.1 Supuestos

| ID | Supuesto | Impacto si no se cumple |
|----|----------|------------------------|
| SA1 | PostgreSQL 15+ soporta RLS de forma estable y performante para el volumen esperado (< 50 tenants en MVP) | Migrar a schema-per-tenant o evaluar otra estrategia de aislamiento |
| SA2 | El bus de eventos in-process es suficiente para el volumen del MVP (< 1000 mensajes/día) | Migrar a broker externo (Redis pub/sub como paso intermedio) |
| SA3 | El clasificador de intenciones basado en reglas es suficiente para testing y desarrollo de S1-S7 | Acelerar implementación del clasificador LLM |
| SA4 | SQLAlchemy 2.0 async funciona correctamente con RLS y variables de sesión de PostgreSQL | Evaluar alternativas (raw SQL para RLS, SQLAlchemy sync) |
| SA5 | El equipo tiene experiencia con Docker, FastAPI, SQLAlchemy y Next.js | Tiempo adicional de ramp-up |

### 6.2 Riesgos Técnicos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|----|--------|-------|---------|-----------|
| RT1 | RLS + SQLAlchemy async: la variable de sesión `app.current_tenant_id` puede no propagarse correctamente en conexiones pooled | Media | Alto | Test de integración exhaustivo con connection pooling. Verificar que cada request setea y limpia la variable. |
| RT2 | El clasificador por reglas puede ser demasiado rígido para mensajes reales en español coloquial | Alta | Medio | Es temporal. La interfaz Strategy permite reemplazar por LLM sin cambiar el orquestador. |
| RT3 | El bus in-process pierde eventos si el proceso se cae | Media | Medio | Los eventos se persisten en DB antes de ejecutar handlers. En caso de crash, se pueden re-procesar. |
| RT4 | El modelo de datos inicial puede necesitar cambios significativos cuando se implementen S1-S7 | Media | Medio | Alembic permite migraciones incrementales. Los contratos están diseñados para ser estables. |

---

## 7. Decision Log

| ID | Fecha | Decisión | Contexto | Alternativas consideradas | Resultado |
|----|-------|----------|----------|--------------------------|-----------|
| DL1 | 2025-04-29 | RLS para multi-tenant | Necesidad de aislamiento de datos entre PYMES | RLS vs Schema-per-tenant | RLS — más simple para MVP con equipo pequeño |
| DL2 | 2025-04-29 | Bus de eventos in-process | Comunicación desacoplada entre componentes | In-process vs Redis pub/sub vs Kafka | In-process — sin infraestructura adicional para MVP |
| DL3 | 2025-04-29 | Router centralizado (Opción B) | Routing de mensajes a agentes especializados | Broadcast (can_handle) vs Router centralizado | Router centralizado — O(1) latencia, costos predecibles, compatible con RNF2 y RNF7 |
| DL4 | 2025-04-29 | SQLAlchemy 2.0 | ORM para PostgreSQL | SQLAlchemy vs Tortoise vs SQLModel vs raw SQL | SQLAlchemy — estándar del ecosistema, async support en v2 |
| DL5 | 2025-04-29 | Alembic | Migraciones de base de datos | Alembic vs manual | Alembic — versionado, reversible, estándar con SQLAlchemy |
| DL6 | 2025-04-29 | JWT in-house | Autenticación de usuarios | In-house vs Auth0 vs Supabase Auth vs Clerk | In-house — sin dependencia externa, control total, suficiente para MVP |
| DL7 | 2025-04-29 | Consultant cross-tenant vía SET ROLE | Acceso del consultant a múltiples tenants | SET ROLE vs relación explícita consultant_tenants | SET ROLE — más simple, el consultant ve todo |

---

## 8. Slices

### 8.1 Tabla Índice

| Slice | Nombre | Dependencias | Complejidad | Prioridad |
|-------|--------|--------------|-------------|-----------|
| C0-S01 | Estructura del proyecto + Docker Compose | Ninguna | Baja | P0 |
| C0-S02 | Modelo de datos core + Alembic | C0-S01 | Alta | P0 |
| C0-S03 | Middleware multi-tenant + RLS | C0-S02 | Alta | P0 |
| C0-S04 | Autenticación JWT + Roles | C0-S03 | Media | P0 |
| C0-S05 | Contrato de canal + Stub | C0-S01 | Baja | P0 |
| C0-S06 | Contrato de agente + Registro de capacidades | C0-S01 | Media | P0 |
| C0-S07 | Contrato de integración + Stub | C0-S01 | Baja | P0 |
| C0-S08 | Bus de eventos in-process | C0-S02 | Media | P0 |
| C0-S09 | Orquestador de conversaciones | C0-S05, C0-S06, C0-S08 | Alta | P0 |
| C0-S10 | Orquestador de agentes + Clasificador de intenciones | C0-S06, C0-S08 | Alta | P0 |
| C0-S11 | API base + Health + Routers | C0-S04 | Baja | P0 |
| C0-S12 | CI/CD básico | C0-S01 | Baja | P0 |

### 8.2 Orden de Implementación

```
C0-S01 (Estructura)
  │
  ├── C0-S02 (Modelo de datos)
  │     │
  │     ├── C0-S03 (Multi-tenant + RLS)
  │     │     │
  │     │     └── C0-S04 (Auth JWT)
  │     │           │
  │     │           └── C0-S11 (API base + Routers)
  │     │
  │     └── C0-S08 (Bus de eventos)
  │
  ├── C0-S05 (Contrato canal)  ─────┐
  ├── C0-S06 (Contrato agente) ─────┼── C0-S09 (Orquestador conversaciones)
  ├── C0-S07 (Contrato integración) │         │
  │                                  │         └── C0-S10 (Orquestador agentes)
  │                                  │
  └── C0-S12 (CI/CD) ── en paralelo con todo
```

**Paralelismo posible:**
- C0-S05, C0-S06, C0-S07 pueden hacerse en paralelo entre sí (y en paralelo con C0-S02).
- C0-S12 puede hacerse en paralelo con todo.
- C0-S09 y C0-S10 son los últimos porque integran todo lo anterior.

---

### 8.3 Detalle de Slices

---

#### C0-S01 — Estructura del proyecto + Docker Compose

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Crear el monorepo con la estructura de carpetas del backend (Python/FastAPI) y frontend (Next.js), Docker Compose con PostgreSQL, y configuración de entorno local. |
| **Entregable** | Repositorio con estructura de carpetas, `docker-compose.yml`, `Dockerfile` para backend y frontend, `.env.example`, `pyproject.toml`, `package.json`. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `docker compose up` levanta PostgreSQL, backend y frontend sin errores | Comando ejecutado, los 3 servicios healthy |
| 2 | Backend responde en `http://localhost:8000` | `curl http://localhost:8000/health` retorna 200 |
| 3 | Frontend responde en `http://localhost:3000` | Navegador muestra página base |
| 4 | PostgreSQL accesible desde backend | Backend conecta y ejecuta query de prueba al arrancar |
| 5 | `.env.example` documenta todas las variables de entorno requeridas | Archivo presente con comentarios explicativos |
| 6 | Estructura de carpetas sigue la convención definida en la narrativa (sección 2.7) | Revisión manual de estructura |

---

#### C0-S02 — Modelo de datos core + Alembic

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Crear los modelos SQLAlchemy para las entidades core y la primera migración de Alembic. Incluye la columna `tenant_id` en todas las tablas tenant-scoped. |
| **Entregable** | Modelos SQLAlchemy, migración inicial de Alembic, seed de datos de prueba (1 tenant, 1 user consultant). |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | Migración `alembic upgrade head` crea todas las tablas sin errores | Comando ejecutado contra PostgreSQL limpio |
| 2 | Tablas creadas: `tenants`, `users`, `conversations`, `messages`, `sessions`, `agents`, `knowledge_items`, `integrations`, `channel_connections`, `events_log` | Query `\dt` en psql lista todas |
| 3 | Todas las tablas tenant-scoped tienen columna `tenant_id` (UUID, FK a `tenants`, NOT NULL) | Inspección de schema |
| 4 | Índices en `tenant_id` en todas las tablas tenant-scoped | Inspección de índices |
| 5 | `alembic downgrade base` revierte sin errores | Comando ejecutado |
| 6 | Seed script crea 1 tenant de prueba + 1 usuario consultant | Script ejecutado, datos verificables con query |
| 7 | Timestamps `created_at` y `updated_at` en todas las tablas | Inspección de schema |
| 8 | Columna `id` es UUID en todas las tablas (no autoincremental) | Inspección de schema |

---

#### C0-S03 — Middleware multi-tenant + RLS

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Implementar Row-Level Security en PostgreSQL y el middleware de FastAPI que setea `app.current_tenant_id` en cada request. El rol `consultant` puede hacer queries cross-tenant. |
| **Entregable** | Políticas RLS en PostgreSQL (vía migración Alembic), middleware de FastAPI, tests de aislamiento. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | RLS habilitado en todas las tablas tenant-scoped | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` aplicado vía migración |
| 2 | Política RLS: un usuario solo ve filas donde `tenant_id` = `current_setting('app.current_tenant_id')` | Test: crear datos en tenant A y B, query con tenant A solo retorna datos de A |
| 3 | Middleware extrae `tenant_id` del JWT y ejecuta `SET app.current_tenant_id` al inicio de cada request | Test de integración con request autenticado |
| 4 | Requests sin JWT válido reciben 401 | Test con request sin token |
| 5 | Rol `consultant`: middleware detecta rol y desactiva RLS vía `SET ROLE` | Test: consultant ve datos de múltiples tenants |
| 6 | Roles `admin` y `operator`: solo ven datos de su tenant | Test: admin de tenant A no ve datos de tenant B |
| 7 | Al finalizar el request, la sesión de PostgreSQL se limpia | Test: dos requests consecutivos con tenants distintos retornan datos correctos |

---

#### C0-S04 — Autenticación JWT + Roles

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Sistema de autenticación in-house con JWT. Login por email/password. Roles: consultant, admin, operator. |
| **Entregable** | Endpoint de login, generación/validación de JWT, decoradores de protección por rol, hash de passwords. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `POST /api/v1/auth/login` con email + password válidos retorna JWT con `user_id`, `tenant_id`, `role` | Test con credenciales válidas |
| 2 | `POST /api/v1/auth/login` con credenciales inválidas retorna 401 | Test con credenciales incorrectas |
| 3 | JWT tiene expiración configurable (default: 24h) | Inspección del token decodificado |
| 4 | Passwords almacenados con bcrypt (nunca en texto plano) | Inspección de la tabla `users` |
| 5 | Endpoints protegidos rechazan requests sin JWT válido (401) | Test con request sin token |
| 6 | Endpoints protegidos rechazan JWT expirado (401) | Test con token expirado |
| 7 | Decorador `@require_role(["consultant"])` restringe acceso por rol (403 si rol insuficiente) | Test: operator intenta acceder a endpoint de consultant |
| 8 | El JWT incluye `tenant_id` (null para consultant que ve múltiples tenants) | Inspección del token |
| 9 | Endpoint `POST /api/v1/auth/refresh` renueva un JWT válido no expirado | Test de refresh |

---

#### C0-S05 — Contrato de canal + Stub

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Definir la interfaz abstracta `ChannelAdapter` y el modelo `NormalizedMessage`. Crear un stub de canal para testing. |
| **Entregable** | Clase abstracta, modelos Pydantic, stub funcional, tests de contrato. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `ChannelAdapter` es clase abstracta con métodos: `receive_webhook()`, `send_message()`, `get_channel_type()`, `validate_webhook()` | Inspección de código |
| 2 | `NormalizedMessage` es modelo Pydantic con campos definidos en sección 2.2 | Inspección de código |
| 3 | `StubChannelAdapter` implementa `ChannelAdapter` y simula mensajes en memoria | Test unitario |
| 4 | Tests de contrato: cualquier implementación de `ChannelAdapter` pasa los mismos tests | Test suite ejecutable contra stub |
| 5 | `MessageContentType` enum: text, image, audio, document, location, unknown | Inspección de código |
| 6 | `ChannelType` enum: whatsapp, instagram, telegram, webchat, stub | Inspección de código |

---

#### C0-S06 — Contrato de agente + Registro de capacidades

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Definir `AgentContract`, `AgentCapability`, `AgentRegistry`, y stub de agente. Router centralizado (Opción B). |
| **Entregable** | Clase abstracta, modelos, registro, stub, tests de contrato. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `AgentContract` es clase abstracta con: `get_agent_type()`, `process()`, `get_required_integrations()` | Inspección de código |
| 2 | `AgentCapability` modelo con: `agent_type`, `handled_intents`, `priority`, `requires_integrations`, `is_fallback` | Inspección de código |
| 3 | `AgentRegistry` permite registrar agentes y consultar por intención | Test unitario |
| 4 | `AgentRegistry.get_agent_for_intent(intent, tenant_id)` retorna agente correcto según prioridad | Test con múltiples agentes |
| 5 | Si no hay agente para una intención, retorna el agente `is_fallback=True` | Test unitario |
| 6 | `AgentResponse` modelo con campos definidos en sección 2.3 | Inspección de código |
| 7 | `ConversationContext` modelo con campos definidos en sección 2.3 | Inspección de código |
| 8 | `IntentType` enum con valores definidos en sección 2.3 | Inspección de código |
| 9 | `StubAgent` implementa `AgentContract` y retorna respuestas predefinidas | Test unitario |
| 10 | Tests de contrato ejecutables contra stub | Test suite |

---

#### C0-S07 — Contrato de integración + Stub

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Definir `IntegrationAdapter` y modelos asociados. Stub para testing. |
| **Entregable** | Clase abstracta, modelos, stub, tests de contrato. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `IntegrationAdapter` es clase abstracta con métodos definidos en sección 2.4 | Inspección de código |
| 2 | `IntegrationDataItem` modelo con campos definidos en sección 2.4 | Inspección de código |
| 3 | `ChangeEvent` modelo con campos definidos en sección 2.4 | Inspección de código |
| 4 | `IntegrationType` enum con valores definidos en sección 2.4 | Inspección de código |
| 5 | `StubIntegrationAdapter` implementa la interfaz y simula datos en memoria | Test unitario |
| 6 | Tests de contrato ejecutables contra stub | Test suite |

---

#### C0-S08 — Bus de eventos in-process

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Implementar bus de eventos pub/sub async. Persistencia en `events_log` para auditoría. |
| **Entregable** | Clase `EventBus`, tipos de eventos, persistencia, tests. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `EventBus.subscribe(event_type, handler)` registra handler async | Test unitario |
| 2 | `EventBus.publish(event_type, payload)` ejecuta todos los handlers suscritos | Test unitario |
| 3 | Handlers se ejecutan async (no bloquean el publish) | Test con handler con delay |
| 4 | Cada evento publicado se persiste en `events_log` con: `event_type`, `payload`, `tenant_id`, `timestamp` | Test de integración |
| 5 | Handler fallido no afecta a otros handlers del mismo evento | Test con handler que lanza excepción |
| 6 | Errores de handlers se loguean pero no propagan al publisher | Test con handler fallido |
| 7 | Tipos de eventos definidos como enum (10 eventos listados en sección 2.5) | Inspección de código |
| 8 | `EventBus` es singleton | Test unitario |

---

#### C0-S09 — Orquestador de conversaciones

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Recibe mensaje normalizado, verifica estado de sesión, decide si va al orquestador de agentes o al handoff. Gestiona ciclo de vida de la conversación. |
| **Entregable** | Clase `ConversationOrchestrator`, gestión de sesiones, tests. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | Mensaje con sesión `agent_active` → pasa al orquestador de agentes | Test con stub de agente |
| 2 | Mensaje con sesión `human_active` → rutea directo al handoff | Test con stub de handoff |
| 3 | Mensaje con sesión `escalated` → encola para humano, envía mensaje de espera al cliente | Test |
| 4 | Mensaje sin conversación previa → crea nueva conversación + sesión `agent_active` | Test de integración con DB |
| 5 | Agente responde `action=escalate` → estado cambia a `escalated` → emite `escalation_detected` | Test |
| 6 | Agente responde `action=respond` → envía respuesta por canal → emite `response_generated` | Test |
| 7 | Agente responde `action=transfer` → pasa al siguiente agente con contexto compartido | Test con dos stubs |
| 8 | Cierre por inactividad (timeout configurable por tenant) → estado `closed` → emite `conversation_closed` | Test con timeout simulado |
| 9 | Cierre por despedida explícita (intención `farewell`) → estado `closed` | Test |
| 10 | Todos los mensajes (entrantes y salientes) se persisten en `messages` | Test de integración con DB |

---

#### C0-S10 — Orquestador de agentes + Clasificador de intenciones

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Clasifica intención (una sola vez), consulta registro de capacidades, rutea al agente correcto. Gestiona transferencias inter-agente. Clasificador inicial basado en reglas. |
| **Entregable** | Clase `AgentOrchestrator`, clasificador de intenciones (Strategy pattern), tests. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `classify_intent(message, context)` retorna `IntentClassification` con `intent_type` y `confidence` | Test unitario |
| 2 | Clasificador basado en reglas/keywords funcional: "quiero agendar" → `scheduling`, "cuánto cuesta" → `quoting` | Test con mensajes de ejemplo |
| 3 | Interfaz del clasificador es abstracta (Strategy pattern): reemplazable por LLM sin cambiar orquestador | Inspección de código |
| 4 | `route(intent, tenant_id)` consulta `AgentRegistry` y retorna agente correcto | Test con agentes registrados |
| 5 | Agente requiere integración no activa para el tenant → fallback al agente base | Test |
| 6 | Transferencia inter-agente: `action=transfer` → pasa mensaje + `shared_context` al agente destino | Test con dos stubs |
| 7 | Límite de transferencias por conversación (default: 3) → exceso causa escalamiento a humano | Test: 4 transferencias → escalamiento |
| 8 | Confidence < umbral (default: 0.3) → fallback al agente base | Test con mensaje ambiguo |
| 9 | Log de decisión de routing: intent, confidence, agente elegido, razón | Test de integración |

---

#### C0-S11 — API base + Health + Routers

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Estructura de routers de FastAPI, health endpoint, CORS, rate limiting. Routers vacíos (stubs). |
| **Entregable** | Routers registrados, health endpoint, middleware CORS, rate limiter. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | `GET /health` retorna `{"status": "ok", "version": "0.1.0"}` con status 200 | curl |
| 2 | Routers registrados (vacíos): conversations, agents, tenants, knowledge, integrations, webhooks, auth | OpenAPI docs en `/docs` |
| 3 | CORS permite requests desde `http://localhost:3000` | Test cross-origin |
| 4 | Rate limiting: máximo 100 requests/minuto por tenant (configurable) | Test con requests excesivos |
| 5 | Responses siguen formato consistente: `{"data": ..., "error": null}` / `{"data": null, "error": {...}}` | Inspección de responses |
| 6 | OpenAPI docs accesibles en `/docs` | Navegador |

---

#### C0-S12 — CI/CD básico

| Campo | Detalle |
|-------|---------|
| **Objetivo** | Pipeline de CI con GitHub Actions: lint, tests, build de Docker images. |
| **Entregable** | Workflow de GitHub Actions, configuración de linters. |

**Criterios de aceptación:**

| # | Criterio | Verificación |
|---|---------|-------------|
| 1 | Push a cualquier branch ejecuta: lint (ruff) + tests (pytest) | GitHub Actions log |
| 2 | Push a `main` ejecuta: lint + tests + build de Docker images | GitHub Actions log |
| 3 | Pipeline falla si lint tiene errores | Test con código con errores |
| 4 | Pipeline falla si algún test falla | Test con test roto |
| 5 | Tiempo de pipeline < 5 minutos | Observación |
| 6 | `ruff` configurado como linter de Python | `pyproject.toml` |
| 7 | `pytest` configurado con coverage mínimo (default: 80%) | `pyproject.toml` |
