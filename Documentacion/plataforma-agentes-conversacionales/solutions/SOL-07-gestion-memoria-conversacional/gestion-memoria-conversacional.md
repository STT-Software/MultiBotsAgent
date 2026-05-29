---
taxonomy: solution
key: gestion-memoria-conversacional
solution: Gestión de Memoria Conversacional
initiative: plataforma-agentes-conversacionales
product: Por definir
author: Solutions Architect
created: 2026-05-29
updated: 2026-05-29
version: 1.0.0
status: approved
language: es
changelog:
  - date: 2026-05-29
    author: Solutions Architect
    description: Diseño inicial de la Gestión de Memoria Conversacional (SOL-07)
---

# Gestión de Memoria Conversacional

## 1. Overview

### Contexto
La Gestión de Memoria Conversacional (SOL-07) es una solución transversal de la iniciativa "Plataforma de Agentes Conversacionales". Proporciona el contexto temporal necesario para que los agentes (RAG, Cotizador, Agendamiento) puedan mantener una conversación fluida, recordando mensajes previos dentro de una sesión activa.

### Relación con la iniciativa
Esta solución implementa la capacidad de "Contexto temporal por conversación" y "reinicio tras ventana de tiempo" definida en la fase inicial. Al ser transversal, no es un producto final en sí mismo, sino una capacidad fundacional que consumen los distintos motores de agentes.

### Resumen ejecutivo técnico
Sistema de almacenamiento rápido y temporal basado en MongoDB Atlas, integrado con las abstracciones de memoria de LangChain. Permite almacenar, recuperar y formatear el historial de chat (human/ai messages) asociado a una sesión única (`sessionId`). Implementa una política de ventana de tiempo (TTL) tras la cual la memoria se elimina automáticamente, cumpliendo con el requisito de "memoria básica (no persistente a largo plazo)".

### Dependencias
| Solución | Relación |
|----------|----------|
| 2 - Motor de Agente RAG | Consumidor — requiere historial para co-referencia y contexto |
| 3 - Motor de Agente Cotizador | Consumidor — requiere historial para flujo transaccional |
| 4 - Motor de Agente Agendamiento | Consumidor — requiere historial para recolección de datos |
| 5 - Conector WhatsApp | Provee identificadores únicos de sesión (ej. `phone`) |
| 8 - Escalamiento Humano | Integra con la memoria para evitar contaminación (filtrado) y evitar expiración de TTL |

---

## 2. Solution Narrative

### 2.1 Recuperación y Actualización de Contexto (Happy Path)

**Trigger:** Un nuevo mensaje entrante llega a cualquier motor de agente.

**Comportamiento:**
1. El motor de agente (ej. RAG) recibe un mensaje de usuario con un identificador de sesión único (`sessionId`).
2. Antes de invocar el LLM, el motor solicita el historial de la sesión al `MemoryService`.
3. El servicio consulta MongoDB por los últimos N mensajes asociado al `sessionId`.
4. El motor inyecta estos mensajes en el prompt del LLM (via LangChain).
5. El LLM genera la respuesta.
6. El motor envía tanto el mensaje del usuario como la respuesta del LLM al `MemoryService` para guardarlos.
7. El servicio inserta los nuevos mensajes en el documento de la sesión y actualiza el campo `updatedAt`.

**Resultado:** El LLM responde con contexto de turnos anteriores.

**Decisiones de diseño:**
- **Identificador de sesión compuesto:** `sessionId` = `${channel}_${identifier}_${agentId}` para asegurar aislamiento total de conversaciones (ej. `whatsapp_573001234567_agent123`).
- **TTL automático:** Se configura un índice TTL en MongoDB sobre `updatedAt` para eliminar sesiones inactivas automáticamente tras X horas (ej. 24 horas).

### 2.2 Reinicio explícito de memoria

