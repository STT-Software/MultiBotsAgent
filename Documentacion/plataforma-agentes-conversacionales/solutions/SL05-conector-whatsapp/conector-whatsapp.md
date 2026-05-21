---
taxonomy: solution
key: conector-whatsapp
solution: Conector de WhatsApp
initiative: ../../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Felipe Lamos
created: 2026-05-15
updated: 2026-05-15
version: "1.0.0"
status: drafting
language: es
changelog:
  - date: 2026-05-15
    author: Felipe Lamos
    change: "Creacion inicial del documento de solucion — Conector de WhatsApp"
  - date: 2026-05-15
    author: Felipe Lamos
    change: "Premortem aplicado — Eliminada deduplicacion por ventana (reemplazada con idempotencia por wamid), agregado mecanismo manual para dev, definida topologia de red (Lambda en VPC), TTL en MessageLog, cache con TTL corto."
  - date: 2026-05-15
    author: Felipe Lamos
    change: "Premortem #2 — Corregido orden de operaciones en webhook (200 despues de SQS, no antes), agregado flujo 2.7 Reconexion de Canal, timeout MongoDB 3s, health check pasivo."
---

# Conector de WhatsApp

## 1. Overview

### Contexto

El Conector de WhatsApp es la solucion #5 del Solution Map de la iniciativa "Plataforma de Agentes Conversacionales". Es la capa de comunicacion entre los usuarios finales (clientes de las empresas) y los motores de agentes de la plataforma. Su responsabilidad es recibir mensajes de WhatsApp, identificar a que agente corresponden, entregarlos al motor correcto, y enviar las respuestas de vuelta al usuario.

### Relacion con la iniciativa

Esta solucion cubre las capacidades definidas en la Fase 2:
- Envio/recepcion de mensajes por WhatsApp
- Asociacion agente-numero (1 agente = 1 numero)
- Arquitectura preparada para multi-canal (sin implementar otros canales)

### Resumen ejecutivo tecnico

Conector event-driven implementado con AWS Lambda + API Gateway + SQS. Usa la WhatsApp Cloud API de Meta directamente (sin proveedores intermediarios). Las empresas conectan su numero via Embedded Signup de Meta (flujo OAuth integrado en el panel). El conector recibe webhooks de Meta, valida la firma HMAC, identifica el agente destino, y publica el mensaje en una cola SQS para procesamiento asincrono. Una segunda Lambda consume la cola, invoca el motor del agente (NestJS via HTTP), y envia la respuesta por Cloud API.

### Dependencias

| Solucion | Relacion |
|----------|----------|
| 14 - Gestion de Empresas y Acceso | Provee contexto de empresa y autenticacion para el panel |
| 1 - Panel de Administracion Web | UI donde la empresa conecta su numero (Embedded Signup) |
| 2 - Motor de Agente RAG | Consumidor principal — recibe mensajes preprocesados |
| 3 - Motor de Agente Cotizador | Consumidor — recibe mensajes preprocesados |
| 4 - Motor de Agente Agendamiento | Consumidor — recibe mensajes preprocesados |
| 7 - Memoria Conversacional | El conector crea/identifica conversaciones |
| 8 - Escalamiento a Humano | El conector entrega mensajes cuando la conversacion esta escalada |

### Decisiones clave

| Aspecto | Decision |
|---------|----------|
| Proveedor | WhatsApp Cloud API de Meta (directo, sin terceros) |
| Modelo de numeros | Cada empresa configura su propio WABA/numero |
| Conexion de numero | Embedded Signup (flujo OAuth de Meta en el panel) |
| Tipos de mensaje (inicial) | Solo texto |
| Arquitectura webhook | Lambda + API Gateway |
| Comunicacion interna | SQS (consistente con SOL-06) |
| Templates/mensajes proactivos | Fuera de alcance de esta solucion |
| Ventana 24h | Se documenta como restriccion, se resuelve en solucion #9 |


---

## 2. Solution Narrative

### 2.1 Verificacion del Webhook (Setup tecnico)

- **Trigger:** Meta envia un GET al endpoint del webhook con un challenge token (ocurre al configurar el webhook en la app de Meta o al suscribir un WABA).

