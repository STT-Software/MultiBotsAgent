---
taxonomy: solution
key: metricas-analiticas
solution: Sistema de Métricas y Analíticas
initiative: ../../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Oscar Gomez
created: 2026-06-01
updated: 2026-06-01
version: "1.1.0"
status: drafting
language: es
changelog:
  - date: 2026-06-01
    author: Oscar Gomez
    change: "Creación inicial — Diseño completo de la solución con narrativa técnica, contexto técnico y acceptance criteria."
  - date: 2026-06-01
    author: Oscar Gomez
    change: "Actualización — Modelo híbrido de métricas: WebSocket para actividad en vivo, query bajo demanda para agregados históricos."
---

# Sistema de Métricas y Analíticas

## 1. Overview

El Sistema de Métricas y Analíticas es la solución que cierra el ciclo de valor de la plataforma: permite a las empresas entender cómo están funcionando sus agentes. Recolecta eventos emitidos por las demás soluciones durante la operación normal y los expone como métricas consultables desde el Panel de Administración.

Esta solución cubre:
- **Registro de eventos** de conversación, escalamiento, pedidos y citas — emitidos por los motores de agente y soluciones transversales
- **Cálculo de métricas** generales y específicas por tipo de agente, bajo demanda
- **Exposición de métricas** al Panel Web para visualización

Es la última solución en implementarse (Fase 6 del roadmap), ya que depende de que los motores de agente (RAG, Cotizador, Agendamiento) y las soluciones transversales estén operativas para tener eventos que recolectar.

### Relación con otras soluciones

| Solución | Relación |
|----------|----------|
| 1 — Panel de Administración Web | Consume las métricas via API y las muestra en la sección de Métricas (actualmente placeholder) |
| 2 — Motor de Agente RAG | Emite eventos de conversación: consulta procesada, sin respuesta, escalamiento |
| 3 — Motor de Agente Cotizador | Emite eventos de pedido: cotización iniciada, pedido confirmado, pedido abandonado |
| 4 — Motor de Agente Agendamiento | Emite eventos de cita: agendada, cancelada, reprogramada, recordatorio enviado |
| 8 — Sistema de Escalamiento a Humano | Emite eventos de escalamiento: iniciado, resuelto, timeout |
| 14 — Gestión de Empresas y Acceso | Provee el contexto de empresa para filtrar métricas por `companyId` |

### Resumen ejecutivo técnico

Módulo NestJS que implementa un patrón event-driven interno: los motores de agente emiten eventos via el event emitter de NestJS, y el módulo de métricas los escucha, los persiste como registros en MongoDB y los agrega bajo demanda cuando el panel los consulta. No hay infraestructura de mensajería externa — todo ocurre dentro del mismo proceso. Las métricas se calculan en el momento de la consulta con filtros por empresa, agente y período de tiempo (24h / 7d / 30d).

---

## 2. Solution Narrative

### 2.1 Registro de Evento de Conversación

- **Trigger:** Un motor de agente (RAG, Cotizador o Agendamiento) emite un evento interno al completar o interrumpir el procesamiento de una interacción con el usuario.

- **Comportamiento:** El módulo de métricas escucha los eventos internos del sistema via el event emitter de NestJS. Cuando recibe un evento, lo persiste como un registro en la colección `metric_events` de MongoDB con los campos relevantes: tipo de evento, ID del agente, ID de la empresa, timestamp y metadata específica del tipo de evento.

  Los tipos de evento que se registran son:

  | Tipo de evento | Emitido por | Metadata relevante |
  |---------------|-------------|-------------------|
  | `conversation.completed` | RAG, Cotizador, Agendamiento | `agentType`, `resolved: boolean` |
  | `conversation.escalated` | RAG, Cotizador, Agendamiento | `agentType`, `reason` |
  | `rag.no_answer` | Motor RAG | `query` (texto de la pregunta sin respuesta) |
  | `rag.topic_identified` | Motor RAG | `topic` (tema identificado por el LLM) |
  | `order.initiated` | Motor Cotizador | `productIds[]` |
  | `order.confirmed` | Motor Cotizador | `productIds[]`, `total` |
  | `order.abandoned` | Motor Cotizador | `productIds[]`, `abandonReason` |
  | `appointment.scheduled` | Motor Agendamiento | `scheduledAt`, `activityType` |
  | `appointment.cancelled` | Motor Agendamiento | `scheduledAt`, `cancelledBy` |
  | `appointment.rescheduled` | Motor Agendamiento | `originalAt`, `newAt` |
  | `escalation.opened` | Sistema de Escalamiento | `reason`, `agentType` |
  | `escalation.resolved` | Sistema de Escalamiento | `resolvedAt`, `durationMinutes` |
  | `escalation.timeout` | Sistema de Escalamiento | `timeoutMinutes` |

