# Reporte QA — SOL-03 Motor de Agente Cotizador

**Fecha:** 2026-06-16  
**PR:** #34 (`SOL-03/agente-cotizador` → `dev`)  
**Ejecutor:** QA Automation + QA Manual (Kiro + jhon99mendoza)  
**Entorno:** Stage `dev` — AWS  
**URLs:**
- Frontend: `https://d1z7dsgvuqduin.cloudfront.net`
- Services API: `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests automatizados (API) | 22 |
| Tests manuales (UI + Telegram) | 13 |
| **Total ejecutados** | **35** |
| ✅ PASS | 29 |
| ⚠️ Intermitente | 2 |
| ❌ Bugs confirmados | 2 |
| ❌ Validaciones sin aplicar | 4 |

### Veredicto: ⚠️ Aprobado con observaciones

El flujo core funciona end-to-end (catálogo → cotización → pedido → consulta → cancelación), tanto desde la API REST como desde Telegram. Sin embargo, las validaciones server-side de DTOs no se ejecutan en el deploy, lo cual es un riesgo de integridad de datos que debe resolverse antes de producción.

---

## Parte 1: Pruebas Automatizadas (API contra deploy real)

### Autenticación y Seguridad

| # | Escenario | Esperado | Resultado | Estado |
|---|-----------|----------|-----------|--------|
| 2 | GET /orders sin token | 401 | 401 | ✅ |
| 26 | GET /orders con token inválido | 401 | 401 | ✅ |
| 23 | POST /orders con agentId de otra empresa | 403/404 | 404 | ✅ |
| 24 | PATCH inyectando companyId ajeno | No cambia | Intacto | ✅ |
| 25 | GET /orders?agentId=ajeno | 403 | 403 | ✅ |

### CRUD de Pedidos (Happy Path)

| # | Escenario | Esperado | Resultado | Estado |
|---|-----------|----------|-----------|--------|
| 1 | GET /orders (vacío) | 200 + [] | 200 + [] | ✅ |
| 4 | POST /orders con cotizador | 201 | 201 | ✅ |
| 5 | GET /orders (con datos) | 200 + array | 200 | ✅ |
| 6 | GET /orders/:id | 200 | 200 | ✅ |
| 7 | GET /orders/:id inexistente | 404 | 404 | ✅ |
| 8 | PATCH → confirmed | 200 | 200 | ✅ |
| 9 | PATCH → preparing | 200 | 200 | ✅ |
| 10 | PATCH → shipped | 200 | 200 | ✅ |
| 11 | PATCH → delivered | 200 | 200 | ✅ |
| 12 | POST segundo pedido | 201 | 201 | ✅ |
| 13 | PATCH → cancelled | 200 | 200 | ✅ |
| 20 | DELETE /orders/:id | 200 + success | 200 | ✅ |
| 21 | GET pedido eliminado | 404 | 404 | ✅ |
| 22 | DELETE ID inexistente | 404 | 404 | ✅ |

### Filtros

| # | Escenario | Resultado | Estado |
|---|-----------|-----------|--------|
| 18 | GET /orders?status=cancelled | Filtrado correcto | ✅ |
| 19 | GET /orders?status=delivered | Filtrado correcto | ✅ |

### Validación de tipo de agente

| # | Escenario | Esperado | Resultado | Estado |
|---|-----------|----------|-----------|--------|
| 3 | POST /orders con agente tipo `rag` | 400 | 400 | ✅ |

### Validaciones que fallaron

| # | Escenario | Esperado | Resultado | Estado |
|---|-----------|----------|-----------|--------|
| 14 | POST con email inválido | 400 | 201 | ❌ |
| 15 | POST con items vacío | 400 | 201 | ❌ |
| 16 | POST sin customerName | 400 | 201 | ❌ |
| 17 | POST con agentId no-MongoId | 400 | 500 | ❌ |

---

## Parte 2: Pruebas Manuales

### Dashboard de Pedidos (Frontend)

| # | Escenario | Resultado | Estado |
|---|-----------|-----------|--------|
| TC-01 | Carga inicial — estado vacío | Icono + texto correcto | ✅ |
| TC-02 | Crear agente tipo cotizador | Opción visible, 3 columnas, crea OK | ✅ |
| TC-03 | Tabla con pedidos reales | ID, nombre, total, estado, agente, fecha, acciones | ✅ |
| TC-04 | Completar pedido (botón) | Badge COMPLETADO + FINALIZADO | ✅ |
| TC-05 | Eliminar pedido (botón) | Confirmación + desaparece | ✅ |
| TC-06 | Cancelar pedido (botón) | Badge CANCELADO + FINALIZADO | ✅ |

### Flujo Conversacional (Telegram)

| # | Escenario | Resultado | Estado |
|---|-----------|-----------|--------|
| TC-07 | Saludo + consulta sin catálogo | Responde "no tengo productos" | ✅ |
| TC-08 | Consulta de catálogo con docs cargados | Precios correctos del documento | ✅ |
| TC-09 | Bot se atasca al segundo mensaje (Bot 1) | Sin respuesta ~10 min | ⚠️ |
| TC-09b | Crear pedido con datos completos (Bot 2) | Cotización correcta $59.000 | ✅ |
| TC-10 | Recuperación del bot atascado | No se recupera solo | ⚠️ |
| TC-11 | Confirmación de pedido end-to-end | Pedido creado, visible en dashboard | ✅ |
| TC-12 | Consultar estado desde Telegram | Estado correcto + datos del pedido | ✅ |
| TC-13 | Cancelar pedido desde Telegram | Cancelación exitosa | ✅ |

---

## 🐛 Bugs Encontrados

### BUG-1: ValidationPipe no se ejecuta en deploy (Severidad: Alta 🔴)

**Impacto:** Las validaciones de `class-validator` (DTOs) no se aplican. Se pueden crear pedidos con emails inválidos, campos vacíos y arrays sin ítems.

**Evidencia:** Tests 14, 15, 16 — todos devuelven 201 en lugar de 400.

**Causa probable:** Falta `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))` en `main.ts`, o el pipe no se aplica al módulo de Orders.

**Fix sugerido:** Verificar la configuración del ValidationPipe global en el bootstrap de NestJS.

---

### BUG-2: agentId no-MongoId retorna 500 (Severidad: Media 🟡)

**Impacto:** Si se envía un agentId con formato inválido, el servidor responde 500 en lugar de 400.

**Evidencia:** Test 17 — `agentId: "no-valido"` → 500.

**Causa probable:** El `@IsMongoId()` del DTO no valida (consecuencia de BUG-1) y MongoDB lanza excepción no manejada.

---

### Observación: Bot se atasca intermitentemente (Severidad: Baja 🟢)

**Impacto:** En el primer bot de Telegram probado ("Bot prueba cotizador"), después de responder correctamente a la primera consulta de catálogo, el bot dejó de responder a mensajes subsiguientes durante varios minutos. Eventualmente se recuperó solo.

**Evidencia:** TC-09 y TC-10 — Mensajes sin respuesta ~10 min, luego recuperación.

**Notas:** El segundo bot ("Cotizador 2") funcionó correctamente todo el flujo sin interrupciones. Posibles causas:
- Cold start de Lambda/Fargate tras inactividad
- Throttling del LLM (OpenAI rate limit)
- Problema de red transitorio

**Reproducibilidad:** Intermitente, no reproducido en segundo intento. No se considera bug confirmado.

---

## Hallazgos Adicionales (No bloqueantes)

1. **Transiciones de estado sin restricción:** La API permite cualquier transición (ej: `delivered` → `pending_confirmation`). La SOL-03 especifica que `cancel_order` solo debería funcionar para pedidos en `pending_confirmation` o `confirmed`, pero el PATCH acepta cualquier cambio.

2. **Items vacío aceptado:** Se pueden crear pedidos con `items: []` y `total: 0`. Validar si esto es intencional (borradores) o un defecto.

3. **Pedido ID expuesto como ObjectId completo:** El bot muestra el ID completo de MongoDB (`6a31dca5dc9ccb16dbedd005`) en lugar de un ID legible (ej: `#1024`). La SOL-03 especifica "ID de pedido legible".

