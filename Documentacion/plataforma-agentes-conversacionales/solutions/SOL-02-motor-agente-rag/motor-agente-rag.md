---
taxonomy: solution
key: motor-agente-rag
solution: Motor de Agente RAG
initiative: plataforma-agentes-conversacionales
product: Por definir
author: Solutions Architect
created: 2026-05-07
updated: 2026-05-07
version: 1.1.0
status: approved
language: es
changelog:
  - date: 2026-05-07
    author: Solutions Architect
    description: Diseño inicial completo — narrativa técnica, modelo de datos, acceptance criteria.
  - date: 2026-05-07
    author: Solutions Architect
    description: Actualización post-premortem — flujos de acknowledgment, deduplicación, re-ranking, timeout de escalamiento. Notas para beta.
---

# Motor de Agente RAG

## 1. Overview

### Contexto

El Motor de Agente RAG es la solución #2 del Solution Map de la iniciativa "Plataforma de Agentes Conversacionales". Es el primer motor de agente que se implementa y establece los patrones base que reutilizarán los demás motores (Cotizador, Agendamiento).

### Relación con la iniciativa

Esta solución cubre las capacidades del Agente RAG Informativo definidas en la Fase 2 de la iniciativa:
- Responder preguntas basado en base de conocimiento
- Memoria temporal conversacional
- Personalidad configurable
- Escalamiento a humano cuando no puede resolver

### Resumen ejecutivo técnico

Motor de procesamiento conversacional que implementa el patrón Retrieval-Augmented Generation (RAG) con soporte multimodal. Recibe mensajes de texto, audios o imágenes del usuario. En el caso de audios, los transcribe utilizando la API de Whisper (OpenAI/Groq); para imágenes, descarga y decodifica la imagen en formato base64 para inyectarla directamente al LLM (vía modelos multimodales en AWS Bedrock). El motor busca fragmentos relevantes en la base de conocimiento vectorizada del agente, construye un prompt contextualizado con personalidad + contexto + historial (e información multimedia si aplica), invoca el LLM y retorna la respuesta completa para envío por WhatsApp.

Se implementa como módulo NestJS con interfaces agnósticas al proveedor, diseñado para ser extraíble a microservicio sin refactorizar consumidores.

### Dependencias

| Solución | Relación |
|----------|----------|
| 6 - Sistema de Base de Conocimiento | Provee los fragmentos indexados (embeddings) que el RAG consulta |
| 7 - Gestión de Memoria Conversacional | Provee y persiste el historial conversacional |
| 11 - Motor de Personalidad del Agente | Provee la configuración de personalidad para construir el system prompt |
| 5 - Conector de WhatsApp | Entrega mensajes preprocesados (siempre texto) y envía respuestas |
| 8 - Sistema de Escalamiento a Humano | Recibe eventos de escalamiento emitidos por el motor |
| 14 - Gestión de Empresas y Acceso | Provee la entidad Agent con su configuración |

---

## 2. Solution Narrative

### 2.1 Procesamiento de consulta RAG (Happy Path)

**Trigger:** El sistema de enrutamiento entrega un mensaje de texto al Motor RAG asociado a un agente específico.

**Comportamiento:**

1. El motor recibe el texto del usuario + el ID del agente + el ID de conversación.
2. Recupera la configuración del agente (personalidad, restricciones, idioma, umbral de relevancia, longitud máxima de respuesta).
3. Recupera el historial conversacional reciente de esa conversación (via servicio de memoria).
4. Construye la query de búsqueda semántica a partir del mensaje del usuario (opcionalmente enriquecida con contexto del historial).
5. Ejecuta búsqueda vectorial en MongoDB Atlas Vector Search contra la base de conocimiento del agente → obtiene los N fragmentos más relevantes (con score de similitud).
6. Aplica el umbral mínimo de relevancia configurado: si ningún fragmento supera el umbral, marca la consulta como "sin información suficiente".
7. **Re-ranking / Validación post-retrieval**: El LLM evalúa si los fragmentos recuperados realmente responden la pregunta del usuario. Si determina que no son suficientes a pesar del score, marca como "sin información suficiente".
8. Construye el prompt final: system prompt (personalidad + restricciones) + contexto recuperado (validado) + historial + mensaje del usuario.
9. Invoca el LLM (AWS Bedrock) con el prompt construido.
10. Recibe la respuesta completa del LLM.
11. Persiste el mensaje del usuario y la respuesta en el historial conversacional.
12. Retorna la respuesta (puede ser multi-mensaje) al sistema de enrutamiento para envío por WhatsApp.

