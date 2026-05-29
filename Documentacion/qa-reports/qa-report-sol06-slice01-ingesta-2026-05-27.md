# Reporte QA — SOL-06 Slice 2.1: Ingesta de Documento

**Fecha:** 27 de mayo de 2026  
**QA:** jhon99mendoza + Agente QA  
**PR:** #21 — `feat(SOL-06): Sistema de Base de Conocimiento — MVP completo`  
**Autor PR:** cescobar-stt  
**Stage:** dev  
**ServicesApi:** https://5em5s6gn59.execute-api.us-east-1.amazonaws.com  
**Frontend:** https://d1z7dsgvuqduin.cloudfront.net

---

## Resultado General: ✅ APROBADO con 2 bugs + 2 observaciones UX

La Slice 2.1 (Ingesta de Documento) funciona correctamente en el happy path. El pipeline completo (upload → S3 → SQS → Lambda → extract → chunk → embed → MongoDB) opera sin errores para los 3 formatos soportados. Se encontraron 2 bugs y 2 observaciones de UX.

---

## Pruebas de API — Exhaustivas

### Happy Path (3 formatos)

| # | Test | Status HTTP | Resultado | Verificaciones |
|---|------|:-----------:|-----------|----------------|
| 1 | Upload PDF válido con metadata (title, category) | 201 | ✅ PASS | status=processing, format=pdf, metadata.category preservada, originalFileKey con estructura correcta |
| 2 | Upload TXT válido sin metadata | 201 | ✅ PASS | status=processing, title=nombre del archivo (fallback), format=txt |
| 3 | Upload MD válido con title | 201 | ✅ PASS | status=processing, format=md |

### Validaciones de formato (Error Path)

| # | Test | Status HTTP | Resultado |
|---|------|:-----------:|-----------|
| 4 | Upload .docx | 400 | ✅ PASS — rechazado |
| 5 | Upload .xlsx | 400 | ✅ PASS — rechazado |
| 6 | Upload .jpg | 400 | ✅ PASS — rechazado |
| 7 | Upload .exe | 400 | ✅ PASS — rechazado |
| 8 | Upload .zip | 400 | ✅ PASS — rechazado |

### Validación de tamaño

| # | Test | Status HTTP | Resultado |
|---|------|:-----------:|-----------|
| 9 | Archivo > 10MB (10.5 MB) | 413 | ✅ PASS — Payload Too Large |

### Validación de agentId

| # | Test | Status HTTP | Resultado |
|---|------|:-----------:|-----------|
| 10 | Upload sin campo agentId | 201 | 🔴 BUG — acepta sin agentId, crea source con agentId='' |
| 11 | Upload con agentId vacío | 201 | 🔴 BUG — acepta agentId vacío |

### Pipeline asíncrono

| # | Test | Resultado | Detalle |
|---|------|-----------|---------|
| 12 | Respuesta inmediata (no espera pipeline) | ✅ PASS | Responde en ~405ms con status=processing |
| 13 | Transición processing → indexed (TXT) | ✅ PASS | fragmentCount=1 después de ~15s |
| 14 | Transición processing → indexed (MD) | ✅ PASS | fragmentCount=1 después de ~15s |
| 15 | Transición processing → failed (PDF corrupto) | ✅ PASS | errorReason="Error al extraer texto del PDF: Invalid PDF structure." |

### Estructura de datos en respuesta

| Campo | Verificación | Resultado |
|-------|-------------|-----------|
| `id` | ObjectId válido | ✅ |
| `agentId` | Coincide con el enviado | ✅ |
| `companyId` | Siempre "default-company" (hardcodeado) | ✅ (documentado como pendiente) |
| `title` | Usa metadata.title si se envía, sino filename | ✅ |
| `type` | Siempre "file" para uploads | ✅ |
| `format` | pdf/txt/md según extensión | ✅ |
| `originalFileKey` | Patrón: `{companyId}/{agentId}/{sourceId}/{filename}` | ✅ |
| `fileSizeBytes` | Tamaño real del archivo | ✅ |
| `status` | "processing" en respuesta inmediata | ✅ |
| `progress` | "extracting" (primer paso del pipeline) | ✅ |
| `fragmentCount` | 0 en respuesta inmediata | ✅ |
| `metadata.category` | Se preserva si se envía | ✅ |
| `createdAt` | Timestamp ISO válido | ✅ |
| `processedAt` | null en respuesta inmediata | ✅ |

---

## Pruebas de Frontend

