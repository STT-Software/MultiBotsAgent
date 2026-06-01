# Reporte QA — [SL08/Slice-04] Escalamiento: auto-devolución y auditoría

| Campo | Valor |
|-------|-------|
| **PR** | #28 — [SL08/Slice-04] Escalamiento: auto-devolución y auditoría |
| **Autor** | ogomez-stt |
| **QA** | jhon99mendoza |
| **Fecha** | 2026-05-29 |
| **Entorno** | Stage dev (AWS) |
| **Frontend** | https://d1z7dsgvuqduin.cloudfront.net |
| **ServicesApi** | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com |
| **FunctionsApi** | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com |

---

## Resumen Ejecutivo

| Resultado | Cantidad |
|-----------|----------|
| ✅ Pasó | 4 |
| ❌ Falló | 3 |
| ⚠️ No verificable | 1 |

**Veredicto: 🔴 NO APROBADO** — Se encontraron 2 bugs críticos que afectan la funcionalidad core del slice.

---

## Resultados Detallados

### Pruebas de API (ejecutadas por agente)

| # | Test | Resultado | Detalle |
|---|------|-----------|---------|
| API-1 | GET /escalamiento/events retorna eventos con resumen | ✅ | `{data: [...], summary: {todayCount, avgDurationMinutes}}` |
| API-2 | POST /escalamiento/seed crea datos de prueba | ✅ | 4 conversaciones con escenarios variados |
| API-3 | PATCH /conversations/:id/resolve crea EscalationEvent | ✅ | Evento con `resolvedBy` del operador y `durationMinutes` |
| API-4 | Resolver conversación ya resuelta → 400 | ✅ | HTTP 400 correcto |
| API-5 | Acceso sin token → 401 | ✅ | HTTP 401 correcto |
| API-6 | Conversación inexistente → 404 | ✅ | HTTP 404 correcto |
| API-7 | Aislamiento entre empresas | ✅ | Conversación de otra empresa retorna 404 |

### Pruebas Frontend (ejecutadas por QA humano)

| # | Test | Resultado | Severidad |
|---|------|-----------|-----------|
| TC-01 | Resumen de eventos en header del Inbox | ✅ Pasó | — |
| TC-02 | Tab "Resueltas" muestra conversaciones resueltas | ✅ Pasó | — |
| TC-03 | Campo de timeout en Settings persiste valor | ❌ Falló | 🔴 Alta |
| TC-04 | Resolver conversación desde frontend | ❌ Falló | 🔴 Alta |
| TC-05 | Tab "Sin asignar" / badge "Sin agente" | ⚠️ No verificable | — |
| TC-06 | Enviar mensaje a conversación escalada | ✅ Pasó | — |
| TC-07 | Input deshabilitado en conversaciones resueltas | ❌ Falló | 🟡 Media |
| TC-08 | Aislamiento de datos entre empresas (frontend) | ✅ Pasó | — |

---

## Bugs Encontrados

### 🔴 BUG-1: Campo escalationTimeoutMinutes no se persiste

**Severidad:** Alta
**Componente:** Backend — PATCH /company-profile
**Reproducción:**
1. Ir a Settings → campo "Timeout de escalamiento (minutos)"
2. Cambiar valor (ej: 30) → Guardar
3. Aparece confirmación de éxito
4. El valor revierte inmediatamente a 60
5. Al recargar, sigue en 60

**Causa raíz:** El campo `escalationTimeoutMinutes` fue agregado al schema de MongoDB (`company.schema.ts`) pero NO al DTO de validación del endpoint `PATCH /company-profile`. NestJS con `whitelist: true` descarta campos no declarados en el DTO. Verificado por API: el PATCH acepta el request (200) pero el campo no aparece en el GET posterior.

**Impacto:** El timeout configurable es un criterio de aceptación del slice. Sin persistencia, el cron siempre usa el default de 60 min y la empresa no puede personalizar el comportamiento de auto-devolución.

**Fix sugerido:** Agregar `escalationTimeoutMinutes` al `UpdateCompanyProfileDto` en `apps/services/api-multi-bots/src/modules/company-profile/`.

---

### 🔴 BUG-2: Resolución manual marca conversación como "active" en vez de "resolved"

