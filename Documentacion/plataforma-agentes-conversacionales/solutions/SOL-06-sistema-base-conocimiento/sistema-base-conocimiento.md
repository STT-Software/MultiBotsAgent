---
taxonomy: solution
key: sistema-base-conocimiento
solution: Sistema de Base de Conocimiento
initiative: plataforma-agentes-conversacionales
product: Por definir
author: Solutions Architect
created: 2026-05-12
updated: 2026-05-12
version: 1.0.0
status: approved
language: es
changelog:
  - date: 2026-05-12
    author: Solutions Architect
    description: Diseño inicial completo — narrativa técnica, modelo de datos, acceptance criteria. Incluye definición de MVP para desbloquear Solución 2 (Motor RAG).
---

# Sistema de Base de Conocimiento

## 1. Overview

### Contexto

El Sistema de Base de Conocimiento es la solución #6 del Solution Map de la iniciativa "Plataforma de Agentes Conversacionales". Es la pieza que alimenta al Motor de Agente RAG (Solución 2) con los fragmentos indexados que permiten responder preguntas basadas en información de la empresa.

### Relación con la iniciativa

Esta solución cubre las capacidades de "Base de Conocimiento" definidas en la Fase 2 de la iniciativa:
- Cargar archivos: PDFs, documentos, Excel, tablas
- Integraciones: Google Drive, Notion, Confluence, SharePoint, Dropbox
- Crear/editar contenido directamente en la plataforma
- Conexión automática con credenciales simples

### Resumen ejecutivo técnico

Sistema de ingesta, procesamiento y almacenamiento vectorial de documentos. Recibe archivos o texto, extrae el contenido, lo segmenta en fragmentos optimizados para retrieval (chunking), genera embeddings vectoriales via AWS Bedrock, y los almacena en MongoDB Atlas Vector Search. El Motor RAG consulta estos fragmentos para construir respuestas contextualizadas.

Se implementa como un flujo híbrido: API NestJS para gestión (validación, upload, consultas, eliminación) + Lambda asíncrona disparada por SQS para el procesamiento pesado (extracción, chunking, embeddings, almacenamiento).

### Dependencias

| Solución | Relación |
|----------|----------|
| 2 - Motor de Agente RAG | Consumidor principal — busca fragmentos via VectorSearchService |
| 14 - Gestión de Empresas y Acceso | Provee la entidad Agent a la que se asocian los documentos |
| 1 - Panel de Administración Web | UI de carga de archivos y gestión de fuentes (consume la API de esta solución) |
| 13 - Gestión de Integraciones Externas | Provee conexión a fuentes externas (Google Drive, Notion, etc.) — post-MVP |

---

## 2. Solution Narrative

### 2.1 Ingesta de documento (Happy Path)

**Trigger:** Un usuario (admin de empresa) sube un archivo o crea contenido textual asociado a un agente, via la API de gestión.

**Comportamiento:**

1. El servicio NestJS recibe la solicitud con el archivo + `agentId` + metadata opcional (título, categoría).
2. Valida: formato soportado (PDF, TXT, MD para MVP; DOCX, XLSX post-MVP), tamaño máximo 10MB, agente existente.
3. Crea un registro `KnowledgeSource` con estado `processing`.
4. Sube el archivo original a S3 (bucket dedicado, key: `{companyId}/{agentId}/{sourceId}/{filename}`).
5. El evento S3 PutObject dispara un mensaje en la cola SQS.
6. La Lambda `indexation-handler` consume el mensaje:
   a. Descarga el archivo de S3.
   b. Extrae el texto según el formato (pdf-parse para PDF, lectura directa para TXT/MD).
   c. Aplica la estrategia de chunking (ver 2.2).
   d. Genera embeddings para cada fragmento via Amazon Titan Embeddings (Bedrock).
   e. Almacena los fragmentos con embeddings en MongoDB (colección con índice `vectorSearch`).
   f. Actualiza el `KnowledgeSource` a estado `indexed` con metadata (cantidad de fragmentos, fecha de procesamiento).
7. El usuario puede consultar el estado del procesamiento via la API.

**Resultado:** Documento indexado, fragmentos disponibles para búsqueda vectorial por el Motor RAG.