- **Resultado:** El evento queda persistido en MongoDB como un registro inmutable. No se modifica ni se elimina — es un log de eventos.

- **Error path:** Si la persistencia del evento falla (MongoDB no disponible), el error se registra en el log del sistema pero **no interrumpe el flujo del motor que emitió el evento**. Las métricas son un sistema de observabilidad — su fallo no debe afectar la operación de los agentes. El evento se pierde en ese caso (no hay reintentos para el MVP).

- **Decisiones de diseño:** Se usa el event emitter interno de NestJS (mismo proceso) en lugar de un bus de mensajería externo (SQS/SNS). Esto simplifica la implementación para el volumen inicial y es consistente con el patrón ya establecido en el Motor RAG para el evento de escalamiento. Si el volumen crece y se necesita separar el servicio de métricas, los eventos se pueden migrar a SQS sin cambiar la interfaz de los emisores.

---

### 2.2 Consulta de Métricas Generales

- **Trigger:** El Panel de Administración solicita las métricas generales de la empresa para el período seleccionado.

- **Comportamiento:** El sistema recibe la solicitud con `companyId` y `period` (24h / 7d / 30d). Ejecuta agregaciones sobre la colección `metric_events` filtrando por empresa y rango de fechas. Calcula y retorna:

  - **Conversaciones totales:** Conteo de eventos `conversation.completed` + `conversation.escalated`
  - **Tasa de resolución global:** `conversation.completed` con `resolved: true` / total de conversaciones
  - **Escalamientos totales:** Conteo de eventos `escalation.opened`
  - **Tasa de escalamiento:** Escalamientos / total de conversaciones
  - **Consultas frecuentes (RAG):** Top 10 de temas identificados via `rag.topic_identified`
  - **Tiempo promedio de resolución de escalamientos:** Promedio de `durationMinutes` en eventos `escalation.resolved`

- **Resultado:** Objeto de métricas generales listo para renderizar en el panel.

- **Error path:** Si la consulta tarda más de un umbral configurable (ej: 5 segundos), retorna un error con mensaje claro. El panel muestra estado de error con opción de reintentar. No hay datos parciales — o se retorna el objeto completo o se retorna error.

- **Decisiones de diseño:** Las métricas se calculan bajo demanda (query al momento de consultar) sin pre-cómputo ni caché para el MVP. El volumen inicial (pocas empresas, pocos agentes) no justifica la complejidad adicional. Si las queries se vuelven lentas con el crecimiento, se agrega un índice compuesto `(companyId, timestamp)` y opcionalmente una capa de caché.

---

### 2.3 Consulta de Métricas por Tipo de Agente

- **Trigger:** El Panel de Administración solicita las métricas específicas de un agente o tipo de agente para el período seleccionado.

- **Comportamiento:** El sistema recibe `companyId`, `agentId` (opcional — si no se especifica, agrega por `agentType`), `agentType` y `period`. Según el tipo de agente, calcula métricas específicas:

  **Agente RAG:**
  - Preguntas sin respuesta: conteo de `rag.no_answer`
  - Temas más consultados: top 10 de `rag.topic_identified`
  - Tasa de éxito: conversaciones resueltas / total de conversaciones del agente

  **Agente Cotizador:**
  - Productos más solicitados: top 10 de `productIds` en eventos `order.initiated`
  - Pedidos confirmados: conteo de `order.confirmed`
  - Pedidos abandonados: conteo de `order.abandoned`
  - Tasa de conversión: `order.confirmed` / `order.initiated`
  - Tasa de éxito: conversaciones resueltas / total de conversaciones del agente

  **Agente Agendamiento:**
  - Citas agendadas: conteo de `appointment.scheduled`
  - Citas canceladas: conteo de `appointment.cancelled`
  - Citas reprogramadas: conteo de `appointment.rescheduled`
  - Horarios pico: distribución de `scheduledAt` por hora del día
  - Tasa de éxito: conversaciones resueltas / total de conversaciones del agente

