# 📋 Reporte QA — SL10 Sistema de Notificaciones

**Fecha:** 17 de Junio de 2026  
**QA:** jhon99mendoza  
**Solución:** SL10 — Sistema de Notificaciones  
**Rama:** `jessy-dev` → `dev` (merge directo, sin PR)  
**Deploy:** Stage `dev` en AWS  
**URLs del deploy:**
- Frontend: `https://d1z7dsgvuqduin.cloudfront.net`
- Services API: `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`
- Functions API: `https://eibwrbqsna.execute-api.us-east-1.amazonaws.com`

---

## 🎯 Resumen Ejecutivo

| Categoría | Resultado |
|-----------|-----------|
| Tests Automatizados (Property-Based) | ✅ 14/14 pasando |
| Tests Automatizados (Integration Gateway) | ✅ 9/9 pasando |
| Tests Automatizados (Integration Service) | ✅ 8/8 pasando |
| Pruebas Manuales (Deploy dev) | ❌ 1 bug crítico bloqueante |
| **Veredicto General** | 🔴 **NO APROBADO** — Bug crítico en WebSocket |

---

## ✅ Tests Automatizados — Todos Pasando (31 tests)

### Property-Based Tests (Core — fast-check)
**Archivo:** `packages/core/src/notifications/__tests__/notification.service.property.test.ts`

| # | Propiedad validada | Estado |
|---|-------------------|--------|
| 1 | WebSocket se emite SIEMPRE, sin importar si el encolado de emails falla | ✅ |
| 2 | Se encola exactamente 1 email por operador encontrado | ✅ |
| 3 | Cada email usa plantilla ESCALATION_ALERT con URL correcta (/inbox) | ✅ |
| 4 | Degradación silenciosa si findOperatorsByCompany falla (DB offline) | ✅ |
| 5 | Degradación silenciosa si enqueue falla (cola llena) | ✅ |
| 6 | WebSocket emite type "booking" con datos correctos | ✅ |
| 7 | Emails de booking usan plantilla NEW_BOOKING_ALERT con URL a /pedidos | ✅ |
| 8 | Con 0 operadores: no encola emails pero WebSocket sí se emite | ✅ |
| 9 | Degradación silenciosa en notificarNuevoBooking si BD falla | ✅ |
| 10 | Si customerEmail existe: encola exactamente 1 email con template correcto | ✅ |
| 11 | Si customerEmail está vacío: NO encola ningún email (guard) | ✅ |
| 12 | Degradación silenciosa si enqueue falla en notificarClienteBooking | ✅ |
| 13 | El dateTime se serializa correctamente como ISO string | ✅ |
| 14 | Cada notificación se emite exclusivamente al companyId indicado (aislamiento) | ✅ |

### Integration Tests (NestJS Gateway)
**Archivo:** `apps/services/api-multi-bots/src/modules/notifications/__tests__/notifications-ws.gateway.spec.ts`

| # | Escenario | Estado |
|---|-----------|--------|
| 1 | Unir cliente al room de su empresa (`company:<companyId>`) | ✅ |
| 2 | NO unir cliente sin companyId en JWT | ✅ |
| 3 | NO unir cliente si data.user es undefined | ✅ |
| 4 | Emitir al room correcto con evento y payload | ✅ |
| 5 | Room usa formato `company:<id>` | ✅ |
| 6 | Soporta cualquier tipo de payload (string, object, array) | ✅ |
| 7 | Aislamiento de rooms: empresa A ≠ empresa B | ✅ |
| 8 | Provider delega emitirAlerta al gateway | ✅ |
| 9 | Provider cumple interfaz INotificationsWsEmitter | ✅ |

### Integration Tests (NestJS Service Adapter)
**Archivo:** `apps/services/api-multi-bots/src/modules/notifications/__tests__/notifications.service.spec.ts`

| # | Escenario | Estado |
|---|-----------|--------|
| 1 | Instancia NotificationService del core con dependencias correctas | ✅ |
| 2 | Usa localhost:3000 como fallback si FRONTEND_DOMAIN no definido | ✅ |
| 3 | Delega notificarEscalamiento al core con parámetros correctos | ✅ |
| 4 | Delega notificarNuevoBooking al core con parámetros correctos | ✅ |
| 5 | Delega notificarClienteBooking al core | ✅ |
| 6 | Soporta las 3 plantillas de booking (confirmed, rescheduled, cancelled) | ✅ |
| 7 | Propaga errores del core si core los propaga | ✅ |
| 8 | Core maneja degradación silenciosa internamente | ✅ |

---

## ⚠️ Hallazgo de Property-Based Testing

**Bug potencial detectado:** `NotificationService.notificarNuevoBooking` y `notificarClienteBooking` llaman `dateTime.toISOString()` sin validar que el `Date` sea válido.