- **Comportamiento:**
  1. La Lambda recibe el GET con parametros: `hub.mode`, `hub.verify_token`, `hub.challenge`.
  2. Valida que `hub.verify_token` coincida con el token configurado en la plataforma (almacenado como SST Secret).
  3. Si coincide, responde 200 con el valor de `hub.challenge` como body.

- **Resultado:** Meta confirma que el webhook es valido y comienza a enviar notificaciones.

- **Error path:** Si el verify_token no coincide, responde 403. Meta no activa el webhook.

---

### 2.2 Registro de Canal (Embedded Signup)

- **Trigger:** El usuario navega a la configuracion de canal de un agente en el panel y hace clic en "Conectar WhatsApp".

- **Comportamiento:**
  1. El frontend carga el SDK de Facebook Login y lanza el flujo de Embedded Signup.
  2. La empresa se autentica con Meta, acepta terminos, selecciona/crea WABA, verifica numero.
  3. Meta retorna al frontend: WABA ID, Phone Number ID, y un codigo de token intercambiable.
  4. El frontend envia estos datos al backend (API NestJS).
  5. El backend intercambia el codigo por un Business Token (server-to-server con Meta Graph API).
  6. El backend registra el numero en Cloud API para uso con la plataforma.
  7. El backend suscribe la app a webhooks del WABA.
  8. El backend almacena las credenciales cifradas (WABA ID, Phone Number ID, Business Token) asociadas al agente y empresa en MongoDB.
  9. El backend configura el webhook override para ese Phone Number ID (para que los mensajes lleguen al endpoint correcto).
  10. El estado del canal pasa a "connected".

- **Resultado:** El agente queda asociado a un numero de WhatsApp funcional. Puede recibir y enviar mensajes.

- **Error path:**
  - Si el usuario cancela el flujo de Meta: no se guarda nada, se muestra mensaje informativo.
  - Si el intercambio de token falla: se notifica al usuario que reintente.
  - Si el numero ya esta asociado a otro agente en la plataforma: se rechaza con mensaje claro.
  - Si la suscripcion de webhooks falla: se reintenta automaticamente. Si persiste, se marca como "parcialmente conectado" y se notifica.

- **Decisiones de diseno:**
  - Embedded Signup es el mecanismo de conexion en produccion.
  - **Para desarrollo/testing:** se permite configurar credenciales manualmente via variables de entorno o seed de MongoDB (Phone Number ID + Token). Esto desbloquea el desarrollo sin depender de App Review.
  - El Business Token se almacena cifrado en MongoDB (AES-256). Solo se descifra al momento de usar.
  - Un numero solo puede estar asociado a un agente a la vez (restriccion de negocio actual).
  - La entidad Channel es independiente del Agent (no embebida), preparada para futuro multi-agente por numero.

---

### 2.3 Recepcion de Mensaje Entrante

- **Trigger:** Un usuario final envia un mensaje de texto por WhatsApp al numero de la empresa.

- **Comportamiento:**
  1. Meta envia un POST al webhook de la plataforma con el payload del mensaje.
  2. La Lambda Webhook Handler valida la firma HMAC del payload (header `X-Hub-Signature-256`) contra el App Secret.
  3. Extrae del payload: Phone Number ID destino, numero del remitente (wa_id), message ID, contenido del mensaje (texto), timestamp.
  4. Verifica idempotencia: busca el `wamid` en coleccion `processedMessages`. Si ya existe, descarta y responde 200.
  5. Busca en MongoDB que agente esta asociado a ese Phone Number ID.
  6. Si encuentra agente activo, publica un mensaje en la cola SQS con: agentId, companyId, senderPhoneNumber, messageText, messageId, timestamp.
  7. Registra el `wamid` en `processedMessages` (para idempotencia futura).
  8. Responde 200 a Meta.
  9. Si no encuentra agente o el agente esta inactivo, responde 200 sin publicar en SQS (descarte silencioso).

- **Resultado:** El mensaje queda en la cola SQS listo para ser procesado por el motor del agente.

- **Error path:**
  - Firma HMAC invalida: responde 401, descarta el mensaje. Registra intento sospechoso.
  - Phone Number ID sin agente asociado: responde 200, no publica en SQS (evita reintentos de Meta).
  - Agente inactivo o empresa en estado `pending_deletion`: responde 200, no publica en SQS.
  - Error al publicar en SQS: responde 500 (Meta reintentara). Registra el error.
  - Error al conectar con MongoDB (timeout 3s): responde 500 (Meta reintentara).