**Error Path:**

| Escenario | Comportamiento |
|-----------|---------------|
| Formato no soportado | API rechaza con 400. No crea KnowledgeSource |
| Archivo excede 10MB | API rechaza con 413. No crea KnowledgeSource |
| Agente no existe | API rechaza con 404 |
| Error en extracción de texto (PDF corrupto) | Lambda marca KnowledgeSource como `failed` con razón del error |
| Error en generación de embeddings (Bedrock no disponible) | Lambda marca como `failed`. Se puede reintentar manualmente |
| Error parcial (algunos fragmentos fallan) | Indexa los exitosos, marca como `partial`. Registra los fallidos |
| Lambda timeout (> 15 min) | SQS reintenta según política de retry. Si persiste, va a DLQ |

**Decisiones de diseño:**
- El procesamiento es **asíncrono**. La API retorna inmediatamente con el `KnowledgeSource` en estado `processing`.
- Se almacena el archivo original en S3 para permitir re-procesamiento si se cambia la estrategia de chunking.
- Cada fragmento mantiene referencia a su `sourceId` para trazabilidad y eliminación en cascada.
- La Lambda procesa un archivo a la vez. SQS maneja la concurrencia y reintentos.

---

### 2.2 Estrategia de Chunking

**Trigger:** Paso 6c del flujo de ingesta (dentro de la Lambda).

**Comportamiento:**

1. La Lambda recibe el texto completo extraído del documento.
2. Aplica la estrategia de segmentación:
   - **MVP — Chunking por tamaño con overlap**: Divide en fragmentos de ~800 tokens con overlap de 100 tokens entre fragmentos consecutivos. Prioriza corte en límites de párrafo cuando es posible.
   - **Post-MVP — Chunking semántico**: Divide por secciones lógicas del documento (títulos, headers en MD, separadores). Respeta límites naturales del contenido.
3. Para archivos Markdown: usa los headers (`#`, `##`, `###`) como separadores naturales de secciones antes de aplicar el chunking por tamaño.
4. Cada fragmento resultante incluye:
   - El texto del fragmento.
   - Metadata de posición (índice secuencial, sección si aplica).
   - Referencia al documento fuente (`sourceId`).
5. Fragmentos que excedan el tamaño máximo del modelo de embeddings se subdividen.
6. Fragmentos demasiado cortos (< 50 tokens) se fusionan con el siguiente.

**Resultado:** Lista de fragmentos de tamaño óptimo para embedding y retrieval.

**Decisiones de diseño:**
- **Tamaño objetivo por fragmento**: ~800 tokens (balanceo entre granularidad y contexto suficiente para que el RAG genere buenas respuestas).
- **Overlap**: ~100 tokens (evita perder contexto en los bordes de corte).
- **MD tiene ventaja**: Los archivos Markdown tienen estructura explícita (headers), lo que permite chunking más inteligente incluso en el MVP.
- **La estrategia de chunking vive en `packages/core`**: Es lógica pura sin dependencias de AWS. La Lambda la consume.

---

### 2.3 Eliminación de documento / fuente

**Trigger:** Un usuario elimina un documento de la base de conocimiento de un agente via la API.

**Comportamiento:**

1. La API NestJS recibe la solicitud de eliminación con el `sourceId`.
2. Valida que el `KnowledgeSource` existe y pertenece al agente/empresa del usuario.
3. Elimina todos los `KnowledgeFragment` asociados a ese `sourceId` de MongoDB.
4. Elimina el archivo original de S3.
5. Elimina el registro `KnowledgeSource`.
6. Retorna confirmación.

**Resultado:** Fragmentos eliminados del índice vectorial. El Motor RAG ya no los encuentra en búsquedas.

**Error Path:**

| Escenario | Comportamiento |
|-----------|---------------|
| Source no existe | Retorna 404 |
| Eliminación parcial de fragmentos | Reintenta. Si persiste, marca como `pending_deletion` para limpieza posterior (job) |
| Source en estado `processing` | Permite eliminación — cancela el procesamiento pendiente |

---

### 2.4 Re-procesamiento de documento

