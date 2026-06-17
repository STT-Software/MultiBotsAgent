---
taxonomy: solution
key: sistema-notificaciones
solution: Sistema de Notificaciones
initiative: ../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: jquinto
created: 2026-06-11
updated: 2026-06-11
version: "1.0.0"
status: approved
language: es
changelog:
  - date: 2026-06-11
    author: jquinto
    change: "Implementación completa de notificaciones de reservas — WebSocket en tiempo real para operadores y encolado de emails de estado (confirmación, reprogramación, cancelación) para clientes y alertas de nuevas citas para operadores."
  - date: 2026-06-11
    author: jquinto
    change: "Creación inicial — Diseño detallado de la solución de notificaciones transversales, WebSocket en tiempo real y encolado de correos."
---

# Sistema de Notificaciones

## 1. Overview

El **Sistema de Notificaciones (SL10)** es la solución transversal encargada de alertar a las empresas (operadores) y usuarios finales sobre eventos críticos dentro de la plataforma conversacional.

Esta solución abarca dos casos de uso críticos:
1. **Escalamiento a humano:** Notificar a los operadores de la empresa en tiempo real cuando una conversación activa requiere derivación por parte de un agente de IA.
2. **Gestión de reservas (Bookings):** 
   - Notificar en tiempo real (WebSocket) y por correo electrónico a los operadores de la empresa al crearse una nueva reserva.
   - Notificar por correo electrónico al cliente final sobre la confirmación (`booking_confirmed`), reprogramación (`booking_rescheduled`) y cancelación (`booking_cancelled`) de su cita.

Esta solución se compone de:
- La transmisión en tiempo real de alertas visuales en el panel web de administración mediante **WebSockets** seguros.
- El encolado asíncrono de alertas por correo electrónico en la base de datos (`emailQueue`) para su procesamiento a través del worker cron.
- La abstracción del canal de notificaciones en el Core del negocio para garantizar un diseño desacoplado de transportes técnicos (Clean Architecture).

**Relación con otras soluciones:**
- Consumido por **[8] Sistema de Escalamiento a Humano** para disparar alertas cuando una conversación pasa a estado `escalated`.
- Consumido por el **[4] Motor de Agendamiento (Bookings)** para disparar alertas de reservas ante creaciones, reprogramaciones y cancelaciones.
- Depende de la base de datos centralizada (`emailQueue`) y del worker cron de correos para el despacho asíncrono de alertas de correo.

---

## 2. Solution Narrative

### 2.1 Emisión en Tiempo Real (WebSockets)

- **Trigger:** El motor RAG o el conector conversacional determina que una conversación debe ser derivada a un operador humano.
- **Comportamiento:** 
  1. El sistema invoca al servicio de notificaciones proporcionando el identificador del negocio (`companyId`), de la conversación (`conversationId`) y el motivo del escalamiento.
  2. A través de un Gateway seguro (`/notifications`), se envía una señal WebSocket (`notification.new`) dirigida de forma exclusiva a la sala (room) del negocio: `company:<companyId>`.
  3. Los navegadores de los operadores conectados a la plataforma que pertenecen a dicha empresa reciben la alerta en tiempo real.
- **Resultado:** La campana reactiva del frontend (`NotificationBell`) incrementa su contador al instante de manera visual sin requerir recargar la pantalla.

---

### 2.2 Alertas por Correo Electrónico (Encolado)

- **Trigger:** Una derivación es registrada en el sistema.
- **Comportamiento:**
  1. El servicio consulta el repositorio de usuarios para recuperar las direcciones de correo electrónico de todos los operadores registrados y activos pertenecientes a la empresa afectada (`findOperatorsByCompany`).
  2. Para cada operador, se inserta un documento en la colección `emailQueue` con el template `escalation_alert`, la dirección de destino y las variables necesarias (nombre de usuario, ID de conversación, motivo, y enlace directo al chat en el panel).
  3. El worker cron del backend procesa la cola de manera asíncrona, resuelve la plantilla y envía la alerta mediante el proveedor de correo integrado.
- **Resultado:** Los operadores reciben una alerta por correo electrónico incluso si no tienen el panel web abierto al momento del escalamiento.

---

### 2.3 Notificaciones de Reservas (Bookings)

- **Trigger:** Creación, reprogramación o cancelación de una reserva en `BookingsService`.
- **Comportamiento:**
  1. **Nueva Reserva:** El backend NestJS llama a `notificarNuevoBooking`, que emite un evento WebSocket de tipo `booking` al canal de la empresa (`company:<companyId>`) y encola correos de alerta (`new_booking_alert`) para los operadores. Asimismo, si el cliente posee correo electrónico, se encola la plantilla `booking_confirmed` dirigida al cliente.
  2. **Reprogramación:** Cuando se modifica el horario de la cita, se encola automáticamente la plantilla `booking_rescheduled` al correo del cliente.
  3. **Cancelación:** Al cancelar una reserva, se encola la plantilla `booking_cancelled` dirigida al cliente.
  4. **Procesamiento:** El cron worker de correos (`EmailWorkerCronService`) procesa periódicamente la cola, resuelve dinámicamente los asuntos y variables de reserva (cliente, horario, agente, y URL de redirección) y despacha los emails.