- **Resultado:** Objeto de métricas específicas del tipo de agente, listo para renderizar en el panel.

- **Error path:** Igual que 2.2 — error completo o respuesta completa, sin datos parciales.

- **Decisiones de diseño:** Las métricas de "temas más consultados" para el RAG dependen de que el Motor RAG identifique y emita el tema de cada consulta. Esto requiere que el LLM clasifique el tema como parte del procesamiento. Si el Motor RAG no implementa esta clasificación, la métrica de temas no estará disponible — se documenta como dependencia en Risks & Assumptions.

---

### 2.4 Visualización de Métricas en el Panel

- **Trigger:** El usuario navega a la sección "Métricas" del Panel de Administración.

- **Comportamiento:** El panel reemplaza el placeholder actual (Solución 1, flujo 2.7) con la vista real de métricas. La vista opera en **modo híbrido**: una parte de los datos se actualiza en tiempo real via WebSocket, y otra se consulta bajo demanda.

  **Bloque de actividad en vivo (WebSocket):**
  Al cargar la sección, el panel abre una conexión WebSocket al servidor. El servidor emite actualizaciones cada vez que se registra un nuevo evento de métrica (`metric.event`). El panel actualiza en tiempo real:
  - Conversaciones activas en este momento
  - Conversaciones resueltas hoy
  - Escalamientos abiertos ahora
  - Feed de actividad reciente: últimos 10 eventos (conversación resuelta, escalamiento abierto, pedido confirmado, cita agendada) con timestamp

  Este bloque es el más visible en la demo — muestra el sistema trabajando en vivo.

  **Bloque de métricas históricas (query bajo demanda):**
  - Selector de período: 24h / 7 días / 30 días
  - Selector de agente: Todos / agente específico
  - Métricas agregadas: tasa de resolución, tasa de escalamiento, top de temas, productos más solicitados, horarios pico, tasa de conversión

  Al cambiar el período o el agente, el panel realiza una nueva consulta REST a la API y actualiza solo el bloque histórico. El bloque en vivo no se interrumpe.

  **Cierre de conexión:** Cuando el usuario navega fuera de la sección de Métricas, el panel cierra la conexión WebSocket para liberar recursos.

- **Resultado:** El usuario ve actividad en tiempo real en la parte superior del panel y métricas históricas agregadas en la parte inferior. La combinación permite tanto monitoreo operativo (¿qué está pasando ahora?) como análisis de tendencias (¿cómo fue la semana?).

- **Error path:**
  - Si la conexión WebSocket se pierde, el panel muestra un indicador de "reconectando" e intenta reconectar automáticamente con backoff exponencial. Los datos en vivo se congelan hasta restablecer la conexión.
  - Si la API de métricas históricas no responde, el bloque histórico muestra estado de error con opción de reintentar. El bloque en vivo no se ve afectado.
  - Si no hay datos para el período seleccionado, el bloque histórico muestra estado vacío con mensaje informativo ("Sin actividad en este período").

- **Decisiones de diseño:** Se reutiliza el mismo mecanismo WebSocket que ya usa la Solución 8 (Escalamiento) para el inbox. No se introduce nueva infraestructura — es el mismo servidor NestJS con un gateway WebSocket adicional. El bloque en vivo no reemplaza las métricas históricas: son complementarios. Los agregados históricos (tasa de éxito del mes, horarios pico) no tienen valor en tiempo real — actualizarlos cada segundo no aporta información nueva y añade carga innecesaria.

- **Integraciones:** Consume `GET /api/metricas/*` para métricas históricas y el gateway WebSocket del servidor NestJS para actividad en vivo. El Panel Web (Solución 1) es el único consumidor.

---

## 3. Out of Scope