| # | Test | Resultado | Detalle |
|---|------|-----------|---------|
| 1 | Pestaña "Base de Conocimiento" carga | ✅ PASS | Tabla con fuentes, conteo, botones |
| 2 | Botón "Subir archivo" abre zona drag & drop | ✅ PASS | Indica formatos y límite 10MB |
| 3 | Explorador filtra solo PDF/TXT/MD | ✅ PASS | No permite seleccionar otros formatos |
| 4 | Upload de PDF muestra fuente en tabla | ✅ PASS | Aparece inmediatamente con status processing |
| 5 | Validación de tamaño >10MB | ✅ PASS | Mensaje: "El archivo excede el tamaño máximo permitido de 10 MB." |
| 6 | Polling muestra progreso real | ✅ PASS | Muestra "Extrayendo texto..." → "Almacenando fragmentos..." |
| 7 | Conteo de fuentes se actualiza | ✅ PASS | Incrementa al subir |
| 8 | Diálogo de eliminación funciona (botón Cancelar) | ✅ PASS | |
| 9 | Diálogo de eliminación (Escape) | 🔴 BUG | Escape rompe el estado, botón queda inoperativo |
| 10 | Eliminación exitosa | ✅ PASS | Fuente desaparece de tabla |
| 11 | Feedback post-eliminación | 🟡 OBS | No hay toast de confirmación |
| 12 | Badge de estado para fuentes indexadas | 🟡 OBS | Muestra "Almacenando fragmentos..." en lugar de "Indexado" |

---

## Bugs Encontrados

### 🔴 BUG-1: Escape rompe el estado del diálogo de eliminación

| Campo | Detalle |
|-------|---------|
| **Severidad** | Media |
| **Componente** | `KnowledgeDeleteDialog` |
| **Pasos** | 1. Clic en 🗑️ → se abre diálogo. 2. Presionar Escape → se cierra. 3. Clic en 🗑️ de nuevo → NO se abre. |
| **Esperado** | El diálogo debe reabrirse normalmente. |
| **Actual** | Botón queda inoperativo. Solo se recupera navegando fuera y volviendo. |
| **Causa probable** | Handler de Escape no resetea `isOpen` o `selectedSource` en el hook. |

### 🔴 BUG-2: Upload acepta requests sin agentId

| Campo | Detalle |
|-------|---------|
| **Severidad** | Media |
| **Componente** | `POST /knowledge/upload` — validación server-side |
| **Pasos** | 1. Enviar POST /knowledge/upload con archivo válido pero sin campo `agentId`. 2. O enviar con `agentId` vacío. |
| **Esperado** | Retornar 400 con mensaje "agentId es obligatorio". |
| **Actual** | Retorna 201 y crea un KnowledgeSource con `agentId: ''`. El documento queda huérfano. |
| **Impacto** | Documentos sin agente no son accesibles desde la UI ni consultables por el RAG. Contaminan la BD. |

---

## Observaciones UX

### 🟡 OBS-1: Badge de estado muestra "Almacenando fragmentos..." permanentemente

- Fuentes con `status: indexed` muestran el badge animado del último `progress` ("storing") en lugar de un badge estático "Indexado".
- **Fix**: En `KnowledgeStatusBadge`, priorizar `status` sobre `progress`. Si `status === "indexed"` → badge verde estático.

### 🟡 OBS-2: No hay toast de confirmación tras eliminar

- Al eliminar exitosamente, la fuente desaparece pero no hay feedback visual.
- **Fix**: Agregar toast "Fuente eliminada exitosamente" después del DELETE exitoso.

---

## Criterios de Aceptación de Slice 2.1 — Verificación

| # | Criterio (del documento de solución) | Estado |
|---|--------------------------------------|:------:|
| 1 | API recibe archivo + agentId + metadata opcional | ✅ |
| 2 | Valida formato soportado (PDF, TXT, MD) | ✅ |
| 3 | Valida tamaño máximo 10MB | ✅ |
| 4 | Valida agente existente | ⚠️ No valida (documentado como pendiente) |
| 5 | Crea KnowledgeSource con estado `processing` | ✅ |
| 6 | Sube archivo original a S3 | ✅ (verificado por originalFileKey) |
| 7 | Procesamiento es asíncrono (API retorna inmediatamente) | ✅ (~405ms) |
| 8 | Lambda extrae texto, chunking, embeddings, almacena | ✅ (TXT y MD indexados) |
| 9 | Al completar → estado `indexed` con fragmentCount | ✅ |
| 10 | Si falla → estado `failed` con errorReason | ✅ (PDF corrupto) |
| 11 | El usuario puede consultar estado del procesamiento | ✅ |
| 12 | agentId es obligatorio en el request | 🔴 BUG-2 — no se valida |

---

## Veredicto

**✅ APROBADO con condiciones:**

1. **BUG-1** (Escape rompe diálogo) — Corregir antes de release
2. **BUG-2** (agentId no validado) — Corregir antes de release. Agregar validación: `if (!agentId || agentId.trim() === '') return 400`
3. **OBS-1** y **OBS-2** — Nice-to-have, no bloquean

---

## Pendientes documentados (NO son bugs de esta slice)

- `companyId` hardcodeado como "default-company" (pendiente integración con JWT)
- `agentId` no se valida contra BD de agentes (pendiente integración con SOL-14)
- Endpoints sin auth guard (pendiente para producción)
- Estos están explícitamente documentados en la PR como pendientes para producción.