**Resultado:** Uno o más mensajes de texto con la respuesta del agente, listos para ser enviados al usuario final.

**Error Path:**

| Escenario | Comportamiento |
|-----------|---------------|
| Sin fragmentos relevantes (bajo umbral) | El agente responde con mensaje configurable tipo "No tengo información sobre eso" + ofrece escalamiento a humano |
| LLM no disponible (Bedrock timeout/error) | Responde con mensaje de error genérico configurable + registra el fallo + ofrece escalamiento |
| Base de conocimiento vacía | El agente responde indicando que aún no tiene información configurada |
| Historial no disponible | Procesa sin contexto histórico (degradación graceful) |
| Mensaje excede límite de tokens | Trunca el historial (más antiguo primero) para respetar la ventana del modelo |

**Decisiones de diseño:**
- La búsqueda vectorial se hace siempre contra los fragmentos del agente específico (filtro por `agentId`).
- El número de fragmentos a recuperar (top-K) es configurable por agente.
- La respuesta no usa streaming — se genera completa y se envía de una vez.
- Se aplica re-ranking post-retrieval: el LLM valida que los fragmentos recuperados sean realmente relevantes para la pregunta, evitando respuestas basadas en fragmentos con score alto pero semánticamente no relacionados.

---

### 2.2 Acknowledgment de procesamiento

**Trigger:** El motor recibe un mensaje y estima que la latencia de procesamiento superará un umbral configurable (por defecto 5 segundos).

**Comportamiento:**

1. Al recibir el mensaje, el motor inicia el procesamiento de forma asíncrona.
2. Si el procesamiento no completa dentro del umbral de acknowledgment (5 segundos), envía un mensaje inmediato al usuario tipo "Dame un momento, estoy buscando esa información...".
3. Cuando la respuesta está lista, la envía normalmente.

**Resultado:** El usuario recibe feedback inmediato de que su mensaje fue recibido y está siendo procesado. Reduce la probabilidad de mensajes duplicados por impaciencia.

**Decisión de diseño:** El mensaje de acknowledgment es configurable por agente (texto personalizable). Si la respuesta llega antes del umbral, no se envía acknowledgment.

---

### 2.3 Deduplicación de mensajes en ráfaga

**Trigger:** El usuario envía múltiples mensajes antes de recibir respuesta del agente.

**Comportamiento:**

1. El sistema detecta que hay mensajes pendientes del mismo usuario en la misma conversación sin respuesta del agente.
2. Agrupa los mensajes recibidos dentro de una ventana corta (ej: 3-5 segundos) como un solo input concatenado.
3. Procesa el input agrupado como una sola consulta (flujo 2.1).
4. Retorna una sola respuesta que aborda todos los mensajes.

**Resultado:** El agente no genera múltiples respuestas desfasadas cuando el usuario envía varios mensajes seguidos.

**Nota:** La implementación de la ventana de agrupación puede ser responsabilidad del Conector de WhatsApp (Solución 5) o del motor. Definir al diseñar la Solución 5. El Motor RAG debe soportar recibir un input que sea la concatenación de múltiples mensajes.

---

### 2.4 Detección de necesidad de escalamiento

**Trigger:** Durante el procesamiento de una consulta, el motor detecta que no puede resolver adecuadamente.

**Comportamiento:**