**Severidad:** Alta
**Componente:** Backend — PATCH /escalamiento/conversations/:id/resolve
**Reproducción:**
1. Ir a Inbox → tab "Activas"
2. Seleccionar conversación → clic "Resolver" → Confirmar
3. La conversación desaparece de "Activas"
4. NO aparece en "Resueltas"
5. La conversación queda invisible para el operador

**Causa raíz:** El endpoint `PATCH /resolve` retorna `{success: true, newStatus: "active"}`. El status queda en `active` (devuelta al agente) en vez de `resolved`. El tab "Resueltas" filtra por `status=resolved` y el tab "Activas" filtra por `status=escalated` — la conversación queda en un limbo.

**Evidencia API:**
```
PATCH /escalamiento/conversations/6a187d65337b561fbacb7d9e/resolve → 200 {newStatus: "active"}
GET  /escalamiento/conversations/6a187d65337b561fbacb7d9e → status: "active", resolvedAt: "2026-05-29T14:42:03.759Z"
```

**Impacto:** El operador pierde visibilidad de las conversaciones que resolvió. No puede ver historial de resoluciones propias.

**Fix sugerido:** La resolución manual del operador debe marcar `status: "resolved"` (no `"active"`). El status `"active"` debe reservarse para la auto-devolución del cron.

---

### 🟡 BUG-3: Panel de chat queda activo después de resolver conversación

**Severidad:** Media
**Componente:** Frontend — inbox-conversation-detail / inbox-view
**Reproducción:**
1. Resolver una conversación desde el botón "Resolver"
2. El panel de detalle sigue mostrando el chat con input habilitado
3. Se puede escribir texto pero los mensajes no se envían (sin feedback de error)

**Impacto:** UX confusa. El operador puede pensar que sigue en una conversación activa.

**Fix sugerido:** Después de resolver, limpiar la selección activa (`setSelectedConversation(null)`) para mostrar el empty state.

---

## Escenarios No Verificables

### TC-05: Tab "Sin asignar" / badge "Sin agente"

**Razón:** El status `unassigned` solo lo genera el cron cuando detecta que no hay agente disponible. La verificación de disponibilidad está hardcodeada como `true` (TODO en el código). Sin acceso de escritura a MongoDB Atlas no se puede forzar el estado.

**Recomendación:** Verificar cuando se implemente la verificación real de disponibilidad del agente, o crear un endpoint de testing que permita forzar el status.

---

## Criterios de Aceptación — Estado

| Criterio | Estado |
|----------|--------|
| El cron job se ejecuta cada 5 minutos y detecta conversaciones que superan el timeout | ⚠️ No verificable en tiempo de QA (requiere esperar 5 min + timeout) |
| Las conversaciones expiradas se devuelven al agente (status: active) con mensaje automático | ⚠️ No verificable sin esperar al cron |
| Se crea un EscalationEvent con resolvedBy "system_timeout" y duración calculada | ⚠️ No verificable sin esperar al cron |
| GET /escalamiento/events retorna eventos con resumen (todayCount, avgDurationMinutes) | ✅ Verificado |
| El header del inbox muestra escalamientos de hoy y tiempo promedio | ✅ Verificado |
| Las conversaciones "unassigned" se muestran con badge "Sin agente" | ⚠️ No verificable (ver sección anterior) |
| El campo de timeout en Settings permite configurar el valor por empresa | ❌ No persiste (BUG-1) |
| La resolución manual también crea un EscalationEvent con resolvedBy del operador | ✅ Verificado (evento se crea, pero status incorrecto — BUG-2) |
| El build completo del monorepo pasa sin errores | ✅ (verificado por CI) |

---

## Notas Adicionales

- Los errores `auth/refresh` con 401 en consola son preexistentes (no relacionados con este slice)
- El seed no es idempotente: ejecutar múltiples veces crea datos duplicados (bajo impacto, solo afecta testing)
- El tiempo promedio de 1269/1277 min en el resumen es correcto dado que las conversaciones del seed tienen `escalatedAt` de hace ~21 horas

---

## Próximos Pasos

1. **Bloquante:** Corregir BUG-1 y BUG-2 antes de aprobar el slice
2. **Deseable:** Corregir BUG-3 (UX post-resolución)
3. **Futuro:** Verificar TC-05 cuando se implemente disponibilidad real del agente
4. **Futuro:** Verificar cron job con timeout bajo (requiere configurar timeout en 1 min y esperar)