**Trigger:** El usuario solicita re-indexar un documento (ej: después de ajustar configuración de chunking), o el sistema necesita re-procesar tras un fallo.

**Comportamiento:**

1. La API recibe solicitud de re-procesamiento para un `sourceId`.
2. Marca el `KnowledgeSource` como `processing`.
3. Elimina todos los fragmentos existentes de ese `sourceId`.
4. Envía un mensaje a SQS para que la Lambda re-procese el archivo (que sigue en S3).
5. La Lambda ejecuta el flujo estándar de extracción + chunking + embeddings.
6. Actualiza el `KnowledgeSource` con nueva metadata.

**Resultado:** Fragmentos regenerados con la configuración actual. Búsquedas del RAG usan los nuevos fragmentos.

---

### 2.5 Creación directa de contenido (texto libre)

**Trigger:** Un usuario crea contenido directamente en la plataforma (texto o markdown) asociado a un agente.

**Comportamiento:**

1. La API recibe el texto + título + `agentId`.
2. Valida longitud (máximo equivalente a 10MB de texto).
3. Crea un `KnowledgeSource` de tipo `text` con estado `processing`.
4. Almacena el texto como archivo en S3 (formato `.md` o `.txt`).
5. El flujo continúa igual que un archivo subido (S3 event → SQS → Lambda).

**Resultado:** Contenido textual indexado, disponible para el RAG.

**Nota:** La edición de contenido existente equivale a un re-procesamiento (flujo 2.4). Se reemplaza el archivo en S3 y se re-indexa.

---

### 2.6 Consulta de estado y listado de fuentes

**Trigger:** El usuario o el panel web consulta el estado de las fuentes de conocimiento de un agente.

**Comportamiento:**

1. La API expone endpoints para:
   - Listar todas las fuentes de un agente (con estado, cantidad de fragmentos, fecha).
   - Consultar el estado de una fuente específica.
   - Obtener estadísticas generales (total de fuentes, total de fragmentos, estado general).

**Resultado:** Información de gestión para el panel web.

---

### 2.7 Ingesta desde integración externa (Post-MVP)

**Trigger:** Un usuario conecta una fuente externa (Google Drive, Notion, etc.) y selecciona documentos para indexar.

**Comportamiento:**

1. El usuario autoriza la integración via Solución 13 (OAuth o API key).
2. El sistema lista los documentos disponibles en la fuente.
3. El usuario selecciona qué documentos indexar.
4. Para cada documento seleccionado:
   - Descarga el contenido via la integración.
   - Lo almacena en S3 como copia local.
   - Ejecuta el flujo de ingesta estándar (2.1).
5. Opcionalmente, configura sincronización periódica (detecta cambios y re-indexa).

**Resultado:** Documentos de fuentes externas indexados como si fueran subidos manualmente.

**Nota:** Este flujo depende de la Solución 13 (Gestión de Integraciones Externas). No forma parte del MVP.

---

## 3. Out of Scope

- **Procesamiento de imágenes/OCR**: No se extraen textos de imágenes dentro de PDFs. Solo texto nativo.
- **Traducción automática**: Los documentos se indexan en el idioma original.
- **Versionado de documentos**: No se mantiene historial de versiones. Re-procesar reemplaza.
- **Búsqueda full-text (keyword)**: Solo búsqueda vectorial. No hay búsqueda por palabras clave.
- **Deduplicación de contenido**: Si se sube el mismo documento dos veces, se indexa dos veces.
- **Procesamiento de video/audio**: Solo documentos de texto.
- **Integraciones externas en MVP**: Google Drive, Notion, Confluence, SharePoint, Dropbox son post-MVP.
- **UI de carga en MVP**: El MVP expone endpoints HTTP. La UI es responsabilidad de la Solución 1.
- **Chunking semántico avanzado en MVP**: El MVP usa chunking por tamaño con overlap + separación por headers en MD.

---

## 4. Technical Context

### Patrones de arquitectura

