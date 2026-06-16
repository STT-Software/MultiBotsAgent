---
taxonomy: solution
key: gestion-integraciones-externas
solution: Gestión de Integraciones Externas
initiative: ../../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Antigravity (IA)
created: 2026-06-16
updated: 2026-06-16
version: "1.0.0"
status: drafting
language: es
changelog:
  - date: 2026-06-16
    author: Antigravity (IA)
    change: "Creación inicial del documento de solución — Gestión de Integraciones Externas"
---

# Gestión de Integraciones Externas

## 1. Overview

### Contexto

La Gestión de Integraciones Externas es la solución #13 del Solution Map de la iniciativa
"Plataforma de Agentes Conversacionales". Es la capa de conectividad entre la plataforma y
los servicios externos de terceros que los agentes necesitan para operar: fuentes de
conocimiento (Google Drive, Notion, Confluence, SharePoint, Dropbox) y servicios de
calendario (Google Calendar).

### Relación con la iniciativa

Esta solución cubre las capacidades definidas en la Fase 2:
- Conexión con Google Drive, Notion, Confluence, SharePoint y Dropbox para la Base de
  Conocimiento (SOL-06)
- Integración con Google Calendar para el Agente de Agendamiento (SOL-04)
- Credenciales simples, conexión automática — sin configuración técnica para el usuario

### Resumen ejecutivo técnico

Capa de integración OAuth 2.0 centralizada. Cada integración sigue el mismo patrón:
flujo de autorización delegada (OAuth), almacenamiento seguro de tokens cifrados, refresco
automático de credenciales, y adaptadores por proveedor que exponen una interfaz uniforme
hacia los consumidores internos. El Sistema de Base de Conocimiento (SOL-06) consume los
adaptadores de fuentes documentales. El Motor de Agente de Agendamiento (SOL-04) consume
el adaptador de Google Calendar.

### Dependencias

| Solución | Relación |
|----------|----------|
| 1 - Panel de Administración Web | UI donde el usuario conecta y desconecta integraciones |
| 14 - Gestión de Empresas y Acceso | Provee contexto de empresa para asociar credenciales |
| 6 - Sistema de Base de Conocimiento | Consumidor de adaptadores documentales (Drive, Notion, etc.) |
| 4 - Motor de Agente Agendamiento | Consumidor del adaptador de Google Calendar |

### Decisiones clave

| Aspecto | Decisión |
|---------|----------|
| Protocolo de autorización | OAuth 2.0 (Authorization Code Flow) para todos los proveedores |
| Almacenamiento de tokens | MongoDB, cifrado AES-256, nunca expuesto al frontend |
| Refresco de tokens | Automático y transparente para los consumidores |
| Abstracción | Interfaz uniforme por categoría (DocumentSource, CalendarSource) |
| Calendarios soportados | Solo Google Calendar en MVP |
| Fuentes documentales | Google Drive, Notion, Confluence, SharePoint, Dropbox |

---

## 2. Solution Narrative

### 2.1 Conexión de una Integración (OAuth Flow)

- **Trigger:** El usuario navega a la sección de integraciones dentro de la configuración
  de su agente o empresa en el panel y hace clic en "Conectar" sobre uno de los proveedores
  disponibles (ej. Google Drive, Notion, etc.).

- **Comportamiento:**
  1. El backend genera un `state` firmado (JWT de corta vida) que contiene: empresaId,
     agentId (si aplica), proveedor, y timestamp. Lo almacena temporalmente en MongoDB
     con TTL de 10 minutos.
  2. El backend construye la URL de autorización del proveedor correspondiente con los
     scopes requeridos y el `state` generado, y la retorna al frontend.
  3. El frontend redirige al usuario a la URL del proveedor (ventana nueva o redirect).
  4. El usuario se autentica en el proveedor y concede los permisos solicitados.
  5. El proveedor redirige al callback de la plataforma con un `code` y el `state` original.
  6. El backend valida el `state` (firma + TTL). Si es inválido o expiró, rechaza el flujo.
  7. El backend intercambia el `code` por `access_token` + `refresh_token` via API del
     proveedor (server-to-server).
  8. El backend almacena los tokens cifrados (AES-256) en la entidad `Integration` en
     MongoDB, asociada a la empresa y al proveedor.
  9. El backend marca la integración como `connected` y registra metadata del proveedor
     (nombre de cuenta, email, workspace name según el proveedor).
  10. El frontend recibe confirmación y muestra el estado "Conectado" con el nombre de
      cuenta vinculada.