**Trigger:** Un usuario envía un comando de reinicio (ej. "reiniciar", "limpiar") o se dispara un reset programático (el agente finaliza un flujo de agendamiento y cierra el ciclo).

**Comportamiento:**
1. El motor de agente detecta la intención de reinicio o termina el workflow.
2. Invoca el método `clearMemory(sessionId)` del `MemoryService`.
3. El servicio elimina el documento correspondiente en MongoDB.

**Resultado:** La próxima interacción del usuario será tratada como una conversación completamente nueva, sin historial previo.

---

### 2.3 Manejo de Memoria en Escalamientos a Humano (SOL-08)

**Trigger:** Una conversación es tomada por un humano (estado `escalated`) y posteriormente devuelta al agente (estado `active`).

**Comportamiento:**
1. Durante el escalamiento, el sistema guarda en la memoria los mensajes del usuario y las respuestas enviadas por el humano. 
2. Estos mensajes se marcan con metadata especial (ej. `source: "operator"` para las respuestas del humano e `isEscalated: true` para los del usuario).
3. Cuando la conversación se resuelve y retorna al agente, el sistema de escalamiento invoca el método `refreshTTL(sessionId)` para renovar la expiración de la sesión (ej. restableciendo el TTL a 24 horas), garantizando que el agente retenga el contexto previo sin importar cuánto demoró el humano.
4. En el siguiente mensaje del usuario, cuando el agente invoque `getHistory()`, el servicio omitirá por defecto todos los mensajes marcados durante el escalamiento.

**Resultado:** El agente retoma la conversación exactamente con el mismo contexto que tenía antes del escalamiento, sin confundirse con lo que escribió el humano y sin perder la memoria por expiración del TTL.

---

## 3. Out of Scope

- **Memoria a largo plazo / persistente:** No se guardan perfiles de usuario, preferencias aprendidas ni historial histórico para analítica dentro de este servicio. 
- **Resúmenes automáticos de conversaciones:** Para el MVP, se usará una ventana de mensajes fija (ej. últimos 10 turnos) y TTL, evitando el costo extra de LLMs resumiendo conversaciones continuas.
- **Extracción de entidades a memoria semántica:** La memoria es estrictamente episódica (historial de mensajes directos), no una memoria estructurada de hechos (Entity Memory).

---

## 4. Technical Context

### Patrones de arquitectura
| Patrón | Aplicación |
|--------|-----------|
| Adapter Pattern | Adaptador entre la interfaz de memoria de LangChain (`BaseChatMessageHistory`) y los repositorios de MongoDB en `@multibotagents/db`. |
| Sliding Window | Límite máximo de mensajes devueltos al LLM para controlar el costo de tokens y evitar exceder el límite de contexto. |
| Time-To-Live (TTL) | Limpieza automática delegada a la base de datos de los datos transitorios. |

### Arquitectura del flujo

```text
┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────┐
│                │      │      MemoryService      │      │ MongoDB Atlas   │
│ Motor de Agente│ ────▶│ (implementa LangChain   │ ────▶│ Colección:      │
│ (RAG, etc)     │      │  BaseChatMessageHistory)│      │ chat_memories   │
│                │ ◀────│                         │ ◀────│ (TTL Index)     │
└────────────────┘      └─────────────────────────┘      └─────────────────┘
```

### Stack técnico
| Componente | Tecnología |
|-----------|-----------|
| Lógica de Dominio | `packages/core` (TypeScript) |
| Framework LLM | LangChain (clases de memoria y chat history) |
| Almacenamiento | MongoDB Atlas (vía patrón adaptador en `@multibotagents/db`) |
| Expiración | MongoDB TTL Index (`expireAfterSeconds`) |

### Modelo de datos conceptual