| Patrón | Aplicación |
|--------|-----------|
| Pipeline Pattern | Ingesta como pipeline: Upload → Extract → Chunk → Embed → Store |
| Strategy Pattern | Estrategia de chunking intercambiable (tamaño fijo, semántico, híbrido) |
| Event-Driven (async) | S3 event → SQS → Lambda. Procesamiento desacoplado de la API |
| Repository Pattern | Acceso a fragmentos y fuentes via repositorios en `packages/db` |
| Dead Letter Queue | Mensajes que fallan repetidamente van a DLQ para análisis |

### Arquitectura del flujo

```
┌──────────────┐     ┌──────────────┐     ┌─────────┐     ┌─────────────────────┐
│  Panel Web   │────▶│ API NestJS   │────▶│   S3    │────▶│  S3 Event → SQS     │
│  (Solución 1)│     │ (validación, │     │ (archivo│     │                     │
└──────────────┘     │  upload,     │     │ original)     └──────────┬──────────┘
                     │  consultas)  │     └─────────┘                │
                     └──────────────┘                                ▼
                            ▲                              ┌─────────────────────┐
                            │                              │  Lambda:            │
                            │                              │  indexation-handler  │
                            │                              │  (extract + chunk   │
                            │  actualiza estado            │   + embed + store)  │
                            │                              └──────────┬──────────┘
                            │                                         │
                     ┌──────┴──────────┐                             │
                     │    MongoDB      │◀────────────────────────────┘
                     │ (KnowledgeSource│   escribe fragmentos
                     │  + Fragments    │   con embeddings
                     │  + vectorSearch)│
                     └──────┬──────────┘
                            │
                            ▼
                     ┌──────────────────┐
                     │  Motor RAG       │
                     │  (Solución 2)    │
                     │  busca via       │
                     │  VectorSearch    │
                     └──────────────────┘
```

### Stack técnico

| Componente | Tecnología |
|-----------|-----------|
| API de gestión | Módulo NestJS dentro del servicio existente |
| Almacenamiento de archivos | AWS S3 (bucket dedicado) |
| Cola de procesamiento | AWS SQS (standard queue + DLQ) |
| Procesamiento async | AWS Lambda (TypeScript, `apps/functions/`) |
| Extracción de texto | pdf-parse (PDF), lectura directa (TXT, MD) |
| Chunking | Lógica pura en `packages/core` |
| Embeddings | Amazon Titan Embeddings v2 (via AWS Bedrock) |
| Vector Store | MongoDB Atlas Vector Search |
| Infra | SST v3 (S3 bucket, SQS queue, Lambda, permisos) |

### Modelo de datos conceptual

```
┌─────────────────────────────┐
│      KnowledgeSource        │
├─────────────────────────────┤
│ _id: ObjectId               │
│ agentId: string             │
│ companyId: string           │
│ title: string               │
│ type: "file" | "text"       │
│ format: "pdf" | "txt" |    │
│         "md" | "docx" |    │
│         "xlsx"              │
│ originalFileKey: string     │  ← S3 key
│ fileSizeBytes: number       │
│ status: "processing" |     │
│         "indexed" |         │
│         "failed" |          │
│         "partial" |         │
│         "pending_deletion"  │
│ fragmentCount: number       │
│ errorReason?: string        │
│ metadata: {                 │
│   category?: string         │
│   description?: string      │
│ }                           │
│ createdAt: Date             │
│ updatedAt: Date             │
│ processedAt?: Date          │
└──────────────┬──────────────┘
               │ 1:N
               ▼
┌─────────────────────────────┐
│     KnowledgeFragment       │
├─────────────────────────────┤
│ _id: ObjectId               │
│ sourceId: string            │
│ agentId: string             │  ← Desnormalizado para filtro en vectorSearch
│ content: string             │  ← Texto del chunk
│ embedding: number[]         │  ← Vector float (1024 dims)
│ position: number            │  ← Orden secuencial en el documento
│ tokenCount: number          │
│ metadata: {                 │
│   section?: string          │
│   page?: number             │
│   sourceTitle: string       │
│ }                           │
│ createdAt: Date             │
└─────────────────────────────┘
```

**Índice vectorSearch en MongoDB Atlas:**

```json
{
  "name": "knowledge_vector_index",
  "type": "vectorSearch",
  "fields": [
    {
      "path": "embedding",
      "type": "vector",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "path": "agentId",
      "type": "filter"
    }
  ]
}
```