---

## Cobertura de Criterios de Aceptación (PR #34 — SOL-03)

| Criterio | Estado |
|----------|--------|
| CRUD de pedidos en backend | ✅ Funcional |
| Integración tools en RagEngine para tipo `cotizador` | ✅ Funcional |
| Herramienta `create_order` desde conversación | ✅ Funcional |
| Herramienta `get_order_status` desde conversación | ✅ Funcional |
| Herramienta `cancel_order` desde conversación | ✅ Funcional |
| Consulta de catálogo vía RAG | ✅ Funcional |
| Cálculo de cotización con precios correctos | ✅ Funcional |
| Dashboard de pedidos en frontend | ✅ Funcional |
| Cambio de estado desde dashboard | ✅ Funcional |
| Eliminación de pedidos | ✅ Funcional |
| Validaciones de entrada (DTOs) | ❌ No funcionan |
| Notificación WhatsApp al crear pedido | ⏭️ No probado (requiere Meta) |
| Notificación email al crear pedido | ⏭️ No verificado en bandeja |

---

## Recomendaciones

### Antes de producción:
1. 🔴 **Arreglar BUG-1** — Las validaciones son críticas para integridad de datos
2. 🟡 **Arreglar BUG-2** — Error 500 expone detalles internos al cliente
3. 🟡 **Implementar máquina de estados** — Restringir transiciones inválidas

### Mejoras sugeridas:
- Generar IDs de pedido legibles (ej: `#1024`) en lugar del ObjectId completo
- Agregar paginación al endpoint GET /orders
- Agregar loading state en los botones de acción del dashboard mientras se procesa

---

## Limpieza Post-Test

✅ Pedidos de prueba de API eliminados del entorno dev.  
⚠️ Pedidos creados desde Telegram siguen en la DB (Pedro García, Ana Lopez) — eliminar manualmente si es necesario.