```text
┌─────────────────────────────┐
│         ChatMemory          │
├─────────────────────────────┤
│ _id: ObjectId               │
│ sessionId: string           │  ← Índexado (unique)
│ messages: Array<{           │
│   type: "human" | "ai" |    │
│         "system"            │
│   content: string           │
│   timestamp: Date           │
│   source?: "operator"       │  ← Distingue al agente del humano
│   isEscalated?: boolean     │  ← Marca para omitir en contexto
│ }>                          │
│ createdAt: Date             │
│ updatedAt: Date             │  ← Índice TTL (ej. 24h = 86400s)
└─────────────────────────────┘
```

### Contratos de integración

#### Interfaz `MemoryService` (en `packages/core`):
```typescript
interface ChatMessage {
  type: "human" | "ai" | "system";
  content: string;
  timestamp: Date;
  source?: "agent" | "operator";
  isEscalated?: boolean;
}

interface MemoryService {
  getHistory(sessionId: string, limit?: number, includeEscalated?: boolean): Promise<ChatMessage[]>;
  saveContext(sessionId: string, humanMessage: string, aiMessage: string): Promise<void>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  clearMemory(sessionId: string): Promise<void>;
  refreshTTL(sessionId: string): Promise<void>;
}
```

---

## 5. Acceptance Criteria

- [ ] Todo mensaje de usuario y respuesta del agente se almacena secuencialmente asociado a su `sessionId`.
- [ ] La recuperación devuelve la lista cronológica correcta de los últimos `N` mensajes solicitados.
- [ ] Las sesiones inactivas por más del tiempo estipulado (ej. 24 horas) se eliminan automáticamente mediante un TTL index en la base de datos.
- [ ] El servicio expone un método para limpiar explícitamente el historial de una sesión (`clearMemory`).
- [ ] El formato de salida es mapeable/compatible con los constructos de memoria de LangChain (ej. `HumanMessage`, `AIMessage`).
- [ ] El aislamiento es total: los historiales de distintos canales, usuarios o agentes no se cruzan debido a la composición única del `sessionId`.
- [ ] La función `getHistory()` omite por defecto cualquier mensaje etiquetado con `isEscalated: true` o `source: "operator"`, protegiendo el contexto del agente.
- [ ] El servicio expone un método `refreshTTL` que reinicia la vigencia de la sesión en MongoDB, invocado cuando se devuelve el control tras un escalamiento.

---

## 6. MVP vs Solución Completa

### MVP
- Almacenamiento directo en MongoDB.
- Ventana estática de últimos `N` mensajes.
- Eliminación total por TTL.
- Integración vía adaptadores con LangChain.

### Post-MVP (Mejoras opcionales)
- Si el rendimiento lo exige y el volumen de concurrencia crece masivamente, se podría migrar el backend de memoria de MongoDB a un sistema en caché (ElastiCache / Redis / Upstash) para asegurar latencias sub-milisegundo.
- Implementación de `ConversationSummaryMemory` si los historiales necesarios se vuelven muy largos y el truncamiento corta contexto esencial.

---

## 7. Risks & Assumptions

### Supuestos
| # | Supuesto | Impacto si es falso |
|---|----------|-------------------|
| 1 | MongoDB soportará eficientemente lecturas/escrituras atómicas por cada turno de conversación a escala del MVP. | Posible lentitud. Requeriría migrar a caché en memoria (Redis). |
| 2 | Limitar a los últimos `N` mensajes es suficiente para el contexto, sin necesidad de resumir conversaciones largas. | Habría pérdida de contexto si el usuario hace referencia a un dato de hace >N turnos. |

### Riesgos
| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|-----------|
| 1 | Exceder el "context window" del LLM con historiales extremadamente largos si no se controlan. | Alta | Alto | Aplicar truncamiento duro (Sliding Window) devolviendo consistentemente solo los últimos `N` mensajes en `getHistory`, o truncar por cantidad de tokens. |
| 2 | Colisión de `sessionId` entre diferentes orígenes. | Baja | Alto | Documentar y forzar estandarización en la generación del ID: `${channel}_${identifier}_${agentId}`. |