1. El motor evalúa condiciones de escalamiento:
   - Fragmentos recuperados con score por debajo del umbral (no tiene la información).
   - El usuario solicita explícitamente hablar con un humano.
   - El LLM responde con indicador de incertidumbre (configurable en el prompt).
   - N intentos consecutivos sin respuesta satisfactoria.
2. Si se cumple alguna condición, el motor marca la conversación como "requiere escalamiento".
3. Genera un mensaje de transición para el usuario ("Te voy a comunicar con alguien del equipo...").
4. Emite un evento de escalamiento hacia el Sistema de Escalamiento (Solución 8) con: ID conversación, ID agente, motivo, último contexto.
5. **Timeout de escalamiento**: Si el escalamiento no es atendido dentro de un tiempo configurable (ej: 15-30 minutos), el agente retoma la conversación con un mensaje tipo "No pude comunicarte con alguien del equipo. ¿Puedo intentar ayudarte de otra forma?".

**Resultado:** Evento de escalamiento emitido. La conversación queda pausada temporalmente. Si no se atiende, el agente retoma para no dejar al usuario en limbo.

**Error Path:**

| Escenario | Comportamiento |
|-----------|---------------|
| Sistema de escalamiento no disponible | El agente informa al usuario que no puede transferir en este momento, que intente más tarde. Registra el fallo. |
| Timeout de escalamiento alcanzado | El agente retoma la conversación y ofrece seguir ayudando. |

---

### 2.5 Gestión de memoria conversacional (consumo)

**Trigger:** Cada interacción con el motor (implícito en el flujo 2.1).

**Comportamiento:**

1. Al recibir un mensaje, el motor solicita al servicio de memoria el historial de la conversación.
2. El servicio de memoria aplica la ventana configurada para el agente (por tiempo o por cantidad de mensajes).
3. Los mensajes dentro de la ventana se incluyen como contexto en el prompt.
4. Los mensajes fuera de la ventana se ignoran (no se eliminan de BD, solo no se usan).
5. Si la conversación lleva más de X tiempo sin actividad (configurable), se considera "reiniciada" — el próximo mensaje se trata como nueva conversación.

**Resultado:** Contexto conversacional acotado disponible para el prompt del LLM.

**Nota:** La memoria es responsabilidad de la Solución 7 (Gestión de Memoria Conversacional) como servicio transversal. El Motor RAG la consume via interface `MemoryService`.

---

### 2.6 Primera interacción con el agente

**Trigger:** Un usuario escribe por primera vez a un número asociado a un agente RAG (no existe historial previo o la sesión expiró).

**Comportamiento:**

1. El motor detecta que no hay historial activo para esta conversación (respuesta vacía del servicio de memoria).
2. Recupera la configuración del agente, incluyendo el mensaje de bienvenida.
3. Si hay mensaje de bienvenida configurado, lo envía como primer mensaje antes de procesar la consulta.
4. Procesa la consulta del usuario normalmente (flujo 2.1).
5. Persiste el inicio de la conversación.

**Resultado:** El usuario recibe el mensaje de bienvenida + la respuesta a su consulta (como mensajes separados).

**Error Path:**

| Escenario | Comportamiento |
|-----------|---------------|
| No hay mensaje de bienvenida configurado | Se omite y se responde directamente la consulta |

---

## 3. Out of Scope