- **Resultado:** La integración queda activa y disponible para los consumidores internos
  (SOL-06, SOL-04). El usuario ve el nombre de la cuenta conectada en el panel.

- **Error path:**
  - `state` inválido o expirado al recibir el callback: se rechaza, se muestra al usuario
    "El proceso expiró, intenta de nuevo". No se almacena nada.
  - El usuario cancela el flujo en el proveedor: el proveedor retorna `error=access_denied`.
    El backend detecta el parámetro, no almacena nada, notifica al frontend con mensaje
    informativo.
  - El intercambio de `code` por token falla (código inválido, expirado): se notifica al
    usuario que reintente. No se almacena nada.
  - El proveedor retorna scopes insuficientes (usuario desmarcó permisos críticos): la
    integración se marca como `insufficient_scopes` y se indica al usuario qué permisos
    son requeridos.

- **Decisiones de diseño:**
  - Se usa Authorization Code Flow (no Client Credentials ni Implicit) porque la autorización
    es delegada: el usuario concede acceso a sus propios recursos.
  - El `state` se firma para prevenir CSRF. No se usa una cadena aleatoria simple porque
    necesita cargar contexto (empresa, agente, proveedor) sin almacenamiento de sesión
    en el servidor.
  - El callback es un endpoint único (`/integrations/oauth/callback`) que determina el
    proveedor desde el `state`, no desde la URL. Esto simplifica la configuración de
    redirect URIs en cada proveedor.

### 2.2 Refresco Automático de Tokens

- **Trigger:** Un consumidor interno (SOL-06 o SOL-04) solicita un `access_token` válido
  para una integración específica.

- **Comportamiento:**
  1. El consumidor llama al servicio de integraciones con: `companyId` + `provider`
     (+ `agentId` si aplica).
  2. El servicio recupera la entidad `Integration` de MongoDB y descifra los tokens.
  3. Verifica si el `access_token` está próximo a expirar (menos de 5 minutos de vida
     restante) o ya expiró.
  4. Si el token sigue vigente: lo retorna al consumidor directamente.
  5. Si el token expiró o está por expirar:
     a. Usa el `refresh_token` para solicitar un nuevo `access_token` al proveedor.
     b. Actualiza la entidad `Integration` con el nuevo `access_token` (y `refresh_token`
        si el proveedor retorna uno nuevo).
     c. Retorna el nuevo `access_token` al consumidor.

- **Resultado:** El consumidor recibe siempre un token válido sin necesidad de conocer la
  lógica de expiración.

- **Error path:**
  - El `refresh_token` fue revocado por el usuario (el usuario desconectó la app en el
    panel del proveedor): el proveedor retorna error `invalid_grant`. El servicio marca la
    integración como `requires_reconnection` en MongoDB y notifica a la empresa (vía
    SOL-10). El consumidor recibe un error controlado indicando que la integración no está
    disponible.
  - El `refresh_token` expiró (algunos proveedores tienen refresh tokens con vida limitada
    si la app no está verificada): mismo tratamiento que revocación.
  - El proveedor no está disponible (timeout): el servicio retorna error al consumidor. El
    consumidor decide si reintenta o falla de forma controlada.

- **Decisiones de diseño:**
  - El refresco es transparente para los consumidores. Ellos solo solicitan "dame el token
    de esta integración" — no saben si se refrescó o no.
  - Se refresca proactivamente cuando quedan menos de 5 minutos (no reactivamente al 401),
    para evitar fallos en operaciones largas como la indexación de documentos.

### 2.3 Consumo del Adaptador Documental (fuentes de conocimiento)

- **Trigger:** El Sistema de Base de Conocimiento (SOL-06) necesita listar o extraer
  contenido de una fuente externa (Google Drive, Notion, Confluence, SharePoint, Dropbox)
  para indexación.