- **Decisiones de diseno:**
  - Se responde 200 DESPUES de completar la logica basica (HMAC + idempotencia + SQS). Esto garantiza que si la Lambda falla, Meta reintenta y no se pierden mensajes. El timeout de Meta (20s) es suficiente para estas operaciones (< 200ms total).
  - La validacion HMAC es obligatoria en todos los ambientes (no se omite en desarrollo).
  - **Idempotencia por `wamid`:** Antes de publicar en SQS, se verifica en MongoDB (coleccion `processedMessages` con TTL index de 24h) si ese message ID ya fue procesado. Si ya existe, se descarta silenciosamente. Esto protege contra webhooks duplicados de Meta.
  - Cache con TTL corto (60 segundos) del mapeo Phone Number ID -> agentId. Al ser un lookup simple en MongoDB con indice, la latencia sin cache es < 5ms. No se necesita cache externo.
  - **Timeout de conexion a MongoDB:** 3 segundos. Si MongoDB no responde, la Lambda responde 500 y Meta reintenta.

---

### 2.4 Procesamiento y Envio de Respuesta

- **Trigger:** La Lambda Message Processor consume un mensaje de la cola SQS.

- **Comportamiento:**
  1. Lee el mensaje de SQS con los datos: agentId, companyId, senderPhoneNumber, messageText, messageId, timestamp.
  2. Determina el tipo de agente (RAG, Cotizador, Agendamiento) consultando la configuracion del agente.
  3. Invoca el motor del agente correspondiente via HTTP (NestJS endpoint interno, misma VPC):
     - Endpoint: `POST /internal/agents/{agentId}/process`
     - Body: `{ conversationId, userMessage, timestamp }`
  4. Recibe la respuesta del motor: uno o mas mensajes de texto.
  5. Para cada mensaje de respuesta, llama a la Cloud API de Meta:
     - `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`
     - Header: `Authorization: Bearer {business_token}`
     - Body: `{ messaging_product: "whatsapp", to: "{sender_wa_id}", type: "text", text: { body: "{response}" } }`
  6. Registra el status del envio.

- **Resultado:** El usuario final recibe la respuesta del agente en su WhatsApp.

