# Reporte QA — Slice 5: Creación directa de contenido (texto libre)

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

**Veredicto:** El flujo principal (happy path) funciona correctamente. El pipeline completo de creación de contenido textual → almacenamiento S3 → indexación → embeddings opera como se espera. Se encontraron **2 defectos de validación** que deben corregirse antes de producción.

---

## Resultados Detallados

### ✅ Escenarios que PASARON

| # | Escenario | Resultado | Detalle |
|---|-----------|-----------|---------|
| 1 | Happy path: crear contenido Markdown válido | ✅ 201 | Source creado con `status: "processing"`, `type: "text"`, `format: "md"`. Pipeline completo ejecutado en ~2s. |
| 2 | Contenido vacío (`""`) | ✅ 400 | Rechazado correctamente |
| 3 | Contenido solo whitespace | ✅ 400 | Rechazado correctamente |
| 6 | Sin campo `content` | ✅ 400 | Rechazado correctamente |
| 7 | Body malformado (no JSON) | ✅ 400 | Rechazado correctamente |
| 8 | Sin Content-Type header | ✅ 400 | Rechazado correctamente |
| 9 | Source aparece en listado por agente | ✅ 200 | Source encontrado con `status: "indexed"` |
| 10 | Transición processing → indexed | ✅ 200 | `fragmentCount: 1`, `processedAt` poblado, pipeline completo |

### 🐛 Bugs Encontrados

#### BUG-1: Acepta crear source sin `agentId` (Severidad: Media)

| Campo | Valor |
|-------|-------|
| Escenario | Test 5: POST sin campo `agentId` |
| Request | `{"title":"Test","content":"Contenido valido"}` |
| Esperado | 400 Bad Request |
| Obtenido | **201 Created** con `agentId: null` |
| Impacto | Se crea un KnowledgeSource huérfano sin agente asociado. El S3 key contiene `undefined` en la ruta. El source no es accesible desde ningún agente. Contamina la base de datos. |
| S3 Key generada | `default-company/undefined/6a179fd756a15ad9c71e2896/test.md` |
| Recomendación | Agregar validación `@IsNotEmpty()` en el DTO `CreateTextContentDto` para `agentId` y verificar que el pipe de validación global está activo. |

#### BUG-2: Sin `title` retorna 500 en lugar de 400 (Severidad: Baja)

| Campo | Valor |
|-------|-------|
| Escenario | Test 4: POST sin campo `title` |
| Request | `{"agentId":"507f1f77bcf86cd799439011","content":"Contenido valido"}` |
| Esperado | 400 Bad Request con mensaje descriptivo |
| Obtenido | **500 Internal Server Error** |
| Impacto | Error no manejado en el servidor. El usuario no recibe un mensaje claro de qué campo falta. Posible stack trace expuesto en logs. |
| Recomendación | El DTO tiene `@IsNotEmpty()` en `title`, pero el ValidationPipe global podría no estar configurado con `whitelist: true` y `transform: true`. Verificar configuración del pipe en `main.ts`. |

---

## Verificación del Pipeline Completo

El test del happy path confirmó que el pipeline end-to-end funciona:

```
POST /knowledge/text → KnowledgeSource creado (status: processing)
                     → Archivo .md almacenado en S3
                     → Mensaje enviado a SQS
                     → Lambda ejecuta: extract → chunk → embed → store
                     → KnowledgeSource actualizado (status: indexed, fragmentCount: 1)
```

**Tiempo total de procesamiento:** ~2 segundos (de `createdAt` a `processedAt`).

---

## Criterios de Aceptación vs Resultado

| Criterio | Estado |
|----------|--------|
| El usuario puede crear contenido textual directamente (sin subir archivo) | ✅ Cumplido |
| El contenido textual se almacena como archivo en S3 y se procesa igual que un archivo subido | ✅ Cumplido |
| El contenido es editable; al editar se re-procesa automáticamente | ⚠️ No verificable — endpoint PUT no implementado (pendiente documentado) |

---

## Notas Adicionales

1. **companyId hardcodeado:** El source se crea con `companyId: "default-company"` como está documentado en los pendientes de producción (#2 en la sección 8).
2. **Sin auth guard:** Los endpoints no requieren autenticación (pendiente documentado #7).
3. **Workaround para edición:** Como el endpoint PUT no existe, la edición se puede hacer eliminando y creando de nuevo, o usando `POST /:sourceId/reprocess`.

---

## Acciones Requeridas

| Prioridad | Acción | Responsable |
|-----------|--------|-------------|
| 🔴 Media | Corregir BUG-1: Validar `agentId` como campo obligatorio y no-vacío | Dev |
| 🟡 Baja | Corregir BUG-2: Configurar ValidationPipe global para que `title` faltante retorne 400 | Dev |
| 🟢 Info | Documentar que el endpoint PUT para edición no está implementado | QA/PM |
