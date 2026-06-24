# QA Report — SOL 08 → Slice 02: Inbox - Gestión, Respuesta y Resolución

| Campo | Valor |
|-------|-------|
| **Producto** | MultiBotsAgent |
| **Solución** | SOL 08 — Escalamiento Humano |
| **Slice** | 02 — Gestión, respuesta y resolución |
| **PR** | #23 |
| **Dev** | ogomez-stt |
| **QA** | jmendoza |
| **Fecha** | 2026-05-26 |
| **Entorno** | https://d1z7dsgvuqduin.cloudfront.net |
| **Resultado** | ⚠️ Observaciones (1 bug funcional + 2 cosméticos) |
| **Severidad** | Media |

---

## Resumen Ejecutivo

Se validaron 7 escenarios complejos del módulo Inbox (gestión de conversaciones escaladas). La funcionalidad principal opera correctamente: envío de mensajes sin duplicados, resolución con diálogo accesible, filtro por tabs, y timer de urgencia. Se encontró **1 bug funcional** relacionado con la simulación de respuestas al cambiar de conversación, y **2 hallazgos cosméticos** de UX.

---

## Resultados por Test Case

| TC | Escenario | Resultado | Severidad |
|----|-----------|-----------|-----------|
| TC-01 | Envío de mensajes rápidos consecutivos | ✅ PASS | — |
| TC-02 | Resolver conversación mientras se envía mensaje | ✅ PASS | Cosmético |
| TC-03 | Cambiar conversación con typing indicator activo | ❌ FAIL | Media |
| TC-04 | Diálogo de resolución: Escape y Cancelar | ✅ PASS | — |
| TC-05 | Input deshabilitado en conversaciones resueltas | ✅ PASS | Cosmético |
| TC-06 | Timer de espera con indicador de urgencia | ✅ PASS parcial | — |
| TC-07 | Textarea auto-resize | ✅ PASS | Cosmético |

---

## Bugs Encontrados

### 🐛 BUG-01: Respuesta simulada llega a conversación equivocada (Media)

**Escenario:** TC-03 — Cambiar de conversación con typing indicator activo

**Pasos para reproducir:**
1. Seleccionar conversación A
2. Enviar un mensaje → esperar typing indicator
3. Mientras el typing está visible, cambiar a conversación B
4. Esperar 2-3 segundos

**Resultado actual:**
- La respuesta simulada del "usuario" aparece en la conversación B (la activa en ese momento)
- La conversación A nunca recibe su respuesta

**Resultado esperado:**
- La respuesta debe llegar a la conversación A (donde se originó el mensaje)
- La conversación B no debe recibir mensajes ajenos

**Causa probable:** El `setTimeout` en `use-send-message.ts` no captura el `conversationId` al momento del envío — usa la referencia de la conversación seleccionada al momento de dispararse el callback.

**Impacto:** Corrupción del historial de mensajes en ambas conversaciones.

---

## Observaciones Cosméticas

### OBS-01: Falta cursor `not-allowed` en input deshabilitado

**Dónde:** Input de texto en conversaciones resueltas  
**Qué pasa:** Al hacer hover sobre el input deshabilitado, el cursor sigue siendo el de texto (`I-beam`) en vez de `not-allowed`  
**Fix sugerido:** Agregar `cursor: not-allowed` al textarea cuando `disabled={true}`

### OBS-02: Scrollbar vertical aparece prematuramente

**Dónde:** Textarea del input de mensajes  
**Qué pasa:** El scrollbar vertical aparece desde la primera letra escrita, aunque el contenido no excede la altura visible  
**Fix sugerido:** Cambiar `overflow-y: scroll` por `overflow-y: auto`

---

## Criterios de Aceptación — Validación

| Criterio | Estado |
|----------|--------|
| El operador puede escribir y enviar mensajes que aparecen en el historial | ✅ |
| El envío con Enter funciona (Shift+Enter para nueva línea) | ✅ |
| El typing indicator aparece antes de la respuesta simulada | ✅ |
| El botón "Resolver" abre un diálogo de confirmación accesible | ✅ |
| Al resolver, la conversación se mueve de "Activas" a "Resueltas" | ✅ |
| El input se deshabilita en conversaciones resueltas | ✅ |
| El timer de espera se actualiza en tiempo real y muestra urgencia (>30min) | ⚠️ Parcial (no verificable refresh con mocks) |
| Los tabs filtran correctamente entre activas y resueltas | ✅ |
| No hay mensajes duplicados en el historial | ✅ |
| Los mensajes se muestran en orden cronológico correcto | ✅ |

---

## Veredicto

**Estado: Dev ajustando** — El bug TC-03 requiere corrección antes de aprobar. Las observaciones cosméticas son opcionales pero recomendadas.

### Acción requerida del dev:
1. **[Obligatorio]** Corregir `use-send-message.ts` para capturar el `conversationId` al momento del envío (closure sobre el ID, no sobre la referencia mutable)
2. **[Recomendado]** Agregar `cursor: not-allowed` al textarea disabled
3. **[Recomendado]** Cambiar `overflow-y: scroll` → `overflow-y: auto` en el textarea

---

## Entorno de Pruebas

- **Frontend:** https://d1z7dsgvuqduin.cloudfront.net
- **Navegador:** Chrome (desktop)
- **Fecha deploy:** 2026-05-26
- **Nota:** Todo es mock (in-memory). No hay backend real ni persistencia entre recargas.