- **Resultado:** Los operadores son notificados visualmente en tiempo real en la UI mediante un icono de calendario y redirigidos al panel de `/pedidos` al hacer clic, mientras que los clientes y operadores reciben correos de estado correspondientes de forma automática.

---

### 2.4 Resiliencia y Degradación Silenciosa

- **Trigger:** Se intenta disparar una notificación de escalamiento o reserva, pero la base de datos o el servicio de correo no están disponibles.
- **Comportamiento:**
  La notificación es un servicio de apoyo ("nice-to-have") que no debe obstruir la acción principal de derivar o registrar la reserva. Si falla la búsqueda de operadores en base de datos o el encolado del correo, el servicio atrapa la excepción de manera segura, escribe un log de advertencia, y permite que el flujo principal continúe normalmente.
- **Resultado:** La reserva se procesa con éxito y los cambios se guardan.

---

## 3. Out of Scope

- Configuración o personalización dinámica de las plantillas de correo por parte del usuario final.
- Notificaciones Push móviles nativas para dispositivos iOS/Android (restringido a navegador web).
- Notificaciones a través de otros canales alternativos (como SMS o WhatsApp directos para operadores).
- Aprobación de plantillas transaccionales de WhatsApp de Meta para notificaciones automáticas a clientes (restringido a email en esta fase).

---

## 4. Technical Context

### Patrones de Arquitectura

- **Clean Architecture (Core desacoplado)**: La lógica de encolado y emisión de alertas reside en `@multibotagents/core` mediante el puerto `INotificationsWsEmitter`. El backend NestJS actúa como adaptador inyectando el Gateway de sockets a través de este puerto.
- **Screaming Architecture (Frontend modular)**: Componentes de campana, hooks y estado de comunicación por socket residen encapsulados en el feature `features/notifications/` del frontend Next.js.
- **WebSocket Rooms**: Aislamiento seguro de mensajes por empresa mediante suscripción de sockets en namespaces delimitados por `companyId`.

### Modelo de Datos (Extensión)

- **EmailQueue**: Se actualizó el validador JSON schema en la base de datos de MongoDB (`EMAIL_QUEUE_VALIDATION`) para admitir los siguientes tipos de plantilla:
  - `escalation_alert` (alertas de derivación)
  - `new_booking_alert` (alerta de nueva cita a operadores)
  - `booking_confirmed` (confirmación a cliente)
  - `booking_rescheduled` (reprogramación a cliente)
  - `booking_cancelled` (cancelación a cliente)

### Decisiones Técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Desacoplamiento de Sockets | Puertos e Interfaces en Core | Permite cambiar el transporte de sockets en el futuro sin modificar la lógica de negocio. |
| Gestión de salas WebSocket | Aislamiento por `company:<id>` | Evita fugas de información entre operadores de distintas empresas. |
| Envío de Emails | Encolado asíncrono diferido | No penaliza el tiempo de respuesta del chatbot ni de la API con conexiones síncronas al servidor de correo externo. |

---

## 5. Acceptance Criteria

- [x] El sistema emite un evento WebSocket `notification.new` al derivar una conversación o crear una reserva.
- [x] Los clientes suscritos a la sala de la empresa reciben la alerta en tiempo real en la UI.
- [x] La campana reactiva de notificaciones (`NotificationBell`) actualiza de forma visual su contador sin refrescar, renderiza el icono correcto (`Calendar` para citas, `MessageSquare` para chats) y redirige a `/pedidos` o `/inbox` según corresponda.
- [x] Se consulta a los operadores de la empresa y se encolan correos en `emailQueue` con las variables dinámicas de reservas correctas.
- [x] El cron worker de correos procesa de manera asíncrona la cola y despacha los correos con plantillas resueltas.
- [x] Si falla la base de datos o el servidor de sockets, la reserva o el escalamiento no se interrumpen y continúan su ejecución con degradación silenciosa.
- [x] Todo el flujo compila exitosamente bajo TypeScript estricto.

---

## 6. Risks & Assumptions

* **Supuesto**: Se asume que el token JWT del operador contiene la información del `companyId` para autenticar y agrupar al cliente en su room correspondiente de WebSockets de forma segura.
* **Riesgo**: Demora o encolado masivo de emails si el cron de despacho de correos se detiene. Se mitiga mediante el uso del panel web en tiempo real como canal principal e inmediato de atención.
