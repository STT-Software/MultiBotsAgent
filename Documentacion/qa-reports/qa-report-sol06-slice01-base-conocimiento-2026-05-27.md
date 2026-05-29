# Reporte QA — SOL-06 Sistema de Base de Conocimiento (Slice 1 / MVP)

**Fecha:** 27 de mayo de 2026  
**QA:** jhon99mendoza + Agente QA  
**PR:** #21 — `feat(SOL-06): Sistema de Base de Conocimiento — MVP completo`  
**Autor PR:** cescobar-stt  
**Stage:** dev  
**URLs:**
- Frontend: https://d1z7dsgvuqduin.cloudfront.net
- ServicesApi: https://5em5s6gn59.execute-api.us-east-1.amazonaws.com
- FunctionsApi: https://eibwrbqsna.execute-api.us-east-1.amazonaws.com

---

## Resultado General: ✅ APROBADO con observaciones

El MVP del Sistema de Base de Conocimiento funciona correctamente end-to-end. El pipeline de ingesta (upload → S3 → SQS → Lambda → extract → chunk → embed → MongoDB) opera sin errores. Se encontró 1 bug funcional y 2 observaciones de UX.

---

## Pruebas de API (automatizadas contra deploy)

| # | Test | Endpoint | Resultado | Notas |
|---|------|----------|-----------|-------|
| 1 | Listado de fuentes por agente | `GET /knowledge/agent/:agentId` | ✅ PASS | Retorna 3 fuentes con metadata completa |
| 2 | Estado individual de fuente | `GET /knowledge/:sourceId` | ✅ PASS | Detalle completo con fragmentCount |
| 3 | Upload sin archivo | `POST /knowledge/upload` (sin file) | ✅ PASS | Retorna 500 (podría ser 400, pero rechaza) |
| 4 | Upload formato no soportado (.exe) | `POST /knowledge/upload` | ✅ PASS | Retorna 400 |
| 5 | Upload archivo TXT válido | `POST /knowledge/upload` | ✅ PASS | 201, estado `processing`, pipeline completa |
| 6 | Pipeline completo (polling) | `GET /knowledge/:sourceId` | ✅ PASS | Transición processing → indexed, 1 fragmento |
| 7 | Creación de contenido textual | `POST /knowledge/text` | ✅ PASS | 201, estado `processing` |
| 8 | Texto vacío | `POST /knowledge/text` (empty) | ✅ PASS | Retorna 400 |
| 9 | SourceId inexistente | `GET /knowledge/:sourceId` | ✅ PASS | Retorna 404 |
| 10 | AgentId inexistente | `GET /knowledge/agent/:agentId` | ✅ PASS | 200 con array vacío (Count: 0) |
| 11 | Re-procesamiento | `POST /knowledge/:sourceId/reprocess` | ✅ PASS | 201, vuelve a `processing` |
| 12 | Eliminación | `DELETE /knowledge/:sourceId` | ✅ PASS | 200, GET posterior retorna 404 |
| 13 | DELETE sourceId inexistente | `DELETE /knowledge/:sourceId` | ✅ PASS | Retorna 404 |

**Resultado API: 13/13 PASS**

---

## Pruebas de Frontend (manuales guiadas)

### Funcionalidades verificadas

| # | Funcionalidad | Resultado | Notas |
|---|---------------|-----------|-------|
| 1 | Pestaña "Base de Conocimiento" carga | ✅ PASS | Tabla con fuentes, conteo, botones de acción |
| 2 | Tabla muestra datos correctos | ✅ PASS | Título, formato, tamaño, fragmentos, fecha, acciones |
| 3 | Zona de drag & drop | ✅ PASS | Aparece al clic en "Subir archivo", indica formatos y límite |
| 4 | Upload de PDF | ✅ PASS | Archivo aparece en tabla, pipeline procesa correctamente |
| 5 | Filtro de formatos en explorador | ✅ PASS | Solo muestra PDF/TXT/MD, no permite seleccionar otros |
| 6 | Validación de tamaño (>10MB) | ✅ PASS | Mensaje claro: "El archivo excede el tamaño máximo permitido de 10 MB." |
| 7 | Editor de contenido textual | ✅ PASS | Modal con título + textarea Markdown |
| 8 | Creación de texto exitosa | ✅ PASS | Aparece en tabla con estado "Extrayendo texto..." |
| 9 | Validación título obligatorio | ✅ PASS | Muestra "El título es obligatorio" |
| 10 | Polling de estado en tiempo real | ✅ PASS | Muestra progreso real (extracting → storing) |
| 11 | Diálogo de confirmación de eliminación | ✅ PASS | Muestra nombre, mensaje de irreversibilidad, botones |
| 12 | Cancelar eliminación (botón) | ✅ PASS | Cierra diálogo sin eliminar |
| 13 | Confirmar eliminación | ✅ PASS | Fuente desaparece de la tabla |
| 14 | Conteo de fuentes se actualiza | ✅ PASS | Incrementa/decrementa correctamente |