### Contratos de integración

#### Con Motor RAG (Solución 2) — Interface de búsqueda vectorial:

```typescript
interface VectorSearchService {
  search(agentId: string, query: string, topK: number): Promise<SearchResult[]>;
}

interface SearchResult {
  fragmentId: string;
  content: string;
  score: number;          // Similitud coseno (0-1)
  metadata: {
    sourceId: string;
    sourceTitle: string;
    section?: string;
    page?: number;
  };
}
```

#### API de gestión (para Panel Web — Solución 1):

```typescript
interface KnowledgeManagementService {
  uploadFile(agentId: string, file: Buffer, filename: string, metadata?: SourceMetadata): Promise<KnowledgeSource>;
  createTextContent(agentId: string, title: string, content: string): Promise<KnowledgeSource>;
  deleteSource(sourceId: string): Promise<void>;
  reprocessSource(sourceId: string): Promise<KnowledgeSource>;
  getSourcesByAgent(agentId: string): Promise<KnowledgeSource[]>;
  getSourceStatus(sourceId: string): Promise<KnowledgeSource>;
}
```

#### Evento SQS (mensaje que recibe la Lambda):

```typescript
interface IndexationMessage {
  sourceId: string;
  agentId: string;
  companyId: string;
  s3Key: string;
  format: "pdf" | "txt" | "md";
  title: string;
}
```

### Infraestructura (SST v3)

Recursos a crear en `infra/src/`:

| Recurso | Ubicación | Descripción |
|---------|-----------|-------------|
| S3 Bucket | `infra/src/storage/knowledge-bucket.ts` | Bucket para archivos originales |
| SQS Queue | `infra/src/queues/indexation-queue.ts` | Cola de procesamiento + DLQ |
| Lambda | `infra/src/functions/indexation-handler.ts` | Handler de indexación |
| Permisos | En cada recurso | Lambda: read S3, write MongoDB, invoke Bedrock. API: write S3, read/write MongoDB |

---

## 5. Acceptance Criteria

### Ingesta de documentos

- [ ] El sistema acepta archivos PDF, TXT y MD asociados a un agente (MVP). DOCX y XLSX post-MVP.
- [ ] El tamaño máximo de archivo es 10MB. Archivos mayores se rechazan con error claro.
- [ ] El procesamiento es asíncrono: la API retorna inmediatamente con estado `processing`.
- [ ] El archivo original se almacena en S3 para re-procesamiento futuro.
- [ ] Se crea un registro `KnowledgeSource` que refleja el estado del procesamiento en tiempo real.
- [ ] Al completar exitosamente, el estado cambia a `indexed` con la cantidad de fragmentos generados.
- [ ] Si falla, el estado cambia a `failed` con la razón del error.
- [ ] El procesamiento se ejecuta en una Lambda disparada por SQS (evento S3).

### Extracción de texto

- [ ] Se extrae texto de PDFs (texto nativo, no OCR).
- [ ] Se lee contenido de archivos TXT directamente.
- [ ] Se lee contenido de archivos Markdown preservando estructura de headers.

### Chunking

- [ ] Los documentos se segmentan en fragmentos de ~800 tokens.
- [ ] Se aplica overlap de ~100 tokens entre fragmentos consecutivos.
- [ ] Se prioriza corte en límites de párrafo cuando es posible.
- [ ] Para archivos MD, se usan los headers como separadores naturales antes del chunking por tamaño.
- [ ] Fragmentos menores a 50 tokens se fusionan con el siguiente.
- [ ] Cada fragmento mantiene metadata de posición y referencia al documento fuente.
- [ ] La lógica de chunking vive en `packages/core` (lógica pura, sin deps de AWS).

### Embeddings y almacenamiento vectorial

- [ ] Se generan embeddings via Amazon Titan Embeddings v2 (Bedrock).
- [ ] Los fragmentos con embeddings se almacenan en MongoDB con índice `vectorSearch`.
- [ ] Cada fragmento tiene campo `agentId` como filtro para búsquedas aisladas por agente.
- [ ] El índice vectorial usa similitud coseno con 1024 dimensiones.

