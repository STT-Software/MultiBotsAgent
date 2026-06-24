# Reporte QA — Slice 6: Consulta de estado y listado de fuentes

**Fecha:** 2026-05-28  
**PR:** #21 — feat(SOL-06): Sistema de Base de Conocimiento — MVP completo  
**Tester:** QA Automatizado  
**Ambiente:** Deploy AWS (stage dev)  
**ServicesApi:** `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total escenarios | 10 |
| ✅ Pasaron | 7 |
| ⚠️ Hallazgos | 2 |
| 🐛 Bugs | 1 |
| Severidad máxima | Media |

**Veredicto:** Los endpoints de consulta de estado y listado de fuentes funcionan correctamente en el happy path. El listado por agente retorna las fuentes con toda la metadata esperada, la consulta individual funciona correctamente, y la **detección de timeout** opera como se diseñó (marca como `failed` fuentes que llevan >5 min en `processing`). Se encontraron **2 defectos de robustez** en el manejo de inputs inválidos que deben corregirse antes de producción.

---

## Endpoints Probados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/knowledge/agent/:agentId` | GET | Listar todas las fuentes de un agente |
| `/knowledge/:sourceId` | GET | Consultar estado de una fuente específica |

---

## Resultados Detallados

### ✅ Escenarios que PASARON

| # | Escenario | Resultado | Detalle |
|---|-----------|-----------|---------|
| 1 | Listado de fuentes por agente (happy path) | ✅ 200 | Retorna array con 5 fuentes. Cada fuente incluye: `id`, `agentId`, `companyId`, `title`, `type`, `format`, `status`, `progress`, `fragmentCount`, `metadata`, `createdAt`, `updatedAt`. |
| 2 | Listado con agentId sin fuentes | ✅ 200 | Retorna array vacío `[]` con `Count: 0`. No lanza error. |
| 3 | Consulta de estado — fuente `indexed` | ✅ 200 | Retorna fuente con `status: "indexed"`, `fragmentCount: 29`, `processedAt` poblado, `errorReason: null`. |
| 4 | Consulta de estado — fuente `failed` (ya marcada) | ✅ 200 | Retorna fuente con `status: "failed"`, `errorReason: "timeout: el procesamiento excedió el tiempo máximo"`, `fragmentCount: 0`. |
| 5 | Detección de timeout — fuente en `processing` >5 min | ✅ 200 | La fuente `6a179fd756a15ad9c71e2895` estaba en `processing` desde hace >5 min. Al consultar, el endpoint la marcó automáticamente como `failed` con `errorReason: "timeout: el procesamiento excedió el tiempo máximo"`. `updatedAt` se actualizó al momento de la consulta. |
| 6 | Consulta con sourceId inexistente (ObjectId válido) | ✅ 404 | Retorna 404 correctamente para `000000000000000000000000`. |
| 7 | Método HTTP incorrecto (POST en ruta de listado) | ✅ 404 | `POST /knowledge/agent/:agentId` retorna 404 (ruta no existe para POST). |

### 🐛 Bugs Encontrados

#### BUG-1: sourceId con formato inválido retorna 500 en lugar de 400/404 (Severidad: Media)

| Campo | Valor |
|-------|-------|
| Escenario | Test 8: GET `/knowledge/invalid-id-format` |
| Request | `GET /knowledge/invalid-id-format` |
| Esperado | 400 Bad Request (formato de ID inválido) o 404 Not Found |
| Obtenido | **500 Internal Server Error** |
| Impacto | Expone un error interno del servidor al cliente. Probablemente MongoDB lanza una excepción al intentar buscar con un string que no es un ObjectId válido. Esto podría filtrar información del stack trace en logs y confunde al consumidor de la API. |
| Recomendación | Agregar validación de formato ObjectId en el parámetro `sourceId` antes de consultar la BD. Usar un `ParseObjectIdPipe` o validación manual con regex `/^[0-9a-fA-F]{24}$/`. |

### ⚠️ Hallazgos (no bloquean pero deben corregirse)

#### HALLAZGO-1: GET `/knowledge/agent/` sin agentId retorna 500

