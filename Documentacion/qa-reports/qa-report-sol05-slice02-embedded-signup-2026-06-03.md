# Reporte de QA — SL05/flujo-2.2: Embedded Signup / Conexión de Canal

**Fecha:** 2026-06-03  
**Solución:** SOL-05 — Conector de WhatsApp  
**PR:** #25 — Sl05/flujo 2.2 embedded signup  
**Autor de la PR:** jlamos-stt  
**QA ejecutado por:** Agente (automatizado) + pendiente QA humano  
**Deploy probado:** ServicesApi — `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests unitarios (channel-validation) | 9/9 ✅ |
| Tests property-based (channel-validation) | 6/6 ✅ |
| Tests property-based (token-encryption) | 3/3 ✅ |
| Tests property-based (channel repository) | 3/3 ✅ |
| Tests integración (ConnectWhatsAppService) | 4/4 ✅ |
| Tests integración (ChannelsController) | 3/3 ✅ |
| Tests property (ConnectWhatsAppDto) | 3/3 ✅ |
| Tests property (token leak) | 1/1 ✅ |
| Tests integración contra deploy | 1/1 ✅ |
| Pruebas manuales frontend | 1/1 ✅ |
| **Total tests** | **34/34 PASS** |
| Duración total | ~15s |
| Fallos | 0 |
| Bloqueantes encontrados | 0 |

---

## 1. Tests automatizados ejecutados

### 1.1 Channel Validation — Unicidad de phoneNumberId (`packages/core`)

#### Unit Tests (`channel-validation.test.ts`) — 9/9 ✅

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | Canal connected a OTRO agente → already_connected_other_agent | ✅ |
| 2 | Canal partially_connected a OTRO agente → already_connected_other_agent | ✅ |
| 3 | Canal connected al MISMO agente → allowed (update) | ✅ |
| 4 | Canal requires_reconnection del MISMO agente → allowed (update) | ✅ |
| 5 | Sin canales existentes → allowed (create) | ✅ |
| 6 | Solo canales disconnected → allowed (create) | ✅ |
| 7 | requires_reconnection de DIFERENTE agente → allowed (create) | ✅ |
| 8 | Rule 1 prevalece sobre Rule 3 (prioridad) | ✅ |
| 9 | partially_connected mismo agente → allowed (update) | ✅ |

#### Property-Based Tests (`channel-validation.property.test.ts`) — 6/6 ✅

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | Canal connected/partially_connected de otro agente bloquea | ✅ |
| 2 | Canal connected del mismo agente permite reconectar (update) | ✅ |
| 3 | Canal requires_reconnection del mismo agente permite update | ✅ |
| 4 | Sin canales activos permite crear | ✅ |
| 5 | Lista vacía permite crear | ✅ |
| 6 | Rule 1 prevalece sobre Rules 2, 3, 4 | ✅ |

---

### 1.2 Token Encryption — AES-256-GCM (`packages/core`)

#### Property-Based Tests (`token-encryption.property.test.ts`) — 3/3 ✅

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | Round-trip: decrypt(encrypt(token, key), key) === token (claves hex) | ✅ |
| 2 | Round-trip: decrypt(encrypt(token, key), key) === token (claves base64) | ✅ |
| 3 | Cada cifrado produce resultado diferente (IV aleatorio) | ✅ |

---

### 1.3 Channel Repository (`packages/db`)

#### Property-Based Tests (`channel.property.test.ts`) — 3/3 ✅

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | Channel creado contiene todos los campos obligatorios con tipos correctos | ✅ |
| 2 | createdAt y updatedAt son generados automáticamente e iguales | ✅ |
| 3 | Los valores del input se preservan correctamente | ✅ |

---

### 1.4 ConnectWhatsAppService — Integración (`apps/services/api-multi-bots`)

#### Integration Tests (`connect-whatsapp.service.spec.ts`) — 4/4 ✅

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | Happy Path (CREATE): crea canal con status connected | ✅ |
| 2 | Unicidad: lanza ConflictException si conectado a otro agente | ✅ |
| 3 | Reconexión (UPDATE): actualiza credenciales del canal existente | ✅ |
| 4 | Webhook fallback: crea canal como partially_connected si webhooks fallan | ✅ |

#### Property Tests (`connect-whatsapp.property.test.ts`) — 3/3 ✅

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | Payloads completos con campos válidos son aceptados | ✅ |
| 2 | Payloads con al menos un campo vacío son rechazados | ✅ |
| 3 | Payloads con campos requeridos ausentes son rechazados | ✅ |

#### Token Leak Test (`token-leak.property.test.ts`) — 1/1 ✅

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | El Business Token no se filtra en salidas del servicio ni logs | ✅ |

---

### 1.5 ChannelsController — Integración (`apps/services/api-multi-bots`)

#### Controller Tests (`channels.controller.spec.ts`) — 3/3 ✅

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | Conexión exitosa de canal WhatsApp | ✅ |
| 2 | ForbiddenException si agentId no pertenece a la empresa | ✅ |
| 3 | ForbiddenException si agentId no es un ObjectId válido | ✅ |

---

## 2. Cobertura de criterios de aceptación

| Criterio | Verificado | Método |
|----------|-----------|--------|
| Token exchange con Meta Graph API | ✅ | Service integration test (mocked) |
| Registro de número en Cloud API | ✅ | Service integration test |
| Webhook subscription con retry/backoff | ✅ | Service test #4 (partially_connected) |
| Cifrado AES-256-GCM del Business Token | ✅ | PBT round-trip |
| Unicidad de phoneNumberId | ✅ | 9 unit + 6 PBT |
| Persistencia del canal en MongoDB | ✅ | Repository PBT |
| Validación de ownership (agentId ↔ companyId) | ✅ | Controller tests #2, #3 |
| Token no se filtra en respuestas/logs | ✅ | Token leak PBT |

---

## 3. Pruebas de integración contra deploy (stage dev)

**ServicesApi:** `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`

| # | Prueba | Request | Esperado | Real | Resultado |
|---|--------|---------|----------|------|-----------|
| 1 | POST /api/channels/whatsapp/connect sin JWT | `POST /api/channels/whatsapp/connect` (sin Authorization header) | 401 | 401 | ✅ PASS |

---

## 4. Pruebas manuales frontend (QA humano)

**Frontend:** `https://d1z7dsgvuqduin.cloudfront.net`  
**Ejecutado por:** jhon99mendoza