- **Error path:**
  - Motor del agente no disponible (NestJS caido): reintenta via SQS retry policy (3 intentos con backoff). Si persiste, va a DLQ.
  - Token de WhatsApp invalido/expirado: marca el canal como "requires_reconnection", notifica a la empresa en el panel. El mensaje va a DLQ.
  - Rate limit de Meta (error 130429): retry con backoff exponencial (4^X segundos).
  - Ventana de 24h expirada (error 131026): registra como "mensaje no entregado por ventana expirada". No reintenta. Notifica que se requiere template (responsabilidad de solucion #9).
  - Respuesta del motor excede limite de WhatsApp (4096 chars): divide en multiples mensajes.

- **Decisiones de diseno:**
  - Cada mensaje se procesa individualmente (sin agrupacion por ventana temporal). La agrupacion de mensajes en rafaga es responsabilidad del Motor del Agente (SOL-02, flujo 2.3 ya lo soporta).
  - El motor se invoca via HTTP interno (misma VPC). La Lambda Message Processor se despliega en la VPC, misma subnet que Fargate/NestJS.
  - Se respeta el rate limit de Meta: maximo 80 mensajes/segundo por numero, y 1 mensaje cada 6 segundos al mismo usuario.
  - Si la respuesta tiene multiples partes (`messages[]`), se envian secuencialmente con un delay de 1-2 segundos entre cada una.
  - **Provisioned concurrency** en la Lambda Processor para mitigar cold starts por estar en VPC. Evaluar en staging si es necesario.


---

### 2.5 Desconexion de Canal

- **Trigger:** El usuario navega a la configuracion del agente y hace clic en "Desconectar WhatsApp".

- **Comportamiento:**
  1. El sistema solicita confirmacion ("¿Estas seguro? El agente dejara de recibir y enviar mensajes").
  2. El usuario confirma.
  3. El backend elimina la suscripcion de webhooks del WABA via Graph API.
  4. El backend elimina las credenciales almacenadas (Business Token, Phone Number ID, WABA ID) de MongoDB.
  5. El estado del canal pasa a "disconnected".
  6. El agente pasa a estado "borrador" (ya no puede operar sin canal).

- **Resultado:** El agente ya no recibe ni envia mensajes por ese numero. El numero queda libre para reconectarse (al mismo u otro agente).

- **Error path:**
  - Si la desuscripcion falla en Meta (token ya invalido): se procede igualmente con la limpieza local. El numero queda desasociado en la plataforma.
  - Si hay conversaciones activas en ese momento: se cierran con un mensaje de "servicio no disponible temporalmente" (best effort, no garantizado).

---

### 2.6 Recepcion de Status Updates

- **Trigger:** Meta envia un webhook con actualizacion de estado de un mensaje enviado (sent, delivered, read, failed).

- **Comportamiento:**
  1. La Lambda Webhook Handler recibe el POST con el status update.
  2. Valida la firma HMAC.
  3. Responde 200 inmediatamente.
  4. Extrae: message ID, status (sent/delivered/read/failed), timestamp, y opcionalmente error info.
  5. Actualiza el estado del mensaje en el historial de conversacion (MongoDB) directamente (no pasa por SQS — es una operacion ligera).

- **Resultado:** El historial de conversacion refleja si el mensaje fue entregado y/o leido por el usuario.

- **Error path:**
  - Message ID no corresponde a un mensaje conocido: se descarta silenciosamente (responde 200).
  - Status "failed": se registra el error de Meta y se marca el mensaje como fallido en el historial. Si el error es por ventana expirada, se registra para metricas.
  - Error al actualizar MongoDB: se registra en logs. No se reintenta (status updates son informativos, no criticos).

- **Decisiones de diseno:**
  - Los status updates NO pasan por SQS porque son operaciones de escritura simple y no requieren procesamiento pesado.
  - Se procesan en la misma Lambda del webhook pero en un flujo separado (switch por tipo de payload).
  - Los status se usan para metricas (tasa de entrega, tasa de lectura) cuando la solucion #12 este implementada.

---

### 2.7 Reconexion de Canal

- **Trigger:** El canal esta en estado "requires_reconnection" (detectado por health check o por error de token al enviar). El usuario ve en el panel un aviso de "Tu canal requiere reconexion" y hace clic en "Reconectar".

- **Comportamiento:**
  1. El frontend lanza el flujo de Embedded Signup (mismo que flujo 2.2).
  2. La empresa se autentica con Meta y completa el flujo.
  3. Meta retorna WABA ID, Phone Number ID, y codigo de token.
  4. El frontend envia los datos al backend.
  5. El backend detecta que ya existe un Channel con ese phoneNumberId en estado "requires_reconnection".
  6. El backend intercambia el codigo por un nuevo Business Token.
  7. El backend ACTUALIZA el Channel existente (no crea uno nuevo): nuevo token cifrado, status → "connected", actualiza connectedAt.
  8. El backend re-suscribe webhooks si es necesario.

- **Resultado:** El canal vuelve a estar operativo con un token fresco. No se pierde historial ni configuracion.

- **Error path:**
  - Si el phoneNumberId retornado por Meta no coincide con el del Channel existente: se rechaza con mensaje "El numero no coincide con el canal registrado".
  - Si el flujo de Meta falla: mismo manejo que flujo 2.2.

---

## 3. Out of Scope

Esta solucion **NO** cubre:

- **Mensajes proactivos y templates de WhatsApp:** Enviar mensajes fuera de la ventana de 24h requiere templates pre-aprobados. Responsabilidad de la solucion #9 (Motor de Mensajes Proactivos).
- **Gestion de la ventana de 24h:** La logica de cuando se puede enviar libremente vs cuando se necesita template es responsabilidad de la solucion #9.
- **Procesamiento multimedia:** Convertir audio/imagenes a texto para los motores. Queda para una iteracion futura del conector.
- **Multi-canal:** Solo WhatsApp. La arquitectura esta preparada (entidad Channel independiente) pero no se implementan otros canales.
- **Ruteo multi-agente por numero:** Un numero = un agente. El ruteo inteligente entre multiples agentes es responsabilidad de una solucion futura de orquestacion.
- **Logica de los motores de agentes:** El conector entrega y recibe. No procesa ni genera respuestas.
- **Inbox/escalamiento:** Cuando una conversacion esta escalada, el conector sigue entregando mensajes pero al inbox (solucion #8), no al motor.
- **Metricas de mensajeria:** Registrar tasas de entrega, lectura, etc. Responsabilidad de solucion #12.
- **Gestion de la app de Meta (App Review, permisos):** Es un proceso operativo/administrativo, no una funcionalidad de la plataforma.
- **Facturacion de WhatsApp:** Los costos de mensajeria los asume cada empresa en su WABA. La plataforma no intermedia.

---

## 4. Technical Context

### Arquitectura

```
                                    +---------------------------+
                                    |   Meta Cloud API          |
                                    |   (WhatsApp Business)     |
                                    +------+--------------------+
                                           | Webhook POST/GET
                                           v
+------------------+          +-----------------------------+
|  API Gateway     |--------->|  Lambda: Webhook Handler    |
|  (HTTPS endpoint)|          |  - Verifica firma HMAC      |
+------------------+          |  - Responde 200 inmediato   |
                              |  - Identifica agente        |
                              |  - Status updates -> MongoDB|
                              |  - Mensajes -> SQS          |
                              +------+----------------------+
                                     | SQS
                                     v
                              +-----------------------------+
                              |  Lambda: Message Processor  |
                              |  - Invoca motor (HTTP)      |
                              |  - Envia respuesta (Cloud   |
                              |    API de Meta)             |
                              +------+----------------------+
                                     | HTTP interno
                                     v
                              +-----------------------------+
                              |  NestJS (api-multi-bots)    |
                              |  Motor RAG / Cotizador /    |
                              |  Agendamiento              |
                              +-----------------------------+
```

### Stack tecnico

| Componente | Tecnologia | Notas |
|-----------|-----------|-------|
| Webhook Handler | AWS Lambda (TypeScript) | Handler nativo, sin framework |
| Message Processor | AWS Lambda (TypeScript) | Consumer de SQS |
| API Gateway | AWS API Gateway v2 (HTTP API) | Endpoint publico para Meta |
| Cola de mensajes | Amazon SQS (Standard) | Con DLQ para mensajes fallidos |
| Almacenamiento | MongoDB Atlas | Credenciales cifradas, mapeo canal-agente |
| Secrets | SST Secrets | App Secret, Verify Token, claves de cifrado |
| Frontend (Embedded Signup) | Facebook Login SDK (JavaScript) | Integrado en Next.js |
| Infraestructura | SST v3 (Ion/Pulumi) | Definido en `infra/src/` |

### Patrones de arquitectura

| Patron | Aplicacion |
|--------|-----------|
| Event-Driven | Webhook -> SQS -> Lambda. Desacoplamiento entre recepcion y procesamiento |
| Idempotencia | Deduplicacion por `wamid` en coleccion MongoDB con TTL. Protege contra webhooks duplicados de Meta |
| Circuit Breaker | Si el motor NestJS no responde, SQS reintenta con backoff. DLQ como fallback |
| Cache con TTL | Phone Number ID -> agentId cacheado 60s en memoria de Lambda. Fallback a MongoDB (< 5ms con indice) |
| Graceful Degradation | Si status updates fallan, no afecta el flujo principal de mensajes |
| VPC-native | Lambda Processor desplegada en VPC (misma subnet que Fargate) para conectividad directa con NestJS |

### Modelo de datos conceptual

```
+---------------------+         +-------------------------+
|      Channel        |         |        Agent            |
+---------------------+         +-------------------------+
| id                  |         | id                      |
| companyId           |    1:1  | companyId               |
| agentId        -----+-------->| type                    |
| provider: "whatsapp"|         | status                  |
| status: connected/  |         | ...                     |
|   disconnected/     |         +-------------------------+
|   requires_reconnect|
| phoneNumberId       |
| wabaId              |
| encryptedToken      |  <-- AES-256 cifrado
| displayName         |
| webhookOverrideUrl  |
| connectedAt         |
| lastHealthCheck     |
| createdAt           |
| updatedAt           |
+---------------------+

+---------------------+
|   MessageLog        |  (para status tracking)
+---------------------+
| id                  |
| channelId           |
| conversationId      |
| direction: in/out   |
| waMessageId         |  <-- ID de Meta
| content             |
| status: sent/       |
|   delivered/read/   |
|   failed            |
| errorCode           |
| errorMessage        |
| timestamp           |
| statusUpdatedAt     |
+---------------------+
```

**Notas:**
- `Channel` es entidad independiente (no embebida en Agent). Preparada para futuro multi-agente o multi-canal.
- `Channel.provider` permite distinguir canales cuando se agreguen otros (Telegram, etc.).
- `MessageLog` registra cada mensaje enviado/recibido para trazabilidad y status tracking. **TTL index de 90 dias** para auto-limpieza (MongoDB TTL nativo).
- El `encryptedToken` se descifra solo al momento de enviar mensajes. La clave de cifrado vive en SST Secrets.

```
+---------------------+
| ProcessedMessage    |  (idempotencia de webhooks)
+---------------------+
| waMessageId         |  <-- indice unico, clave primaria
| receivedAt          |
| expiresAt           |  <-- TTL index (24h)
+---------------------+
```

**Indices requeridos:**
- `Channel`: indice unico en `{ phoneNumberId }`, indice en `{ agentId }`
- `MessageLog`: indice compuesto `{ channelId, timestamp }`, indice en `{ waMessageId }`, TTL index en `{ timestamp }` (90 dias)
- `ProcessedMessage`: indice unico en `{ waMessageId }`, TTL index en `{ expiresAt }` (24h)

**Topologia de red:**
- Lambda Webhook Handler: fuera de VPC (no necesita acceso a NestJS, solo a SQS y MongoDB Atlas via internet)
- Lambda Message Processor: dentro de VPC (misma subnet que Fargate/NestJS). Provisioned concurrency para mitigar cold starts por ENI attachment.
- MongoDB Atlas: accesible via VPC Peering o PrivateLink (ya configurado en la infra existente).

### Contratos de integracion

#### Webhook Handler (lo que recibe de Meta)

Payload de mensaje entrante (simplificado):
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "PHONE_NUMBER_ID" },
        "messages": [{
          "id": "wamid.xxx",
          "from": "521234567890",
          "timestamp": "1684000000",
          "type": "text",
          "text": { "body": "Hola, quiero informacion" }
        }]
      }
    }]
  }]
}
```

#### SQS Message (lo que publica el webhook handler)

```typescript
interface IncomingMessageEvent {
  agentId: string;
  companyId: string;
  channelId: string;
  conversationId: string;
  senderPhoneNumber: string;
  messageId: string;         // wamid de Meta
  messageText: string;
  timestamp: Date;
}
```

#### Motor del Agente (lo que invoca el processor)

```typescript
// Request al motor
interface AgentProcessRequest {
  agentId: string;
  conversationId: string;
  userMessage: string;       // Texto (puede ser concatenacion de multiples mensajes)
  timestamp: Date;
}

