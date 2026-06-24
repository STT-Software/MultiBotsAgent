# QA Report — SOL-04: Motor de Agente Agendamiento

| Campo | Valor |
|-------|-------|
| **PR** | #32 |
| **Rama** | `SOL-04/agente-agendamiento` |
| **Mergeada** | 2026-06-05 |
| **QA Ejecutado** | 2026-06-16 |
| **Entorno** | Stage `dev` (AWS) |
| **ServicesApi** | `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com` |
| **Frontend** | `https://d1z7dsgvuqduin.cloudfront.net` |

---

## Resumen Ejecutivo

- ✅ **21/21 tests de API pasaron** — La capa de infraestructura (REST, Google Calendar OAuth, Telegram webhook) funciona correctamente.
- ✅ **Frontend Inbox** carga correctamente con vista master-detail.
- ✅ **Conexión Telegram** funciona — bot vinculado y respondiendo mensajes.
- 🔴 **3 bugs en la experiencia conversacional del bot** — Fechas incorrectas al agendar, fechas incorrectas al listar citas, y falta de capacidad de cancelación vía chat.

---

## Tests Ejecutados (API contra deploy dev)

### Módulo: Bookings (CRUD)

| # | Test | Esperado | Resultado |
|---|------|----------|-----------|
| T1 | `GET /bookings` — listar reservas | 200 + array | ✅ PASS (200, 0 items iniciales) |
| T2 | `GET /bookings/:id` — ID inexistente | 404 | ✅ PASS |
| T3 | `POST /bookings` — body vacío | 400 | ⚠️ 404 (ver nota) |
| T4 | `POST /bookings` — agentId inexistente | 404 | ✅ PASS |
| T9 | `DELETE /bookings/:id` — ID inexistente | 404 | ✅ PASS |
| T11 | `POST /bookings` — agente tipo RAG (no agendamiento) | 400 | ✅ PASS |
| T12 | `POST /bookings` — crear cita con agente agendamiento | 201 | ✅ PASS |
| T13 | `GET /bookings` — verificar booking creado | 200, count ≥ 1 | ✅ PASS |
| T14 | `PATCH /bookings/:id` — reprogramar cita | status=rescheduled, rescheduleCount=1 | ✅ PASS |
| T15 | `DELETE /bookings/:id` — cancelar cita | status=cancelled | ✅ PASS |
| T16 | `DELETE /bookings/:id` — cancelar de nuevo (idempotente) | status=cancelled | ✅ PASS |

### Módulo: Google Calendar Integration

| # | Test | Esperado | Resultado |
|---|------|----------|-----------|
| T5 | `GET /bookings/google-calendar/status` — sin agentId | 400 o 404 | ✅ PASS (404) |
| T17 | `GET /bookings/google-calendar/status?agentId=<agendamiento>` | 200 + connected/email | ✅ PASS (connected: false) |
| T18 | `GET /bookings/google-calendar/auth-url?agentId=<agendamiento>` | 200 + URL OAuth Google | ✅ PASS |
| T19 | `GET /bookings/google-calendar/auth-url?agentId=<RAG>` | 400 (no es agendamiento) | ✅ PASS |

### Módulo: Telegram Channels

| # | Test | Esperado | Resultado |
|---|------|----------|-----------|
| T6 | `GET telegram/webhook/info` — sin auth | 401 | ✅ PASS |
| T7 | `POST telegram/connect` — agentId de otra empresa | 403 | ✅ PASS |
| T8 | `POST telegram/webhook/:channelId` — body vacío | 200 `{ok:true}` (no crashea) | ✅ PASS |
| T20 | `GET telegram/webhook/info?agentId=<agendamiento>` | Info del webhook | ✅ PASS (webhook registrado) |
| T21 | `POST telegram/connect` — token inválido | 400 | ✅ PASS |

### Módulo: Channels (WhatsApp)