### Eliminación

- [ ] Al eliminar un `KnowledgeSource`, se eliminan todos sus fragmentos del índice vectorial.
- [ ] Se elimina el archivo original de S3.
- [ ] Se elimina el registro `KnowledgeSource` de MongoDB.

### Re-procesamiento

- [ ] Un documento puede re-procesarse manualmente (elimina fragmentos antiguos, genera nuevos).
- [ ] El re-procesamiento usa la configuración de chunking actual.
- [ ] Durante el re-procesamiento, el estado vuelve a `processing`.

### Creación directa de contenido

- [ ] El usuario puede crear contenido textual directamente (sin subir archivo).
- [ ] El contenido textual se almacena como archivo en S3 y se procesa igual que un archivo subido.
- [ ] El contenido es editable; al editar se re-procesa automáticamente.

### Integración con Motor RAG (Solución 2)

- [ ] El Motor RAG puede buscar fragmentos por `agentId` + query vectorial + topK via `VectorSearchService`.
- [ ] Los resultados incluyen: contenido del fragmento, score de similitud, metadata de fuente.
- [ ] La búsqueda filtra exclusivamente por el `agentId` indicado (aislamiento entre agentes).

### Resiliencia

- [ ] Mensajes que fallan en la Lambda se reintentan según política de SQS (3 reintentos).
- [ ] Mensajes que fallan persistentemente van a Dead Letter Queue para análisis.
- [ ] La Lambda tiene timeout de 5 minutos (suficiente para 10MB).
- [ ] Si Bedrock no está disponible, el mensaje vuelve a la cola para reintento.

---

## 6. MVP vs Solución Completa

### MVP (desbloquea Solución 2)

| Incluido | Detalle |
|----------|---------|
| Formatos | PDF, TXT, MD |
| Ingesta | Endpoint HTTP (sin UI) |
| Procesamiento | Lambda + SQS (evento S3) |
| Chunking | Por tamaño (~800 tokens) con overlap (~100 tokens) + separación por headers en MD |
| Embeddings | Amazon Titan Embeddings v2 |
| Storage | S3 + MongoDB Atlas Vector Search |
| Eliminación | Endpoint HTTP |
| Re-procesamiento | Endpoint HTTP |
| Creación de texto | Endpoint HTTP |
| VectorSearchService | Funcional para el Motor RAG |
| Consulta de estado | Endpoint HTTP |

### Post-MVP (solución completa)

| Funcionalidad | Detalle |
|---------------|---------|
| Formatos adicionales | DOCX, XLSX |
| Integraciones externas | Google Drive, Notion, Confluence, SharePoint, Dropbox |
| Sincronización periódica | Detectar cambios en fuentes externas y re-indexar |
| Chunking semántico avanzado | Segmentación por secciones lógicas con NLP |
| UI completa | Interfaz de carga y gestión en el Panel Web (Solución 1) |
| Métricas | Uso de la base de conocimiento, documentos más consultados |
| Múltiples modelos de embeddings | Configuración por agente |
| Bulk upload | Subir múltiples archivos a la vez |

---

## 7. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es falso |
|---|----------|-------------------|
| 1 | Amazon Titan Embeddings v2 genera vectores de calidad suficiente para español | Migrar a otro modelo (Cohere multilingual, OpenAI ada-002) |
| 2 | MongoDB Atlas Vector Search soporta el volumen de fragmentos por agente (< 100K fragmentos inicialmente) | Migrar a vector store dedicado (OpenSearch, Pinecone) |
| 3 | El chunking por tamaño con overlap es suficiente para el MVP | Acelerar implementación de chunking semántico |
| 4 | Los PDFs de las empresas tienen texto nativo (no son escaneos/imágenes) | Agregar OCR via AWS Textract — complejidad y costo adicional |
| 5 | La Lambda de 5 min es suficiente para procesar un PDF de 10MB | Aumentar timeout o dividir en pasos (Step Functions) |
| 6 | 1024 dimensiones (Titan v2) ofrecen buena relación calidad/rendimiento | Evaluar modelos con menos dimensiones si hay problemas de latencia |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|-----------|
| 1 | Chunking pobre produce RAG de baja calidad | Media | Alto | Overlap generoso + separación por headers en MD + iteración rápida + re-procesamiento disponible |
| 2 | Costos de embeddings escalan con volumen de documentos | Baja | Medio | Monitoreo de costos + procesamiento batch dentro de la Lambda |
| 3 | PDFs con formato complejo (tablas, columnas) producen texto desordenado | Media | Medio | Documentar limitación. Post-MVP evaluar extractores más sofisticados |
| 4 | Latencia de indexación alta para documentos grandes | Media | Bajo | Procesamiento async + feedback de estado al usuario |
| 5 | Índice vectorial crece y degrada rendimiento de búsqueda | Baja | Medio | MongoDB Atlas maneja bien millones de vectores. Monitorear P95 de búsqueda |