- **Indexación de base de conocimiento**: Generar embeddings y almacenarlos es responsabilidad de la Solución 6.
- **Preprocesamiento multimedia inter-plataforma**: La conversión de audio a texto (Whisper) y la descarga/análisis directo de imágenes con prompts multimodales ahora están **dentro del alcance** (In-Scope) del Motor RAG para garantizar un flujo nativo y consistente. El preprocesamiento o alteración estructural de archivos de documentos complejos sigue estando fuera de alcance.
- **Envío de mensajes por WhatsApp**: El motor retorna la respuesta; el envío es responsabilidad del Conector (Solución 5).
- **Gestión de la configuración del agente**: Crear/editar agentes es responsabilidad del Panel Web (Solución 1) y Gestión de Empresas (Solución 14).
- **Implementación de la memoria**: La lógica de ventana temporal, expiración y persistencia es de la Solución 7.
- **Inbox y gestión humana**: Post-escalamiento es responsabilidad de la Solución 8.
- **Mensajes proactivos**: El RAG responde a consultas. Los mensajes proactivos son de la Solución 9.
- **Métricas y analíticas**: Registrar eventos para métricas es responsabilidad de la Solución 12.
- **Fine-tuning o entrenamiento de modelos**: Fuera de alcance de toda la iniciativa.
- **Streaming de respuestas**: No aplica (WhatsApp no lo soporta).

---

## 4. Technical Context

### Patrones de arquitectura

| Patrón | Aplicación |
|--------|-----------|
| RAG (Retrieval-Augmented Generation) | Patrón core del motor. Búsqueda semántica + generación con contexto |
| Re-ranking post-retrieval | El LLM valida relevancia de fragmentos antes de generar respuesta. Reduce alucinaciones por fragmentos con score alto pero semánticamente no relacionados |
| Strategy Pattern | Interface `LlmProvider` permite intercambiar proveedores de LLM sin modificar el motor |
| Module Pattern (NestJS) | El motor es un módulo con dependencias inyectadas, extraíble a microservicio |
| Event-Driven | Escalamiento se comunica via eventos, no llamadas directas |
| Graceful Degradation | Si servicios auxiliares fallan (memoria, escalamiento), el motor sigue funcionando con capacidad reducida |
| Acknowledgment Pattern | Feedback inmediato al usuario cuando la latencia supera umbral, evitando mensajes duplicados |

### Stack técnico

| Componente | Tecnología |
|-----------|-----------|
| Runtime | NestJS (módulo dentro del servicio existente) |
| Framework de agentes | LangChain (TypeScript) para RAG. LangGraph para agentes con herramientas (Cotizador, Agendamiento — futuro) |
| LLM | AWS Bedrock — modelos de bajo costo para PoC/desarrollo; modelos más capaces para producción con clientes reales |
| Vector Search | MongoDB Atlas Vector Search (mismo cluster) |
| Embeddings | Amazon Titan Embeddings (via Bedrock) |
| Persistencia | MongoDB (conversaciones, mensajes) |
| Comunicación interna | Inyección de dependencias NestJS (mismo proceso) |
| Eventos | Event emitter interno (extraíble a SQS/SNS cuando se separe) |

### Framework de agentes — Decisión técnica

**LangChain (TypeScript)** se usa como framework para la capa RAG:
- Provee abstracciones listas para retrievers (MongoDB Atlas Vector Search), cadenas de prompts, y memoria conversacional.
- Integración nativa con AWS Bedrock como LLM provider.
- Reduce boilerplate para el patrón RAG (buscar fragmentos + construir prompt + generar respuesta).

**LangGraph** se adoptará cuando se implementen los agentes con herramientas (Cotizador, Agendamiento):
- Permite modelar flujos conversacionales como grafos de estado (state machines).
- Soporta decisiones, loops, herramientas, y paralelismo.
- Ideal para agentes que necesitan ejecutar acciones (consultar catálogo, agendar cita, confirmar pedido).

**Principio clave:** Ambos frameworks viven **detrás de las interfaces definidas** (`LlmProvider`, `VectorSearchService`, `MemoryService`). El motor no depende directamente de LangChain — la dependencia está encapsulada en las implementaciones concretas de las interfaces. Si se necesita migrar a otro framework o a implementación directa, solo se cambia el adaptador sin afectar al motor ni a los consumidores.

```typescript
// La interface del motor NO conoce LangChain
interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

// La implementación concreta usa LangChain internamente
class BedrockLangChainProvider implements LlmProvider {
  // LangChain + Bedrock encapsulados aquí
}
```

### Modelo de datos conceptual