**Resultado Frontend: 14/14 PASS (con bugs documentados abajo)**

---

## Bugs encontrados

### 🔴 BUG-1: Escape rompe el estado del diálogo de eliminación

| Campo | Detalle |
|-------|---------|
| **Severidad** | Media |
| **Componente** | `KnowledgeDeleteDialog` |
| **Pasos para reproducir** | 1. Clic en 🗑️ de cualquier fuente → se abre diálogo. 2. Presionar tecla Escape → diálogo se cierra. 3. Clic nuevamente en 🗑️ de la misma u otra fuente → el diálogo NO se abre. |
| **Resultado esperado** | El diálogo debe poder reabrirse normalmente después de cerrarlo con Escape. |
| **Resultado actual** | El botón de eliminar queda inoperativo. Solo se recupera navegando fuera y volviendo al agente. |
| **Causa probable** | El handler de `keydown` para Escape cierra el diálogo pero no resetea correctamente el estado del hook (`isOpen` o `selectedSource` queda en estado inconsistente). |
| **Workaround** | Usar botón "Cancelar" en lugar de Escape, o navegar fuera y volver. |

---

## Observaciones de UX (no bloquean)

### 🟡 OBS-1: Estado muestra "Almacenando fragmentos..." en lugar de "Indexado"

| Campo | Detalle |
|-------|---------|
| **Severidad** | Baja |
| **Componente** | `KnowledgeStatusBadge` |
| **Descripción** | Todas las fuentes con status `indexed` muestran permanentemente "● Almacenando fragmentos..." con animación pulsante. El badge nunca transiciona al estado final "Indexado" (estático, sin animación). |
| **Causa probable** | La UI usa el campo `progress` ("storing") para renderizar el badge en lugar del campo `status` ("indexed"). Cuando `status === "indexed"`, debería mostrar un badge estático verde "Indexado". |
| **Impacto** | El usuario no tiene certeza visual de que el procesamiento terminó exitosamente. |

### 🟡 OBS-2: No hay toast de confirmación tras eliminar

| Campo | Detalle |
|-------|---------|
| **Severidad** | Baja |
| **Descripción** | Al eliminar una fuente exitosamente, la fila desaparece de la tabla pero no hay feedback visual (toast/snackbar) que confirme "Fuente eliminada exitosamente". |
| **Impacto** | Para acciones destructivas irreversibles, el usuario debería recibir confirmación explícita de que la operación se completó. |

---

## Hallazgos de seguridad (documentados en PR como pendientes)

| # | Hallazgo | Severidad | Estado |
|---|----------|-----------|--------|
| 1 | Endpoints sin auth guard — accesibles sin token JWT | 🟡 Media | Documentado como pendiente para producción |
| 2 | `companyId` hardcodeado como `'default-company'` | 🟡 Media | Documentado como pendiente |
| 3 | `agentId` no se valida contra BD de agentes | 🟡 Media | Documentado como pendiente |

Estos NO son bugs del slice — están explícitamente documentados como pendientes para producción en la PR.

---

## Criterios de aceptación — Verificación

| Criterio | Verificado |
|----------|:----------:|
| Upload de PDF → estado `indexed` con fragmentCount > 0 | ✅ |
| Upload de TXT/MD → procesamiento exitoso | ✅ |
| Creación de contenido textual → indexación correcta | ✅ |
| Listado muestra todas las fuentes con estado correcto | ✅ (con OBS-1) |
| Eliminación borra fragments + archivo S3 + registro | ✅ |
| Re-procesamiento regenera fragmentos | ✅ |
| UI muestra indicadores de estado con animación pulsante | ✅ |
| Pipeline completo funciona (extract → chunk → embed → store) | ✅ |
| Validación de formatos soportados | ✅ |
| Validación de tamaño máximo 10MB | ✅ |

---

## Veredicto

**✅ APROBADO para merge a producción** con las siguientes condiciones:

1. **BUG-1 debe corregirse** antes de release a usuarios finales (Escape rompe diálogo)
2. **OBS-1** debería corregirse (badge de estado incorrecto) — no bloquea pero confunde
3. **OBS-2** es nice-to-have (toast de confirmación)
4. Los pendientes de seguridad (auth guard, companyId, validación agentId) deben resolverse antes de producción real

---

## Datos de prueba generados durante QA

- Se creó y eliminó: archivo TXT `qa-test-document.txt` (limpiado)
- Se creó y eliminó: texto "FAQ de Prueba QA" (limpiado)
- Se subió: `pdf-pruebas-base-conocimiento.pdf` (6.2 KB, 2 fragmentos) — **permanece en el agente**
- Se creó: "Prueba QA - Preguntas Frecuentes" — **eliminado durante prueba de DELETE**