- **Input que causa fallo:** `new Date(NaN)` (date inválido)
- **Error:** `RangeError: Invalid time value`
- **Impacto:** Bajo en producción (las fechas vienen de Google Calendar como ISO strings válidos)
- **Recomendación:** Agregar guard defensivo: `if (isNaN(dateTime.getTime())) return;`
- **Severidad:** 🟡 Bajo

---

## 🔴 Bug Crítico — WebSocket No Funciona en Deploy

### Descripción
La conexión WebSocket de notificaciones (Socket.IO) **no logra establecerse** en el stage `dev`. El primer request de handshake retorna **HTTP 400 (Bad Request)** contra API Gateway, impidiendo que el cliente se suscriba al room de la empresa y reciba eventos `notification.new`.

### Evidencia
- **Request fallida:** `GET https://5em5s6gn59.execute-api.us-east-1.amazonaws.com/socket.io/?token=eyJhb...` → 400
- **Síntoma:** La campana de notificaciones muestra "Sin notificaciones pendientes" aunque se provocan escalamientos en tiempo real
- **Comprobación:** Se provocó un escalamiento explícito vía Telegram ("quiero hablar con un humano") con el panel abierto → la notificación **nunca llegó** a la campana

### Diagnóstico
El hook `use-notifications-ws.ts` usa `transports: ['polling']` para entornos de producción (no-localhost). Sin embargo, API Gateway no soporta correctamente el protocolo de long-polling de Socket.IO:
1. El handshake inicial (que genera el `sid`) falla con 400
2. Sin `sid`, el polling subsiguiente no puede mantener la sesión
3. El socket nunca emite `subscribe` → nunca se une al room → nunca recibe eventos

### Root Cause Probable
API Gateway (REST API / HTTP API) no está configurado para pasar transparentemente los headers y query params requeridos por el protocolo Engine.IO/Socket.IO de polling. Socket.IO requiere:
- Soporte para requests de larga duración (long-polling)
- Paso correcto de query params (`EIO`, `transport`, `sid`)
- Headers de respuesta `Content-Type` y `Set-Cookie` que API Gateway puede estar filtrando

### Impacto
- 🔴 **Crítico** — La funcionalidad principal de la SL10 (notificaciones en tiempo real) no funciona en el deploy
- Los operadores NO reciben alertas de escalamientos ni reservas
- El encolado de emails (segundo canal) probablemente funciona pero no fue verificable directamente

### Recomendación
1. **Opción A:** Usar Application Load Balancer (ALB) con soporte nativo de WebSocket en lugar de API Gateway para el servicio NestJS en Fargate
2. **Opción B:** Configurar una ruta dedicada en API Gateway con integración HTTP_PROXY sin transformaciones para `/socket.io/*`
3. **Opción C:** Usar un endpoint dedicado de NestJS (expuesto directamente por Fargate con un ALB) para el namespace `/notifications`

### Severidad
🔴 **Alta / Bloqueante** — La feature principal de la solución no funciona en producción.

---

## 📊 Pruebas Manuales

### TC-01: Conexión WebSocket de notificaciones
| Campo | Valor |
|-------|-------|
| Estado | ⚠️ Parcial |
| Detalle | La campana aparece correctamente, el popover se abre, pero la conexión WS falla con 400. El frontend no recibe error visible — solo se ve en Network/Console |

### TC-02: Recepción de alerta de escalamiento en tiempo real
| Campo | Valor |
|-------|-------|
| Estado | ❌ Fallo |
| Detalle | Se provocó escalamiento explícito via Telegram con panel abierto. La notificación nunca llegó a la campana. Causa: socket.io handshake 400 |

### TC-03 a TC-07: Escenarios dependientes de WebSocket
| Campo | Valor |
|-------|-------|
| Estado | ⏭️ No testeados |
| Detalle | Bloqueados por el bug de conexión WS. No es posible probar recepción de alertas de booking, clicks en notificaciones, marcar como leídas, ni reconexión |

---

## 📝 Resumen de Criterios de Aceptación

| Criterio | Tests Auto | Deploy |
|----------|-----------|--------|
| Emite evento WebSocket `notification.new` | ✅ | ❌ No llega al frontend |
| Clientes suscritos reciben alerta en tiempo real | ✅ | ❌ Socket no se establece |
| NotificationBell actualiza contador sin refrescar | ✅ (lógica) | ❌ (deploy) |
| Se encolan correos con variables dinámicas correctas | ✅ | No verificado en BD |
| Degradación silenciosa si falla BD o sockets | ✅ | ✅ (el escalamiento no se interrumpió) |
| Compila bajo TypeScript estricto | ✅ | ✅ |

---

## 🎬 Próximos Pasos

1. **Dev** debe investigar y corregir la conectividad WebSocket contra el deploy de AWS (API Gateway vs ALB)
2. Una vez corregido, repetir TC-02 a TC-07 para validar el flujo end-to-end
3. Verificar encolado de emails en MongoDB (`emailQueue` collection) para confirmar que el segundo canal de notificación funciona independientemente del WebSocket

---

*Reporte generado por QA Automation + QA Checkpoint — Notion-ready*