#### Entidades que el Motor RAG consume (no es dueño)

```
┌─────────────────────┐       ┌─────────────────────────┐
│       Agent         │       │   KnowledgeFragment     │
├─────────────────────┤       ├─────────────────────────┤
│ id                  │       │ id                      │
│ companyId           │       │ agentId                 │
│ type: "rag"         │       │ content (texto original)│
│ personality {}      │──────▶│ embedding (vector)      │
│ config {            │  1:N  │ sourceId (ref archivo)  │
│   relevanceThreshold│       │ metadata {}             │
│   topK              │       │ createdAt               │
│   maxResponseLength │       └─────────────────────────┘
│   memoryWindow      │
│   welcomeMessage    │       ┌─────────────────────────┐
│   failedAttempts    │       │    Conversation         │
│     BeforeEscalation│       ├─────────────────────────┤
│ }                   │       │ id                      │
│ channelId           │       │ agentId                 │
│ status              │       │ externalUserId          │
└─────────────────────┘       │ status (active/paused/  │
                              │         escalated)      │
                              │ startedAt               │
                              │ lastActivityAt          │
                              └──────────┬──────────────┘
                                         │ 1:N
                                         ▼
                              ┌─────────────────────────┐
                              │       Message           │
                              ├─────────────────────────┤
                              │ id                      │
                              │ conversationId          │
                              │ role (user/assistant)   │
                              │ content                 │
                              │ parts[] (multi-mensaje) │
                              │ timestamp               │
                              │ metadata {}             │
                              └─────────────────────────┘
```

**Notas:**
- `Agent` es propiedad de Solución 14 (Gestión de Empresas).
- `KnowledgeFragment` es propiedad de Solución 6 (Base de Conocimiento).
- `Conversation` y `Message` son propiedad de Solución 7 (Memoria Conversacional).
- El Motor RAG **no tiene entidades propias**. Es un motor de procesamiento stateless que consume datos de otros dominios.
- `parts[]` en Message permite respuestas multi-mensaje (texto + imagen, etc.).

### Contratos de integración

#### Input (lo que el motor recibe)

```typescript
interface RagProcessInput {
  agentId: string;
  conversationId: string;
  userMessage?: string;       // Opcional si el input es multimedia (ej. imagen sin texto)
  timestamp: Date;
  channelId?: string;         // Identificador del canal/proveedor
  messageType?: 'text' | 'audio' | 'image' | 'document';
  mediaId?: string;           // ID del media en el proveedor (ej. WhatsApp)
  mimeType?: string;          // Tipo MIME del archivo adjunto
}
```

#### Output (lo que el motor retorna)

```typescript
interface RagProcessOutput {
  conversationId: string;
  messages: ResponseMessage[];  // Puede ser múltiples mensajes
  escalated: boolean;
  escalationReason?: string;
}

interface ResponseMessage {
  type: "text" | "image" | "document";
  content: string;
}
```

#### Evento de escalamiento (lo que emite)

```typescript
interface EscalationEvent {
  conversationId: string;
  agentId: string;
  companyId: string;
  reason: "low_relevance" | "user_request" | "failed_attempts" | "llm_uncertainty";
  lastContext: string;        // Resumen del último intercambio
  timestamp: Date;
}
```

#### Interfaces internas (abstracciones)

```typescript
interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

interface VectorSearchService {
  search(agentId: string, query: string, topK: number): Promise<SearchResult[]>;
}

interface MemoryService {
  getHistory(conversationId: string): Promise<Message[]>;
  saveMessage(conversationId: string, message: Message): Promise<void>;
  isNewSession(conversationId: string): Promise<boolean>;
}
```

---

## 5. Acceptance Criteria

### Procesamiento de consultas