### Interfaces asumidas con soluciones no diseñadas

| Solución | Interface asumida | Riesgo |
|----------|------------------|--------|
| 1 - Panel Web | Consume la API de gestión (upload, listado, eliminación, estado). La UI de carga es responsabilidad del panel | Si el panel necesita funcionalidades no contempladas en la API, extender |
| 2 - Motor RAG | Consume `VectorSearchService` con `search(agentId, query, topK)`. Espera `SearchResult[]` con content + score + metadata | Interface ya definida en SOL-02. Alineadas |
| 13 - Integraciones | Post-MVP. Proveerá documentos descargados que se procesan como archivos normales | Si las integraciones entregan formatos no soportados, agregar extractores |
| 14 - Gestión de Empresas | Provee `agentId` y `companyId` válidos. La validación de pertenencia se hace contra la entidad Agent | Si la estructura de Agent cambia, adaptar validaciones |


---

## 8. Estado de Implementación (para QA)

**Fecha de actualización:** 2026-05-22  
**Estado general:** ✅ MVP Completado — Funcional en stage `crisdavid`

---

### Funcionalidades COMPLETADAS y verificadas en ambiente real

| # | Funcionalidad | Endpoint / Componente | Verificado |
|---|---|---|---|
| 1 | Carga de archivos PDF | `POST /knowledge/upload` | ✅ Probado con PDF real (201KB) |
| 2 | Carga de archivos TXT/MD | `POST /knowledge/upload` | ✅ |
| 3 | Creación de contenido textual | `POST /knowledge/text` | ✅ Probado con FAQ Markdown |
| 4 | Listado de fuentes por agente | `GET /knowledge/agent/:agentId` | ✅ |
| 5 | Consulta de estado individual | `GET /knowledge/:sourceId` | ✅ Con detección de timeout |
| 6 | Eliminación completa (fragments + S3 + source) | `DELETE /knowledge/:sourceId` | ✅ |
| 7 | Re-procesamiento de fuentes | `POST /knowledge/:sourceId/reprocess` | ✅ |
| 8 | Pipeline de indexación (Lambda) | Extract → Chunk → Embed → Store | ✅ Logs visibles en SST |
| 9 | Extracción de texto PDF | Librería `unpdf` | ✅ |
| 10 | Chunking por párrafos + MD headers | `packages/core/src/knowledge/chunking.service.ts` | ✅ Con property tests |
| 11 | Embeddings Amazon Titan v2 (1024 dims) | `BedrockEmbeddingService` | ✅ Vectores almacenados en MongoDB |
| 12 | Almacenamiento en MongoDB | Colecciones `knowledge_sources` + `knowledge_fragments` | ✅ |
| 13 | Reintentos SQS (3 intentos + DLQ) | Configurado en infra | ✅ |
| 14 | Timeout detection (>5 min → failed) | En `getSourceStatus` | ✅ |
| 15 | Progreso por etapas (extracting/chunking/embedding/storing) | Campo `progress` en KnowledgeSource | ✅ |
| 16 | UI de gestión en panel web | Feature `apps/web/src/features/knowledge/` | ✅ |
| 17 | Drag & drop de archivos | `KnowledgeUploadZone` | ✅ |
| 18 | Editor de contenido Markdown | `KnowledgeTextEditor` | ✅ |
| 19 | Indicadores de estado animados | `KnowledgeStatusBadge` (pulsante para processing) | ✅ |
| 20 | Diálogo de confirmación de eliminación | `KnowledgeDeleteDialog` con focus trap | ✅ |
| 21 | Polling de estado en tiempo real | Cada 5s para fuentes en "processing" | ✅ |