| Campo | Valor |
|-------|-------|
| Escenario | Test 9: GET `/knowledge/agent/` (ruta incompleta) |
| Esperado | 400 Bad Request o 404 Not Found |
| Obtenido | **500 Internal Server Error** |
| Impacto | Bajo. Es un edge case de ruta incompleta, pero un 500 nunca debería exponerse al cliente. |
| Recomendación | NestJS debería manejar esto como 404 por defecto si la ruta no matchea. Verificar si hay un catch-all que está capturando la ruta vacía y pasándola al servicio con `agentId = ""`. |

#### HALLAZGO-2: Fuente con `title: null` y `originalFileKey: ""` en la BD

| Campo | Valor |
|-------|-------|
| Escenario | Observado en el listado (fuente `6a179fd756a15ad9c71e2895`) |
| Detalle | La fuente tiene `title: null` y `originalFileKey: ""`. Esto indica que fue creada sin validación completa (probablemente un test del slice 5 que no envió `title`). |
| Impacto | Bajo. No afecta la funcionalidad del listado ni la consulta de estado, pero contamina los datos. El frontend debería manejar `title: null` gracefully. |
| Recomendación | Relacionado con BUG-1 del slice 5 (acepta crear source sin campos obligatorios). Corregir la validación en el endpoint de creación. |

---

## Validación de Criterios de Aceptación (Slice 2.6)

| # | Criterio | Estado | Evidencia |
|---|----------|--------|-----------|
| 1 | La API expone endpoint para listar todas las fuentes de un agente | ✅ | `GET /knowledge/agent/:agentId` retorna array con estado, fragmentCount, fecha |
| 2 | La API expone endpoint para consultar estado de una fuente específica | ✅ | `GET /knowledge/:sourceId` retorna fuente completa con todos los campos |
| 3 | Detección de timeout: fuentes >5 min en `processing` se marcan como `failed` | ✅ | Verificado con fuente `6a179fd756a15ad9c71e2895` — marcada automáticamente |
| 4 | El listado incluye estado, cantidad de fragmentos y fecha | ✅ | Cada fuente incluye `status`, `fragmentCount`, `createdAt`, `updatedAt`, `processedAt` |
| 5 | Fuente inexistente retorna 404 | ✅ | Verificado con ObjectId válido inexistente |

---

## Estructura de Respuesta Verificada

### GET /knowledge/agent/:agentId

```json
[
  {
    "id": "string (ObjectId)",
    "agentId": "string",
    "companyId": "string",
    "title": "string | null",
    "type": "file | text",
    "format": "pdf | txt | md",
    "originalFileKey": "string",
    "fileSizeBytes": "number",
    "status": "processing | indexed | failed | partial",
    "progress": "extracting | chunking | embedding | storing",
    "fragmentCount": "number",
    "errorReason": "string | null",
    "metadata": { "category": "string | null" },
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601",
    "processedAt": "ISO 8601 | null"
  }
]
```

### GET /knowledge/:sourceId

Retorna un solo objeto con la misma estructura que cada elemento del array anterior.

---

## Datos de Prueba Utilizados

| Recurso | Valor |
|---------|-------|
| agentId con fuentes | `507f1f77bcf86cd799439011` |
| agentId sin fuentes | `000000000000000000000000` |
| sourceId indexed | `6a0f7670af5ee5a28e80e110` |
| sourceId failed | `6a10c5a4a4b91e8cd56439de` |
| sourceId processing (timeout) | `6a179fd756a15ad9c71e2895` |
| sourceId inexistente | `000000000000000000000000` |
| sourceId formato inválido | `invalid-id-format` |

---

## Resumen de Acciones Requeridas

| Prioridad | Acción | Responsable |
|-----------|--------|-------------|
| 🟡 Media | Validar formato ObjectId en parámetro `sourceId` (evitar 500) | Backend |
| 🟢 Baja | Verificar manejo de ruta `/knowledge/agent/` sin parámetro | Backend |
| 🟢 Baja | Limpiar datos huérfanos con `title: null` en la BD de dev | DevOps/Backend |