- [ ] Dado un mensaje de texto entrante asociado a un agente RAG, el motor busca fragmentos relevantes en la base de conocimiento del agente y genera una respuesta basada en ellos.
- [ ] La búsqueda vectorial respeta el umbral de relevancia configurado por agente (`relevanceThreshold`). Si ningún fragmento supera el umbral, el agente responde con un mensaje de "sin información" configurable.
- [ ] Se aplica re-ranking post-retrieval: el LLM valida que los fragmentos recuperados realmente respondan la pregunta antes de generar la respuesta final.
- [ ] El prompt enviado al LLM incluye: system prompt (personalidad + restricciones), fragmentos de contexto recuperados (validados), historial conversacional reciente, y el mensaje del usuario.
- [ ] La respuesta del LLM se retorna completa (sin streaming) al sistema de envío.
- [ ] El agente puede responder con múltiples mensajes en una sola interacción.
- [ ] La longitud de respuesta se controla dentro del rango configurado por agente (500-1000 caracteres sugerido).
- [ ] El número de fragmentos recuperados (top-K) es configurable por agente.

### Acknowledgment y deduplicación

- [ ] Si el procesamiento supera un umbral de tiempo configurable (por defecto 5 segundos), se envía un mensaje de acknowledgment al usuario ("Dame un momento...").
- [ ] El mensaje de acknowledgment es configurable por agente.
- [ ] Si el usuario envía múltiples mensajes antes de recibir respuesta, se agrupan y procesan como una sola consulta.
- [ ] El motor soporta recibir un input que sea la concatenación de múltiples mensajes del usuario.

### Memoria conversacional

- [ ] El motor recupera el historial reciente de la conversación según la ventana de memoria configurada (tiempo o cantidad de mensajes).
- [ ] Si no hay historial disponible (primera interacción o sesión expirada), el motor procesa sin contexto histórico.
- [ ] Cada interacción (mensaje del usuario + respuesta del agente) se persiste en el historial via el servicio de memoria.
- [ ] Si el historial excede la ventana de tokens del modelo, se trunca desde los mensajes más antiguos.

### Primera interacción

- [ ] Si no existe historial activo para la conversación, el agente envía el mensaje de bienvenida configurado antes de responder la consulta.
- [ ] Si no hay mensaje de bienvenida configurado, responde directamente la consulta.

### Escalamiento a humano

- [ ] El motor detecta necesidad de escalamiento cuando: score bajo en búsqueda vectorial, solicitud explícita del usuario, o N intentos fallidos consecutivos (configurable via `failedAttemptsBeforeEscalation`).
- [ ] Al escalar, emite un evento con: ID conversación, ID agente, motivo del escalamiento, último contexto.
- [ ] El agente deja de responder mensajes en esa conversación temporalmente.
- [ ] El usuario recibe un mensaje de transición antes del escalamiento.
- [ ] Si el escalamiento no se atiende dentro del timeout configurado, el agente retoma la conversación y ofrece seguir ayudando.

### Resiliencia y errores

- [ ] Si el LLM (Bedrock) no está disponible, el agente responde con un mensaje de error configurable y ofrece escalamiento.
- [ ] Si la base de conocimiento está vacía (sin fragmentos indexados), el agente informa que no tiene información configurada.
- [ ] Si la memoria conversacional no está disponible, el motor procesa sin contexto (degradación graceful, no fallo).
- [ ] Todos los errores se registran para diagnóstico.

### Diseño modular

- [ ] El motor se implementa como módulo NestJS con interfaces bien definidas (`LlmProvider`, `VectorSearchService`, `MemoryService`).
- [ ] Cambiar de proveedor de LLM requiere solo una nueva implementación de `LlmProvider`, sin modificar el motor.
- [ ] El módulo puede extraerse a un microservicio independiente sin refactorizar los consumidores.
- [ ] Las interfaces de comunicación están definidas con tipos TypeScript compartidos (`@multibotagents/types`).

---