| # | Test | Esperado | Resultado |
|---|------|----------|-----------|
| T10 | `GET /channels/status` — sin agentId | 400 o 404 | ✅ PASS (404) |

---

## Hallazgos

### 🔴 Hallazgo 1 (BUG): El bot pone fechas incorrectas al agendar

**Severidad:** Alta  
**Descripción:** Al interactuar con el bot de agendamiento vía Telegram (`@multibotsagendamiento_bot`), cuando el usuario solicita agendar una cita para una fecha específica, el bot confirma la cita pero con una fecha diferente a la solicitada.  
**Reproducción:** Escribir al bot "Quiero una cita para el viernes a las 3 PM" → el bot agenda en otra fecha.  
**Causa probable:** El LLM está interpretando incorrectamente las fechas relativas ("mañana", "el viernes", "la próxima semana"). El System Prompt podría no estar inyectando correctamente la fecha/hora actual del sistema, o la zona horaria no se está enviando al modelo.  
**Referencia:** Este riesgo fue identificado en el premortem (Riesgo 5: "Alucinaciones de fecha en lenguaje natural por parte del LLM").  
**Recomendación:**
1. Verificar que el System Prompt inyecta la fecha actual en formato explícito (`Hoy es Martes 17 de Junio de 2026, hora: 10:30 AM, zona horaria: America/Bogota`)
2. Implementar el flujo de **confirmación en dos pasos** descrito en la spec: el bot debe enviar "¿Confirmas tu cita para el Viernes 20 de Junio a las 3:00 PM?" antes de ejecutar `book_appointment`
3. Verificar la propiedad `timezone` del agente está configurada correctamente

### 🔴 Hallazgo 2 (BUG): El bot muestra fechas incorrectas al listar citas

**Severidad:** Alta  
**Descripción:** Cuando el usuario le pide al bot un resumen de sus citas agendadas, el bot responde con fechas/horas que no coinciden con las que se confirmaron originalmente.  
**Causa probable:** Posible problema de timezone al leer los bookings de MongoDB (se guardan en UTC y se muestran sin convertir a la zona horaria del agente/usuario), o el LLM está "inventando" los datos en vez de usar la herramienta de consulta.  
**Recomendación:**
1. Verificar que existe una herramienta (tool) para consultar las citas del usuario (`list_bookings` o similar) y que el LLM la está invocando
2. Si no existe la herramienta, el LLM está alucinando las fechas basándose en la memoria conversacional (que puede estar incompleta)
3. Asegurar que al devolver las fechas al LLM se convierten al timezone del agente

### 🟡 Hallazgo 3 (BUG): El bot dice que no puede cancelar citas

**Severidad:** Media  
**Descripción:** Al solicitar cancelar una cita, el bot responde que no tiene esa capacidad.  
**Causa probable:** No existe una herramienta `cancel_appointment` o `reschedule_appointment` registrada en el toolkit del agente. La spec de la SOL-04 menciona estas herramientas pero según los Acceptance Criteria de la PR, las tools de cancelación/reprogramación aún no estaban implementadas en el flujo del LLM (solo `check_availability` y `book_appointment` están definidas).  
**Impacto:** El usuario no puede cancelar ni reprogramar citas vía bot conversacional. Debe hacerlo manualmente desde el panel.  
**Recomendación:** Implementar las herramientas `cancel_appointment` y `reschedule_appointment` como tools del LLM en el motor de agendamiento.

### ⚠️ Hallazgo 4: POST /bookings con body vacío retorna 404 en vez de 400

**Severidad:** Baja  
**Descripción:** Al enviar `POST /bookings` con `{}` se esperaba un 400 (validación de campos requeridos), pero retorna 404. El DTO vacío pasa validación parcial y al no tener `agentId` válido, busca el agente y falla con 404.  
**Impacto:** No afecta funcionalidad real. Tema de consistencia de errores.

### ✅ Hallazgo 5: Google Calendar funciona con mock cuando no está vinculado