// Response del motor
interface AgentProcessResponse {
  conversationId: string;
  messages: ResponseMessage[];
  escalated: boolean;
  escalationReason?: string;
}

interface ResponseMessage {
  type: "text";
  content: string;
}
```

#### Cloud API de Meta (lo que envia el processor)

```typescript
// POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
interface WhatsAppSendRequest {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;               // wa_id del destinatario
  type: "text";
  text: { body: string };
}
```

### Integracion con Embedded Signup

#### Frontend (Next.js)

```typescript
// Configuracion del SDK de Facebook Login
interface EmbeddedSignupConfig {
  appId: string;            // Facebook App ID
  configId: string;         // Embedded Signup config ID
  permissions: ["whatsapp_business_management", "whatsapp_business_messaging"];
}

// Response del flujo completado
interface EmbeddedSignupResponse {
  wabaId: string;
  phoneNumberId: string;
  tokenCode: string;        // Codigo intercambiable por Business Token
}
```

#### Backend (NestJS)

```typescript
// POST /api/channels/whatsapp/connect
interface ConnectWhatsAppRequest {
  agentId: string;
  wabaId: string;
  phoneNumberId: string;
  tokenCode: string;
}

// Response
interface ConnectWhatsAppResponse {
  channelId: string;
  status: "connected";
  phoneNumberId: string;
  displayName: string;
}
```


---

## 5. Acceptance Criteria

### Registro de Canal (Embedded Signup)

- [ ] El panel muestra un boton "Conectar WhatsApp" en la configuracion de canal del agente.
- [ ] Al hacer clic, se lanza el flujo de Embedded Signup de Meta (SDK de Facebook Login).
- [ ] Al completar el flujo, el backend intercambia el codigo por un Business Token via Graph API.
- [ ] El backend registra el numero en Cloud API y suscribe webhooks del WABA.
- [ ] Las credenciales (WABA ID, Phone Number ID, Business Token) se almacenan cifradas (AES-256) en MongoDB.
- [ ] Si el numero ya esta asociado a otro agente en la plataforma, se rechaza con mensaje claro.
- [ ] El estado del canal pasa a "connected" tras completar exitosamente.
- [ ] Si el usuario cancela el flujo de Meta, no se guarda nada y se muestra mensaje informativo.

### Verificacion de Webhook

- [ ] El endpoint responde correctamente al challenge de verificacion de Meta (GET con hub.verify_token).
- [ ] Se valida el verify_token contra el valor almacenado en SST Secrets antes de responder.
- [ ] Si el verify_token no coincide, responde 403.

### Recepcion de Mensajes

- [ ] La Lambda webhook completa su logica (HMAC + idempotencia + SQS) y responde 200 a Meta en menos de 5 segundos.
- [ ] Se valida la firma HMAC (X-Hub-Signature-256) de cada payload recibido contra el App Secret.
- [ ] Se identifica correctamente el agente asociado al Phone Number ID.
- [ ] Los mensajes se publican en SQS con la estructura IncomingMessageEvent.
- [ ] Mensajes a numeros sin agente asociado se descartan silenciosamente (200 a Meta).
- [ ] Mensajes a agentes inactivos o empresas en estado pending_deletion se descartan (200 a Meta).
- [ ] Firma HMAC invalida retorna 401 y registra el intento.

### Idempotencia

- [ ] Antes de publicar en SQS, se verifica en MongoDB (coleccion `processedMessages`) si el `wamid` ya fue procesado.
- [ ] Si el `wamid` ya existe, se descarta silenciosamente (no se publica en SQS).
- [ ] La coleccion `processedMessages` tiene TTL index de 24h para auto-limpieza.
- [ ] Webhooks duplicados de Meta no generan procesamiento duplicado.

### Envio de Respuestas

- [ ] El sistema envia mensajes de texto via Cloud API de Meta (POST /messages).
- [ ] Se usa el Business Token descifrado del canal correspondiente para autenticacion.
- [ ] Si el token es invalido/expirado, se marca el canal como "requires_reconnection" y se notifica a la empresa.
- [ ] Se implementa retry con backoff exponencial ante rate limiting de Meta (error 130429).
- [ ] Si la ventana de 24h expiro (error 131026), se registra como "no entregado" sin reintentar.
- [ ] Respuestas que exceden 4096 caracteres se dividen en multiples mensajes.
- [ ] Multiples mensajes de respuesta se envian secuencialmente con delay de 1-2 segundos.

### Status Updates

- [ ] Se procesan webhooks de status (sent, delivered, read, failed).
- [ ] Se actualiza el estado del mensaje en MessageLog.
- [ ] Mensajes con status "failed" se registran con el codigo y mensaje de error de Meta.
- [ ] Status updates de message IDs desconocidos se descartan silenciosamente.

### Desconexion de Canal

- [ ] El usuario puede desconectar un numero desde el panel con confirmacion.
- [ ] Se elimina la suscripcion de webhooks del WABA via Graph API.
- [ ] Se eliminan las credenciales almacenadas de MongoDB.
- [ ] El estado del canal pasa a "disconnected".
- [ ] El agente pasa a estado "borrador" tras desconexion.

### Reconexion de Canal

- [ ] Cuando el canal esta en "requires_reconnection", el panel muestra aviso y boton "Reconectar".
- [ ] Al reconectar, se actualiza el token del Channel existente (no se crea uno nuevo).
- [ ] Si el phoneNumberId retornado no coincide con el registrado, se rechaza.
- [ ] Tras reconexion exitosa, el canal vuelve a estado "connected".

### Resiliencia

- [ ] Mensajes que fallan en procesamiento van a DLQ despues de 3 reintentos.
- [ ] Si el motor NestJS no responde, SQS reintenta con backoff exponencial.
- [ ] Health check periodico valida que los tokens de WhatsApp siguen activos.
- [ ] Canales con token invalido se marcan automaticamente como "requires_reconnection".

---

## 6. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es falso |
|---|----------|---------------------|
| 1 | La app de Meta pasa App Review para Embedded Signup en tiempo razonable (1-2 semanas) | Se usa el mecanismo manual de credenciales para dev/testing mientras tanto |
| 2 | El Motor RAG (NestJS) esta disponible via HTTP cuando la Lambda Processor lo invoca | SQS reintenta con backoff. DLQ como fallback. Alarma notifica al equipo |
| 3 | MongoDB Atlas soporta el volumen de escrituras de mensajes entrantes sin degradacion | TTL de 90 dias en MessageLog limita el crecimiento. Evaluar tier de Atlas si crece |
| 4 | El Business Token de Embedded Signup no expira frecuentemente | Health check periodico detecta expiracion. Notificacion proactiva a la empresa |
| 5 | El throughput de 80 msg/s por numero es suficiente para el volumen inicial | Si no, solicitar upgrade a Meta o distribuir carga entre numeros |
| 6 | Lambda en VPC tiene cold start aceptable (< 3s) con provisioned concurrency | Si no, evaluar API Gateway privado + VPC Link como alternativa |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigacion |
|---|--------|-------------|---------|------------|
| 1 | Token de WhatsApp expira y el canal deja de funcionar sin que la empresa lo note | Media | Alto | Health check periodico (cada 6h) + alarma DLQ + notificacion panel + email |
| 2 | Meta cambia la API o depreca Embedded Signup v2 (deadline Oct 2026) | Media | Alto | Implementar directamente con v4. Monitorear changelog de Meta |
| 3 | Cold start de Lambda en VPC agrega latencia perceptible | Media | Medio | Provisioned concurrency. PoC obligatoria pre-lanzamiento para medir P95 |
| 4 | Webhooks duplicados de Meta causan procesamiento duplicado | Media | Alto | Idempotencia por `wamid` en coleccion MongoDB con TTL |
| 5 | Limite de onboarding de Embedded Signup (10 empresas/semana sin verificacion) | Alta | Alto | Completar Business Verification + App Review para subir a 200/semana |
| 6 | MessageLog crece exponencialmente y degrada MongoDB | Media | Medio | TTL index de 90 dias. Indices compuestos optimizados. Monitoreo de tamano |
| 7 | Cache de mapeo se desincronizan al reconectar canal | Baja | Alto | TTL de 60s en cache. Peor caso: 60s de mensajes al agente incorrecto |

### Interfaces asumidas con soluciones no disenadas

| Solucion | Interface asumida | Riesgo |
|----------|------------------|--------|
| 2 - Motor RAG | Expone endpoint `POST /internal/agents/{agentId}/process` con el contrato AgentProcessRequest/Response. Soporta input concatenado (multiples mensajes). | Si el endpoint difiere, adaptar el processor |
| 3 - Motor Cotizador | Mismo contrato que Motor RAG (AgentProcessRequest/Response) | Si requiere datos adicionales, extender el contrato |
| 4 - Motor Agendamiento | Mismo contrato que Motor RAG (AgentProcessRequest/Response) | Si requiere datos adicionales, extender el contrato |
| 7 - Memoria Conversacional | El conector crea/identifica conversaciones por (agentId + senderPhoneNumber). La memoria gestiona el historial internamente. | Si la memoria requiere que el conector pase historial, ajustar |
| 8 - Escalamiento | Cuando una conversacion esta escalada, el conector debe entregar mensajes al inbox en vez del motor. Asume campo `conversation.status === "escalated"` | Si el mecanismo difiere, adaptar el routing |
| 9 - Mensajes Proactivos | Esta solucion NO envia mensajes proactivos. La solucion #9 usara el conector como canal de salida (invocando la misma Cloud API con templates). | Si #9 necesita un endpoint dedicado del conector, agregarlo |