- **Dashboards complejos o analíticas avanzadas:** Solo métricas básicas definidas en la iniciativa. Sin gráficos de tendencia, cohortes, funnels ni segmentación avanzada.
- **Actualización en tiempo real de métricas:** Las métricas históricas agregadas (7d, 30d) se consultan bajo demanda, no en tiempo real. El feed de actividad en vivo sí usa WebSocket, pero cubre contadores del día y eventos recientes — no recalcula agregados históricos en cada evento.
- **Exportación de datos:** No hay descarga de CSV, Excel ni integración con herramientas de BI.
- **Alertas y notificaciones basadas en métricas:** No hay umbrales configurables ni alertas automáticas.
- **Métricas de rendimiento técnico:** Latencia de respuesta del LLM, tiempo de indexación, uso de recursos. Eso es observabilidad de infraestructura, no métricas de negocio.
- **Historial de conversaciones individuales:** El historial completo es responsabilidad de la Solución 7 (Memoria Conversacional) y se visualiza desde el Panel Web directamente.
- **Métricas de tiempo de respuesta del operador humano:** Fuera de alcance inicial.
- **Retención y purga de eventos:** No hay política de retención definida para el MVP. Los eventos se acumulan indefinidamente.
- **Pre-cómputo o caché de métricas:** Solo queries bajo demanda para el MVP.
- **Rate limiting de la API de métricas:** No aplica por ahora (consistente con la iniciativa).

---

## 4. Technical Context

### Patrones de arquitectura

| Patrón | Aplicación |
|--------|-----------|
| Event-Driven (interno) | Los motores emiten eventos via NestJS EventEmitter. El módulo de métricas los escucha y persiste. Sin infraestructura externa. |
| Event Sourcing (simplificado) | Los eventos son registros inmutables. Las métricas se derivan de los eventos, no se almacenan como estado. |
| Query on Demand | Las métricas históricas se calculan en el momento de la consulta via agregaciones MongoDB. Sin pre-cómputo para el MVP. |
| WebSocket (actividad en vivo) | El servidor re-emite eventos de métrica al panel via WebSocket gateway de NestJS. Reutiliza el mismo mecanismo que la Solución 8 (Escalamiento). |
| Modelo híbrido | Actividad en vivo via WebSocket + métricas históricas via REST. Cada canal sirve el tipo de dato que le corresponde. |
| Módulo NestJS | El sistema de métricas es un módulo independiente con sus propios listeners, servicio, controlador y gateway WebSocket. |
| Fire and Forget | Los emisores de eventos no esperan confirmación del módulo de métricas. El fallo de métricas no afecta la operación. |

### Stack técnico

| Componente | Tecnología | Notas |
|-----------|-----------|-------|
| Runtime | NestJS (módulo dentro del servicio existente `api-multi-bots`) | Consistente con el resto de la plataforma |
| Event bus interno | `@nestjs/event-emitter` | Ya disponible en el proyecto. Sin infraestructura adicional. |
| WebSocket gateway | `@nestjs/websockets` + `socket.io` | Reutiliza el mismo mecanismo que la Solución 8 (Escalamiento). Sin infraestructura nueva. |
| Persistencia de eventos | MongoDB Atlas (colección `metric_events`) | Mismo cluster que el resto de la plataforma |
| Agregaciones | MongoDB Aggregation Pipeline | Nativo, sin dependencias adicionales |
| API REST | NestJS Controller | Para métricas históricas, consumida por el Panel Web |

### Modelo de datos conceptual

```
MetricEvent
├── id
├── companyId           (ref → Empresa)
├── agentId             (ref → Agente)
├── agentType           "rag" | "cotizador" | "agendamiento"
├── eventType           (ver tabla de tipos en flujo 2.1)
├── timestamp           Date
└── metadata            Object  (campos variables según eventType)
```

**Índices recomendados:**
- `{ companyId: 1, timestamp: -1 }` — para filtrar por empresa y período
- `{ agentId: 1, timestamp: -1 }` — para filtrar por agente específico
- `{ companyId: 1, eventType: 1, timestamp: -1 }` — para agregaciones por tipo de evento

**Nota:** `MetricEvent` es la única entidad propia de esta solución. No modifica ni extiende entidades de otras soluciones.

### Contratos de integración

#### Contrato de emisión de eventos (lo que los motores deben emitir)