- **Comportamiento:**
  1. SOL-06 invoca al adaptador del proveedor correspondiente pasando: `integrationId`,
     operación solicitada (`list` o `fetch`), y parámetros de la operación (ej. folderId,
     pageId, fileId).
  2. El adaptador solicita al servicio de tokens el `access_token` válido (flujo 2.2).
  3. El adaptador traduce la operación genérica a la llamada API específica del proveedor:
     - **Google Drive:** `GET /drive/v3/files` (listar) o `GET /drive/v3/files/{id}/export`
       (exportar a texto).
     - **Notion:** `POST /v1/search` (listar) o `GET /v1/blocks/{id}/children` (extraer).
     - **Confluence:** `GET /wiki/rest/api/space/{key}/content` (listar) o
       `GET /wiki/rest/api/content/{id}?expand=body.storage` (extraer).
     - **SharePoint:** `GET /sites/{site}/drive/items/{item-id}/children` (listar) o
       `GET /sites/{site}/drive/items/{item-id}/content` (extraer).
     - **Dropbox:** `POST /files/list_folder` (listar) o `POST /files/download` (extraer).
  4. El adaptador normaliza la respuesta a la interfaz `DocumentItem` uniforme (id, nombre,
     tipo, contenido en texto plano, metadata, timestamps).
  5. Retorna el resultado normalizado a SOL-06.

- **Resultado:** SOL-06 recibe contenido normalizado independientemente del proveedor.
  No necesita conocer los detalles de la API de cada servicio externo.

- **Error path:**
  - Token inválido o expirado durante la llamada (401 del proveedor): el adaptador intenta
    un refresco de emergencia (una vez). Si persiste, retorna error al consumidor.
  - Rate limit del proveedor (429): el adaptador reintenta con backoff exponencial (hasta 3
    intentos). Si persiste, retorna error con indicación de reintento posterior.
  - Recurso no encontrado (404): el adaptador retorna error controlado indicando que el
    archivo/página ya no existe en la fuente. SOL-06 decide si eliminar el documento del
    índice.
  - Proveedor no disponible (timeout / 5xx): el adaptador retorna error. SOL-06 reintenta
    en el próximo ciclo de sincronización.

- **Decisiones de diseño:**
  - Cada proveedor tiene su propio adaptador (clase/módulo separado), pero todos implementan
    la misma interfaz `DocumentSourceAdapter`. Esto permite agregar nuevos proveedores sin
    modificar SOL-06.
  - La normalización a `DocumentItem` incluye el contenido en texto plano (no HTML, no
    Markdown de terceros). La conversión de formato es responsabilidad del adaptador.
  - El adaptador no cachea contenido — SOL-06 decide su estrategia de caché e indexación.

### 2.4 Consumo del Adaptador de Calendario (Google Calendar)

- **Trigger:** El Motor de Agente de Agendamiento (SOL-04) necesita consultar disponibilidad
  o crear/modificar/cancelar un evento en el calendario de la empresa.

- **Comportamiento:**
  1. SOL-04 invoca al adaptador de Google Calendar pasando: `integrationId`, operación
     (`checkAvailability`, `createEvent`, `updateEvent`, `cancelEvent`), y parámetros.
  2. El adaptador solicita al servicio de tokens el `access_token` válido (flujo 2.2).
  3. El adaptador traduce la operación a la llamada API de Google Calendar:
     - `checkAvailability`: `POST /calendar/v3/freeBusy` con el rango de tiempo y el
       calendarId configurado.
     - `createEvent`: `POST /calendar/v3/calendars/{calendarId}/events` con los datos del
       evento (título, inicio, fin, descripción, attendees si aplica).
     - `updateEvent`: `PUT /calendar/v3/calendars/{calendarId}/events/{eventId}` con los
       campos a modificar.
     - `cancelEvent`: `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}` o
       actualización de status a `cancelled`.
  4. El adaptador normaliza la respuesta a la interfaz `CalendarEvent` uniforme (eventId,
     title, start, end, status, meetLink si aplica).
  5. Retorna el resultado normalizado a SOL-04.

- **Resultado:** SOL-04 puede verificar disponibilidad y gestionar eventos sin acoplarse a
  la API específica de Google Calendar. Preparado para futuros proveedores de calendario.

- **Error path:**
  - Slot no disponible (el rango consultado ya tiene eventos): el adaptador retorna
    `available: false` con los slots libres más próximos. SOL-04 los presenta al usuario.
  - Evento no encontrado al intentar modificar/cancelar (404): retorna error controlado.
    SOL-04 marca la cita como "no encontrada en calendario" y notifica al usuario.
  - Token inválido o expirado: mismo manejo que flujo 2.3.
  - Rate limit de Google Calendar API (429): reintento con backoff exponencial.