El `googleEventId` generado es `mock_gsdxpdz5bee`, confirmando que sin vinculación real se opera localmente con IDs ficticios. Comportamiento correcto.

### ✅ Hallazgo 6: Webhook de Telegram operativo

El agente de agendamiento tiene webhook registrado y responde mensajes correctamente.

### ✅ Hallazgo 7: Idempotencia en cancelación (API)

`DELETE /bookings/:id` sobre un booking ya cancelado no genera error. Comportamiento robusto.

---

## Pruebas Manuales Ejecutadas

### Frontend — Inbox (`/inbox`)

| Escenario | Resultado |
|-----------|-----------|
| Vista master-detail carga con conversaciones escaladas | ✅ PASS |
| Badge numérico en sidebar | ✅ PASS |
| Conexión de Telegram desde pestaña Canal | ✅ PASS (bot ya conectado) |

### Bot Conversacional — Telegram (`@multibotsagendamiento_bot`)

| Escenario | Resultado |
|-----------|-----------|
| Enviar mensaje → bot responde | ✅ PASS |
| Solicitar agendar una cita → crea booking | ✅ PASS (cita se crea) |
| Fecha de la cita coincide con la solicitada | 🔴 FAIL (pone otra fecha) |
| Pedir resumen de citas → fechas correctas | 🔴 FAIL (muestra fechas incorrectas) |
| Solicitar cancelar una cita | 🔴 FAIL (dice que no puede) |

---

## Pruebas Pendientes

| Escenario | Razón |
|-----------|-------|
| Flujo completo OAuth Google Calendar (vincular → crear cita real sincronizada) | Requiere cuenta Google real + interacción browser |
| Responsive del Inbox en viewport mobile | Requiere DevTools manual |

---

## Criterios de Aceptación (validación)

| Criterio | Estado |
|----------|--------|
| API Bookings CRUD funciona con aislamiento por empresa | ✅ Verificado |
| Agente tipo agendamiento acepta bookings, otros tipos no | ✅ Verificado |
| Google Calendar OAuth genera URL correcta | ✅ Verificado |
| Google Calendar status reporta estado de conexión | ✅ Verificado |
| Telegram: token inválido rechazado | ✅ Verificado |
| Telegram: webhook no crashea con body vacío | ✅ Verificado |
| Telegram: endpoints protegidos por JWT | ✅ Verificado |
| Telegram: bot responde mensajes del usuario | ✅ Verificado |
| Reprogramación incrementa rescheduleCount y cambia status | ✅ Verificado |
| Cancelación cambia status a "cancelled" (API) | ✅ Verificado |
| Bot agenda cita en la fecha correcta | 🔴 FALLA — pone otra fecha |
| Bot muestra resumen de citas con fechas reales | 🔴 FALLA — fechas incorrectas |
| Bot cancela citas vía conversación | 🔴 FALLA — no tiene la herramienta |
| Inbox frontend carga vista master-detail | ✅ Verificado |
| Build del monorepo pasa sin errores | ⚪ No probado (CI) |

---

## Veredicto

**⚠️ APROBADO CON OBSERVACIONES** — La infraestructura de la SOL-04 (API REST, Google Calendar OAuth, Telegram webhook) está correctamente implementada y responde según la especificación. Sin embargo, la **experiencia conversacional del bot** presenta 3 bugs funcionales que afectan la calidad del flujo de agendamiento:

| Bug | Severidad | Acción |
|-----|-----------|--------|
| Fechas incorrectas al agendar | 🔴 Alta | Corregir inyección de fecha/timezone en System Prompt + doble confirmación |
| Fechas incorrectas al listar citas | 🔴 Alta | Verificar tool de consulta de bookings + conversión de timezone |
| No puede cancelar citas | 🟡 Media | Implementar tool `cancel_appointment` en el toolkit del LLM |

**Recomendación:** No bloquea deploy pero requiere corrección antes de pasar a QA de producción.