```typescript
// Interface que todos los emisores deben respetar
interface MetricEventPayload {
  companyId: string;
  agentId: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  eventType: MetricEventType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Ejemplo de emisión desde el Motor RAG
this.eventEmitter.emit("metric.event", {
  companyId: agent.companyId,
  agentId: agent.id,
  agentType: "rag",
  eventType: "rag.no_answer",
  timestamp: new Date(),
  metadata: { query: userMessage },
} satisfies MetricEventPayload);
```

#### Contrato WebSocket (actividad en vivo)

```typescript
// El servidor emite este evento al panel cada vez que se registra un metric.event
// Evento: "metrics.live_update"
interface LiveMetricUpdate {
  companyId: string;
  agentId: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  eventType: MetricEventType;
  timestamp: Date;
  // Contadores acumulados del día (recalculados en memoria, no en BD)
  todayCounters: {
    conversationsResolved: number;
    conversationsActive: number;
    escalationsOpen: number;
  };
}

// El panel se suscribe filtrando por companyId al conectar
// socket.emit("subscribe", { companyId: "xxx" })
```

```typescript
// GET /api/metricas/generales?period=7d
interface GeneralMetricsResponse {
  period: "24h" | "7d" | "30d";
  totalConversations: number;
  resolutionRate: number;           // 0-1
  totalEscalations: number;
  escalationRate: number;           // 0-1
  topTopics: { topic: string; count: number }[];
  avgEscalationResolutionMinutes: number;
}

// GET /api/metricas/agente/:agentId?period=7d
// GET /api/metricas/tipo/:agentType?period=7d&companyId=xxx
interface AgentMetricsResponse {
  agentId?: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  period: "24h" | "7d" | "30d";
  successRate: number;
  // RAG
  noAnswerCount?: number;
  topTopics?: { topic: string; count: number }[];
  // Cotizador
  topProducts?: { productId: string; count: number }[];
  ordersConfirmed?: number;
  ordersAbandoned?: number;
  conversionRate?: number;
  // Agendamiento
  appointmentsScheduled?: number;
  appointmentsCancelled?: number;
  appointmentsRescheduled?: number;
  peakHours?: { hour: number; count: number }[];
}
```

---

## 5. Acceptance Criteria

### Registro de eventos

- [ ] El sistema persiste un registro en `metric_events` cada vez que un motor de agente emite un evento de conversación completada o escalada.
- [ ] El sistema persiste eventos específicos del Motor RAG: `rag.no_answer` y `rag.topic_identified`.
- [ ] El sistema persiste eventos específicos del Motor Cotizador: `order.initiated`, `order.confirmed`, `order.abandoned`.
- [ ] El sistema persiste eventos específicos del Motor Agendamiento: `appointment.scheduled`, `appointment.cancelled`, `appointment.rescheduled`.
- [ ] El sistema persiste eventos del Sistema de Escalamiento: `escalation.opened`, `escalation.resolved`, `escalation.timeout`.
- [ ] Si la persistencia de un evento falla, el error se registra en el log del sistema pero el flujo del motor emisor no se interrumpe.
- [ ] Los registros de eventos son inmutables — no se modifican ni eliminan una vez persistidos.

### Métricas generales

- [ ] La API retorna conversaciones totales, tasa de resolución global, escalamientos totales y tasa de escalamiento para los períodos 24h, 7d y 30d.
- [ ] La API retorna el top 10 de temas más consultados (RAG) para el período seleccionado.
- [ ] La API retorna el tiempo promedio de resolución de escalamientos para el período seleccionado.
- [ ] Todos los resultados están filtrados por `companyId` — una empresa no puede ver métricas de otra.
- [ ] Si no hay datos para el período seleccionado, la API retorna el objeto con valores en cero (no un error).

### Métricas por tipo de agente

- [ ] La API retorna métricas específicas del Agente RAG: preguntas sin respuesta, temas más consultados, tasa de éxito.
- [ ] La API retorna métricas específicas del Agente Cotizador: productos más solicitados, pedidos confirmados, pedidos abandonados, tasa de conversión, tasa de éxito.
- [ ] La API retorna métricas específicas del Agente Agendamiento: citas agendadas, canceladas, reprogramadas, horarios pico, tasa de éxito.
- [ ] Las métricas pueden consultarse por agente específico (`agentId`) o por tipo de agente (`agentType`) para toda la empresa.

### Visualización en el panel