## 6. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es falso |
|---|----------|-------------------|
| 1 | MongoDB Atlas Vector Search tiene rendimiento suficiente para el volumen inicial (< 100 consultas/min por agente) | Migrar a vector store dedicado (OpenSearch, Pinecone) |
| 2 | Los modelos de bajo costo de Bedrock son suficientes para la PoC. Para producción con clientes reales se usarán modelos más capaces | Si los modelos capaces son demasiado costosos, ajustar la economía del producto |
| 3 | La Solución 6 entrega fragmentos bien segmentados y con embeddings de calidad | Respuestas del RAG serán pobres. Requiere re-trabajo en la indexación |
| 4 | La latencia total (búsqueda vectorial + LLM) se mantiene bajo 10 segundos | Experiencia de usuario degradada. El acknowledgment mitiga parcialmente |
| 5 | WhatsApp Business API permite enviar múltiples mensajes consecutivos sin rate limiting agresivo | Limitar respuestas a un solo mensaje o implementar cola de envío |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|-----------|
| 1 | Alucinaciones del LLM (respuestas inventadas no basadas en la base de conocimiento) | Media | Alto | Umbral de relevancia + re-ranking post-retrieval + instrucciones explícitas en el prompt de no inventar |
| 2 | Costos de Bedrock escalan con el uso (especialmente con modelos capaces en producción) | Media | Medio | Monitoreo de costos + límite de tokens por respuesta + caching de respuestas frecuentes (futuro) |
| 3 | Ventana de contexto del modelo insuficiente para historial + fragmentos + prompt | Media | Medio | Truncamiento inteligente del historial + límite de fragmentos recuperados |
| 4 | Latencia alta en horas pico | Baja | Medio | Modelos rápidos + timeout configurable + acknowledgment automático |
| 5 | Segmentación pobre de documentos en Solución 6 produce RAG de baja calidad | Media | Alto | Re-ranking post-retrieval mitiga parcialmente. Requiere diseño cuidadoso de la Solución 6 |

### Puntos a validar en Beta

Los siguientes puntos se identificaron en el premortem y deben validarse durante la fase de beta:

- **Latencia end-to-end**: Medir P95 de latencia con carga real. Si supera 10s consistentemente, evaluar modelos más rápidos o caching.
- **Calibración del umbral de relevancia**: Probar con datos reales de empresas beta. Determinar si un umbral numérico es suficiente o se necesita lógica más sofisticada.
- **Escalamiento sin atención**: Medir tiempo promedio de atención de escalamientos. Validar que el timeout + retorno del agente funciona correctamente.
- **Calidad de respuestas con modelos económicos vs capaces**: Benchmark comparativo con preguntas reales para determinar el modelo mínimo viable para producción.

### Interfaces asumidas con soluciones no diseñadas

| Solución | Interface asumida | Riesgo |
|----------|------------------|--------|
| 5 - Conector WhatsApp | Entrega texto normalizado al motor. Soporta envío de múltiples mensajes como respuesta. Implementa deduplicación de mensajes en ráfaga (ventana de agrupación). | Si el conector no soporta multi-mensaje o deduplicación, el motor debe manejarlos internamente |
| 6 - Base de Conocimiento | Fragmentos almacenados en MongoDB con índice `vectorSearch`, campo `embedding` y filtro por `agentId`. **CRÍTICO: La calidad de la segmentación determina la calidad del RAG.** | Si la estructura difiere, adaptar el `VectorSearchService`. Si la segmentación es pobre, el re-ranking mitiga parcialmente pero no resuelve el problema de raíz |
| 7 - Memoria Conversacional | Expone interface `MemoryService` con `getHistory`, `saveMessage`, `isNewSession`. **La ventana de memoria debe ser por sesión lógica (inactividad de 2-4 horas), no por tiempo fijo corto (30 min).** WhatsApp es asíncrono por naturaleza. | Si la memoria usa ventana fija corta, los usuarios experimentarán pérdida de contexto frecuente |
| 8 - Escalamiento | Consume eventos tipo `EscalationEvent` y actualiza el status de la conversación. Debe soportar timeout configurable con retorno al agente. | Si el escalamiento no soporta timeout, el usuario queda en limbo |