- **Decisiones de diseño:**
  - Solo Google Calendar en MVP. La interfaz `CalendarSourceAdapter` está definida para
    soportar futuros proveedores (Outlook Calendar, Calendly, etc.) sin modificar SOL-04.
  - El calendarId a usar (primary vs. un calendario específico) es parte de la configuración
    de la integración, no un parámetro en cada llamada. El usuario lo configura al conectar.
  - El adaptador no conoce las reglas de negocio de disponibilidad (duración de slots,
    días laborales, horarios). Esas reglas viven en SOL-04. El adaptador solo ejecuta las
    consultas al calendario.

### 2.5 Desconexión de una Integración

- **Trigger:** El usuario hace clic en "Desconectar" sobre una integración activa en el
  panel de configuración.

- **Comportamiento:**
  1. El sistema solicita confirmación ("¿Estás seguro? Los agentes que usan esta integración
     perderán acceso a esa fuente de datos").
  2. El usuario confirma.
  3. El backend revoca el token en el proveedor si el proveedor expone un endpoint de
     revocación (Google sí; otros proveedores varían).
  4. El backend elimina los tokens cifrados de MongoDB y marca la integración como
     `disconnected`.
  5. Los consumidores internos que intenten usar la integración recibirán error controlado
     indicando que la integración no está disponible.
  6. SOL-06 es notificado (o detecta en el próximo ciclo) que la fuente ya no está
     disponible y puede pausar la sincronización de esa fuente.

- **Resultado:** La integración queda desactivada. Los tokens son eliminados. El usuario
  puede reconectar la integración en cualquier momento.

- **Error path:**
  - Si la revocación en el proveedor falla (timeout o no soportada): se procede igualmente
    con la limpieza local. El token queda huérfano en el proveedor pero no puede usarse
    desde la plataforma.

### 2.6 Listado y Estado de Integraciones

- **Trigger:** El usuario navega a la sección de integraciones en el panel para ver qué
  servicios tiene conectados y cuáles están disponibles para conectar.

- **Comportamiento:**
  1. El backend retorna la lista de proveedores soportados por categoría (fuentes
     documentales / calendario).
  2. Para cada proveedor, indica el estado actual: `connected` (con nombre de cuenta
     vinculada), `requires_reconnection`, `disconnected`, o `insufficient_scopes`.
  3. El frontend muestra la lista con botones de acción contextuales (Conectar / Reconectar
     / Desconectar).

- **Resultado:** El usuario tiene visibilidad completa de qué integraciones están activas y
  cuáles requieren atención, sin ver tokens ni información sensible.

- **Error path:**
  - No aplican errores críticos en este flujo. Si MongoDB falla, se retorna lista vacía con
    mensaje de error genérico.

---

## 3. Out of Scope

Esta solución **NO** cubre:

- **Indexación de documentos:** La transformación del contenido descargado en vectores o
  chunks para RAG es responsabilidad exclusiva de SOL-06. Esta solución solo entrega el
  contenido crudo normalizado.
- **Lógica de disponibilidad del agendamiento:** Las reglas de negocio (duración de slots,
  horarios configurados, días laborales) son responsabilidad de SOL-04. Esta solución solo
  ejecuta operaciones en el calendario.
- **Calendarios distintos a Google Calendar:** Outlook Calendar, Calendly, Calendars.app y
  otros están fuera del MVP. La interfaz está preparada pero no se implementan.
- **Webhooks entrantes de terceros:** Esta solución no suscribe ni procesa notificaciones
  push de los proveedores (ej. cambios en tiempo real en Google Drive o Google Calendar).
  La sincronización es pull (periódica), no push.
- **Sincronización bidireccional:** Esta solución solo lee de las fuentes documentales.
  No escribe ni modifica documentos en Google Drive, Notion, etc.
- **Gestión de apps en portales de desarrolladores:** El registro de la app en Google
  Cloud Console, Notion Developers, etc. es un proceso operativo/administrativo, no una
  funcionalidad de la plataforma.
- **Notificación de tokens expirados:** La notificación al usuario cuando una integración
  requiere reconexión es responsabilidad de SOL-10 (Sistema de Notificaciones).
- **Dropbox Business / versiones enterprise:** Solo Dropbox personal/teams estándar con
  OAuth. Las integraciones enterprise (SSO corporativo) están fuera de alcance.
- **Permisos granulares por agente:** Una integración conectada está disponible para todos
  los agentes de la empresa. El control granular por agente es fuera de alcance inicial.

---

## 4. Technical Context

### Arquitectura

```
FLUJO DE CONEXIÓN (OAuth):

Panel Web (Next.js)
    │  1. Click "Conectar"
    v
NestJS API ──genera state JWT──> MongoDB (state TTL 10min)
    │  2. Retorna URL de autorización
    v
Proveedor OAuth (Google, Notion, etc.)
    │  3. Usuario autoriza
    v
NestJS API /integrations/oauth/callback
    │  4. Valida state, intercambia code por tokens
    │  5. Almacena tokens cifrados en MongoDB
    v
MongoDB Atlas (entidad Integration)

FLUJO DE CONSUMO (SOL-06 / SOL-04):

SOL-06 o SOL-04
    │  1. getValidToken(companyId, provider)
    v
IntegrationService (NestJS)
    │  2. Lee Integration de MongoDB
    │  3. Verifica expiración
    │  4. Refresca si necesario
    │  5. Retorna access_token descifrado
    v
Adaptador del proveedor (Google Drive, Calendar, etc.)
    │  6. Llamada API al proveedor externo
    │  7. Normaliza respuesta
    v
SOL-06 / SOL-04 reciben DocumentItem[] / CalendarEvent
```

### Stack técnico

| Componente | Tecnología | Notas |
|-----------|-----------|-------|
| API de integraciones | NestJS (TypeScript) | Módulo `IntegrationsModule` dentro de api-multi-bots |
| Almacenamiento de tokens | MongoDB Atlas | Colección `integrations`. Tokens cifrados AES-256 |
| Cifrado de tokens | AES-256-GCM | Clave en SST Secrets. Nunca en código |
| OAuth flow | NestJS + redirect | Callback único `/integrations/oauth/callback` |
| State JWT | jsonwebtoken (HS256) | TTL 10 min. Almacenado en MongoDB para validación |
| Adaptadores documentales | Clases TypeScript por proveedor | Implementan `DocumentSourceAdapter` |
| Adaptador calendario | Clase TypeScript | Implementa `CalendarSourceAdapter` |
| Infraestructura | SST v3 (Ion/Pulumi) | Sin servicios adicionales — corre en Fargate existente |

### Patrones de arquitectura

| Patrón | Aplicación |
|--------|-----------|
| Adapter Pattern | Un adaptador por proveedor. Interfaz uniforme para consumidores |
| Facade | `IntegrationService` como fachada única para tokens y adaptadores |
| Token Refresh transparente | Los consumidores no gestionan expiración |
| CSRF Protection | `state` JWT firmado en OAuth flow |
| Secrets Management | Tokens nunca en logs, nunca en responses al frontend |

### Modelo de datos conceptual

```
+---------------------------+
|       Integration         |
+---------------------------+
| id                        |
| companyId                 |
| provider: google_drive /  |
|   notion / confluence /   |
|   sharepoint / dropbox /  |
|   google_calendar         |
| category: document_source |
|           | calendar      |
| status: connected /       |
|   disconnected /          |
|   requires_reconnection / |
|   insufficient_scopes     |
| encryptedAccessToken      |  <-- AES-256-GCM cifrado
| encryptedRefreshToken     |  <-- AES-256-GCM cifrado
| tokenExpiresAt            |
| scopes: string[]          |
| accountDisplayName        |  (email / workspace name)
| providerAccountId         |  (ID del usuario en el proveedor)
| calendarId                |  (solo para google_calendar)
| connectedAt               |
| lastUsedAt                |
| createdAt                 |
| updatedAt                 |
+---------------------------+

+---------------------------+
|       OAuthState          |  (TTL 10 min — anti-CSRF)
+---------------------------+
| id (= state JWT jti)      |
| companyId                 |
| agentId (opcional)        |
| provider                  |
| expiresAt                 |  <-- TTL index MongoDB
| used: boolean             |
+---------------------------+
```

**Índices requeridos:**
- `Integration`: índice único en `{ companyId, provider }`, índice en `{ companyId }`,
  índice en `{ status }` (para encontrar integraciones que requieren reconexión)
- `OAuthState`: índice único en `{ id }`, TTL index en `{ expiresAt }` (10 min)

### Contratos de integración

#### Interfaz DocumentSourceAdapter (consumida por SOL-06)

```typescript
interface DocumentSourceAdapter {
  listItems(params: ListParams): Promise<DocumentItem[]>;
  fetchContent(itemId: string): Promise<DocumentContent>;
}

interface DocumentItem {
  id: string;
  name: string;
  type: "file" | "folder" | "page" | "database";
  mimeType?: string;
  lastModified: Date;
  url?: string;
}

interface DocumentContent {
  id: string;
  name: string;
  textContent: string;   // Contenido en texto plano, sin HTML ni Markdown
  lastModified: Date;
}
```

#### Interfaz CalendarSourceAdapter (consumida por SOL-04)

```typescript
interface CalendarSourceAdapter {
  checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult>;
  createEvent(params: CreateEventParams): Promise<CalendarEvent>;
  updateEvent(eventId: string, params: UpdateEventParams): Promise<CalendarEvent>;
  cancelEvent(eventId: string): Promise<void>;
}

interface AvailabilityParams {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

interface AvailabilityResult {
  available: boolean;
  freeSlots: TimeSlot[];     // Slots libres en el rango consultado
}

interface CalendarEvent {
  eventId: string;
  title: string;
  start: Date;
  end: Date;
  status: "confirmed" | "cancelled" | "tentative";
  meetLink?: string;
}
```

#### API REST expuesta al Panel Web

```typescript
// GET /integrations — lista todas las integraciones de la empresa
// Response: IntegrationSummary[] (sin tokens)

// GET /integrations/oauth/authorize?provider=google_drive
// Response: { authorizationUrl: string }

// GET /integrations/oauth/callback?code=...&state=...
// (Procesado server-side, redirige al panel con resultado)

// DELETE /integrations/:integrationId — desconecta una integración
// Response: { success: boolean }
```

---

## 5. Acceptance Criteria

### Conexión OAuth

- [ ] El usuario puede iniciar el flujo de conexión de cualquier proveedor soportado desde
  el panel sin configuración técnica adicional.
- [ ] El flujo de autorización redirige correctamente al proveedor con los scopes requeridos.
- [ ] Al completar el flujo, los tokens se almacenan cifrados (AES-256-GCM) en MongoDB.
- [ ] El panel muestra el nombre de la cuenta conectada (email o workspace) tras una
  conexión exitosa.
- [ ] Si el usuario cancela el flujo, no se almacena ningún dato y el panel muestra mensaje
  informativo.
- [ ] Si el proveedor retorna scopes insuficientes, la integración se marca como
  `insufficient_scopes` con indicación de los permisos faltantes.
- [ ] El `state` OAuth expira en 10 minutos. Un callback con state expirado es rechazado.
- [ ] Los tokens nunca se exponen en respuestas al frontend ni en logs de aplicación.

### Refresco de Tokens

- [ ] El `access_token` se refresca automáticamente cuando quedan menos de 5 minutos de
  vida, sin intervención del usuario ni del consumidor.
- [ ] Si el `refresh_token` es revocado, la integración se marca como
  `requires_reconnection` y se desencadena una notificación al usuario (vía SOL-10).
- [ ] Los consumidores internos (SOL-06, SOL-04) reciben siempre un token válido o un
  error controlado — nunca un token expirado.

### Adaptadores Documentales

- [ ] SOL-06 puede listar ítems de cualquier fuente documental conectada usando la misma
  interfaz `DocumentSourceAdapter`.
- [ ] SOL-06 puede obtener el contenido de un documento como texto plano normalizado.
- [ ] Si un recurso ya no existe en la fuente (404), el adaptador retorna error controlado
  que SOL-06 puede interpretar para limpiar su índice.
- [ ] Rate limits de proveedores (429) se manejan con backoff exponencial, hasta 3 intentos.

### Adaptador de Google Calendar

- [ ] SOL-04 puede verificar disponibilidad en el calendario configurado para un rango y
  duración dados.
- [ ] SOL-04 puede crear, modificar y cancelar eventos en Google Calendar.
- [ ] La respuesta de disponibilidad incluye los slots libres disponibles en el rango
  consultado.
- [ ] El `calendarId` a usar se configura al conectar la integración, no en cada operación.

### Desconexión

- [ ] El usuario puede desconectar cualquier integración desde el panel con confirmación
  previa.
- [ ] Tras desconectar, los tokens son eliminados de MongoDB.
- [ ] Los consumidores que intenten usar una integración desconectada reciben un error
  controlado, no una excepción inesperada.

### Listado y visibilidad

- [ ] El panel muestra todos los proveedores soportados con su estado actual (connected /
  requires_reconnection / disconnected).
- [ ] Las integraciones en estado `requires_reconnection` muestran un aviso visible con
  opción de reconectar.

---

## 6. Risks & Assumptions

### Supuestos técnicos

| # | Supuesto | Impacto si es incorrecto |
|---|---------|--------------------------|
| A1 | Todos los proveedores soportan OAuth 2.0 Authorization Code Flow con `refresh_token` de larga duración. | Si algún proveedor no emite refresh tokens (ej. tokens de corta vida sin refresco), el usuario tendría que reconectar frecuentemente. Requiere investigar por proveedor. |
| A2 | La App de Google (Google Cloud Console) puede pedir scopes de Google Drive y Google Calendar en la misma app OAuth. | Si Google obliga a apps separadas, se duplica la lógica de conexión. A validar durante configuración de la app. |
| A3 | Notion, Confluence, SharePoint y Dropbox no requieren verificación de app para desarrollo y testing iniciales. | Si requieren verificación previa, bloquea el desarrollo hasta completar el proceso. Requiere investigar los requisitos de cada proveedor temprano. |
| A4 | El volumen de integraciones por empresa es bajo (< 10 integraciones activas simultáneas). | Si el volumen escala, la lectura de MongoDB por cada operación podría requerir caché de tokens en memoria (TTL corto). No se anticipa para MVP. |

### Supuestos de negocio

| # | Supuesto | Impacto si es incorrecto |
|---|---------|--------------------------|
| B1 | Una integración es por empresa, no por agente. Todos los agentes de una empresa comparten las integraciones conectadas. | Si se necesita aislamiento por agente, el modelo de datos y la lógica de autorización deben extenderse. |
| B2 | El usuario que conecta una integración tiene los permisos necesarios en el proveedor para los recursos que los agentes necesitan (ej. acceso a la carpeta de Drive correcta). | Si el usuario conecta con una cuenta de bajo privilegio, los agentes no podrán acceder a los recursos. La plataforma no puede detectar esto preventivamente — solo en tiempo de uso. |

### Riesgos identificados

| # | Riesgo | Probabilidad | Mitigación |
|---|--------|-------------|------------|
| R1 | Google revoca tokens de apps no verificadas (en producción, fuera de usuarios de prueba). | Alta | La app de Google debe pasar el proceso de verificación de OAuth antes del lanzamiento. Planificar tiempo para el proceso (puede tardar semanas). |
| R2 | Confluence y SharePoint tienen autenticación más compleja (Confluence Cloud vs. Server, SharePoint Online vs. On-Premises). | Media | Iniciar solo con versiones Cloud (Confluence Cloud, SharePoint Online vía Microsoft Graph). Las versiones on-premises quedan fuera de alcance explícitamente. |
| R3 | Dropbox no siempre emite `refresh_token` en el Authorization Code Flow estándar — requiere `token_access_type=offline`. | Alta | Asegurarse de incluir `token_access_type=offline` en el scope request de Dropbox. Punto a validar en implementación. |
| R4 | Los rate limits de los proveedores documentales (especialmente durante indexación masiva en SOL-06) pueden generar throttling frecuente. | Media | El backoff exponencial mitiga el riesgo. Para indexaciones grandes, SOL-06 debe distribuir las llamadas en el tiempo. No es responsabilidad de esta solución, pero debe comunicarse como restricción a SOL-06. |

### Interfaces asumidas con soluciones no diseñadas aún

| Solución | Interfaz asumida |
|----------|-----------------|
| SOL-06 (Base de Conocimiento) | Consume `DocumentSourceAdapter` con métodos `listItems` y `fetchContent`. Cuando SOL-06 se diseñe, validar que la interfaz definida aquí sea suficiente. |
| SOL-04 (Motor de Agendamiento) | Consume `CalendarSourceAdapter` con métodos `checkAvailability`, `createEvent`, `updateEvent`, `cancelEvent`. Cuando SOL-04 se diseñe, validar que los parámetros y retornos definidos aquí sean suficientes. |
| SOL-10 (Notificaciones) | Al marcar una integración como `requires_reconnection`, esta solución desencadena una notificación. Se asume que SOL-10 expone un método de notificación interna que recibe `{ companyId, type: "integration_requires_reconnection", payload }`. |