| TC | Prueba | Resultado |
|----|--------|-----------|
| TC-04 | Pestaña Canal: Embedded Signup marcado "En desarrollo" + botón no clickeable + Configuración Manual activa | ✅ PASS |

---

## 5. Pruebas pendientes (delegadas al QA humano)

| # | Escenario | Requiere |
|---|-----------|----------|
| 1 | Flujo completo Embedded Signup desde frontend | Cuenta Meta dev + frontend desplegado |
| 2 | Reconexión de canal existente | Canal previamente conectado |
| 3 | Intentar conectar número ya usado por otro agente | Dos agentes + mismo número |

**Bloqueante:** Requiere cuenta Meta corporativa verificada.

---

## 6. Arquitectura verificada

```
Frontend (Next.js)                     Backend (NestJS Fargate)
     │                                        │
     │ POST /api/channels/whatsapp/connect     │
     │ { agentId, wabaId, phoneNumberId,       │
     │   tokenCode }                           │
     └──────────────────────────────────────► ChannelsController
                                               │
                                               ├─ verifyAgentOwnership(agentId, companyId)
                                               │
                                               ▼
                                          ConnectWhatsAppService.execute()
                                               │
                                               ├─ 1. checkPhoneNumberUniqueness()
                                               ├─ 2. metaGraphApi.exchangeToken(tokenCode)
                                               ├─ 3. metaGraphApi.registerPhoneNumber()
                                               ├─ 4. metaGraphApi.subscribeWebhooks() [3 retries]
                                               ├─ 5. metaGraphApi.setWebhookOverride() [no-block]
                                               ├─ 6. encryptToken(businessToken, key)
                                               └─ 7. channelRepository.create() / updateCredentials()
```

---

## 7. Observaciones

- El servicio maneja graceful degradation: si webhooks fallan, el canal queda `partially_connected` en vez de fallar completamente.
- El retry para webhook subscription usa backoff exponencial (2s, 4s, 8s) — verificado en logs del test.
- El token leak test asegura que el Business Token nunca aparece en las respuestas del controlador ni en los logs estructurados.
- La reconexión (update) es un flujo separado del create, lo que evita canales duplicados.
- **Frontend confirmado:** Embedded Signup deshabilitado con badge "En desarrollo", botón no clickeable, y Configuración Manual activa como alternativa.

---

## 8. Veredicto

| Fase | Estado |
|------|--------|
| Tests automatizados | ✅ **APROBADO** — 32/32 pass |
| Integración contra deploy | ✅ **APROBADO** — 1/1 pass |
| Pruebas manuales frontend | ✅ **APROBADO** — 1/1 pass |
| Pruebas manuales con Meta | ⏳ Pendiente (necesita cuenta corporativa) |

**Conclusión:** La lógica de conexión de canales WhatsApp está correctamente implementada. Los tests cubren unicidad, cifrado, validación de DTOs, reconexión, fallback de webhooks y prevención de leak de tokens. El endpoint desplegado rechaza correctamente requests sin JWT (401). El frontend muestra Embedded Signup deshabilitado con Configuración Manual activa. Las pruebas E2E con Meta quedan pendientes.