- [ ] La sección "Métricas" del panel muestra datos reales (reemplaza el placeholder de la Solución 1).
- [ ] Al cargar la sección, el panel abre una conexión WebSocket y muestra en tiempo real: conversaciones activas, conversaciones resueltas hoy, escalamientos abiertos y feed de últimos 10 eventos.
- [ ] El feed de actividad en vivo se actualiza automáticamente cada vez que ocurre un nuevo evento, sin necesidad de refrescar la página.
- [ ] Si la conexión WebSocket se pierde, el panel muestra un indicador de "reconectando" e intenta reconectar automáticamente.
- [ ] Al navegar fuera de la sección de Métricas, el panel cierra la conexión WebSocket.
- [ ] El panel permite seleccionar el período para métricas históricas: 24h, 7 días, 30 días.
- [ ] El panel permite filtrar métricas históricas por agente específico o ver todos los agentes.
- [ ] Al cambiar el período o el agente, el panel actualiza solo el bloque histórico sin interrumpir el feed en vivo.
- [ ] Si la API de métricas históricas no responde, el bloque histórico muestra estado de error con opción de reintentar. El bloque en vivo no se ve afectado.
- [ ] Si no hay actividad en el período seleccionado, el bloque histórico muestra estado vacío con mensaje informativo.

### Criterios generales

- [ ] El módulo de métricas se implementa como módulo NestJS independiente dentro del servicio `api-multi-bots`.
- [ ] Los índices `{ companyId, timestamp }` y `{ agentId, timestamp }` están creados en la colección `metric_events`.
- [ ] La API de métricas responde en menos de 5 segundos para el volumen inicial esperado.

---

## 6. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es falso |
|---|----------|---------------------|
| 1 | Los motores de agente (RAG, Cotizador, Agendamiento) implementan la emisión de eventos `MetricEventPayload` como parte de su desarrollo. | Las métricas no tendrán datos. Requiere coordinación con los desarrolladores de cada motor. |
| 2 | El Motor RAG identifica y emite el tema de cada consulta (`rag.topic_identified`) como parte de su procesamiento LLM. | La métrica de "temas más consultados" no estará disponible. Se puede omitir sin afectar el resto. |
| 3 | El volumen inicial de eventos (< 1000 conversaciones/día por empresa) permite queries bajo demanda sin degradación de rendimiento. | Si el volumen crece, agregar índices adicionales y evaluar pre-cómputo periódico. |
| 4 | La Solución 1 (Panel Web) implementa la vista de métricas reemplazando el placeholder cuando esta solución esté lista. | Las métricas existen en el backend pero no son visibles para el usuario. |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Los motores de agente no emiten eventos con el contrato esperado (`MetricEventPayload`). | Media | Alto | Definir y publicar el contrato en `@multibotagents/types` antes de que los motores se implementen. Validar en code review. |
| 2 | Las agregaciones MongoDB se vuelven lentas con el crecimiento de eventos. | Baja (MVP) | Medio | Índices compuestos desde el inicio. Si escala, agregar pre-cómputo periódico (cron job) o caché con TTL. |
| 3 | La clasificación de temas del RAG produce categorías inconsistentes (el LLM no clasifica de forma uniforme). | Media | Bajo | Definir un prompt de clasificación con categorías predefinidas en el Motor RAG. Si no es viable, desactivar la métrica de temas. |
| 4 | Los eventos se pierden si MongoDB no está disponible en el momento de la emisión. | Baja | Bajo | Aceptado para el MVP. Si la confiabilidad es crítica, migrar a SQS con dead-letter queue. |

### Interfaces asumidas con soluciones no diseñadas

| Solución | Interface asumida | Riesgo |
|----------|------------------|--------|
| 3 — Motor Cotizador | Emite `order.initiated`, `order.confirmed`, `order.abandoned` con `productIds[]` y `total`. | Validar cuando se diseñe la Solución 3. |
| 4 — Motor Agendamiento | Emite `appointment.scheduled`, `appointment.cancelled`, `appointment.rescheduled` con timestamps. | Validar cuando se diseñe la Solución 4. |
| 9 — Motor de Mensajes Proactivos | No se asume emisión de eventos de métricas desde esta solución para el MVP. | Si se requieren métricas de mensajes proactivos, agregar en iteración futura. |