---

### Pendientes para producción (NO bloquean MVP)

| # | Pendiente | Prioridad | Notas para QA |
|---|---|---|---|
| 1 | **Crear índice vectorSearch en Atlas** | 🔴 Alta | Sin este índice, la búsqueda semántica del RAG no funciona. Se crea manualmente en Atlas UI → Search Indexes → tipo `vectorSearch`. Config: 1024 dims, cosine, filtro por `agentId`. |
| 2 | **Integrar `companyId` desde JWT/auth** | 🟡 Media | Actualmente usa `'default-company'` hardcodeado. Funciona para testing pero en producción debe extraerse del token JWT del usuario autenticado. |
| 3 | **Validar `agentId` contra BD de agentes** | 🟡 Media | El endpoint acepta cualquier `agentId` sin verificar que exista. En producción debe validar contra la colección de agentes. |
| 4 | **Consumer de DLQ** | 🟢 Baja | Los mensajes que fallan 3 veces van a la DLQ pero no hay un consumer que marque el KnowledgeSource como `failed`. El timeout detection (5 min) cubre este caso parcialmente. |
| 5 | **Endpoint PUT para editar contenido textual** | 🟢 Baja | Requisito 2.5 no implementado. Workaround: eliminar y crear de nuevo, o usar reprocess. |
| 6 | **CORS en producción** | 🟡 Media | CORS está configurado con `FRONTEND_DOMAIN`. Verificar que el secret esté seteado correctamente en cada stage. |
| 7 | **Proteger endpoints con auth guard** | 🟡 Media | Los endpoints de knowledge no tienen `@ApiBearerAuth()`. En producción deben requerir autenticación. |

---

### Datos de prueba disponibles

| Recurso | Valor |
|---|---|
| agentId de prueba | `507f1f77bcf86cd799439011` |
| Stage de desarrollo | `crisdavid` |
| Backend (Swagger) | `http://localhost:3001/docs` |
| Frontend | `http://localhost:3000/agentes/507f1f77bcf86cd799439011` → pestaña "Base de Conocimiento" |
| Colección MongoDB sources | `knowledge_sources` |
| Colección MongoDB fragments | `knowledge_fragments` |
| Bucket S3 | `multibotagents-crisdavid-knowledgebucketbucket-*` |
| Cola SQS | `multibotagents-crisdavid-IndexationQueue-*` |

---

### Cómo ejecutar las pruebas

```bash
# Tests unitarios del pipeline (core + db + functions)
pnpm run test

# Tests específicos del frontend (knowledge UI)
pnpm --filter @multibotagents/web exec vitest --run src/features/knowledge

# Type-check completo
pnpm run type-check

# Build completo
pnpm run build

# Levantar ambiente local
sst dev --stage crisdavid
```

---

### Flujo de prueba manual recomendado para QA

1. Levantar `sst dev --stage crisdavid`
2. Abrir `http://localhost:3001/docs` (Swagger)
3. **Upload:** `POST /knowledge/upload` con un PDF real + `agentId: 507f1f77bcf86cd799439011`
4. **Verificar estado:** `GET /knowledge/{sourceId}` — esperar que pase de `processing` a `indexed`
5. **Verificar en MongoDB:** Colección `knowledge_fragments` debe tener registros con `embedding` de 1024 dimensiones
6. **Crear texto:** `POST /knowledge/text` con contenido Markdown
7. **Listar:** `GET /knowledge/agent/507f1f77bcf86cd799439011` — debe mostrar ambas fuentes
8. **Re-procesar:** `POST /knowledge/{sourceId}/reprocess` — debe volver a `processing` y luego `indexed`
9. **Eliminar:** `DELETE /knowledge/{sourceId}` — debe eliminar source + fragments + archivo S3
10. **Frontend:** Navegar a `/agentes/507f1f77bcf86cd799439011` → pestaña "Base de Conocimiento" — verificar que la UI refleja los datos
