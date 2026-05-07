---
taxonomy: solution
key: gestion-empresas-acceso
solution: Gestión de Empresas y Acceso
initiative: ../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Por definir
created: 2026-05-06
updated: 2026-05-07
version: "0.2.0"
status: in-review
language: es
changelog:
  - date: 2026-05-06
    author: Por definir
    change: "Creación inicial — Narrativa de flujos validada (Fase 2)"
  - date: 2026-05-06
    author: Por definir
    change: "Documento completo — Out of Scope, Technical Context, Risks, Acceptance Criteria validados (Fase 3)"
  - date: 2026-05-06
    author: Por definir
    change: "Premortem aplicado — Agregados: CAPTCHA en registro, cambio de contraseña, sesión única, monitoreo job eliminación, modelo User N:1"
  - date: 2026-05-07
    author: Por definir
    change: "Premortem #2 aplicado — Agregados: rate limiting en login (MongoDB), transacciones atómicas en registro, rotación JWT secret, doble verificación en job eliminación, httpOnly cookie para refresh token, sanitización SVG, cola de emails con retry, notificación sesión reemplazada, tokens solo crypto.randomBytes. Email service: Elastic Email."
---

# Solución 14: Gestión de Empresas y Acceso

## 1. Overview

Esta solución establece la **base de tenancy** de toda la plataforma. Define cómo se crean y gestionan las empresas (tenants), cómo los usuarios acceden al sistema, y cómo se establece la relación empresa → agentes.

**Contexto dentro de la iniciativa:** Es la solución transversal #14 del Solution Map, ubicada en la Fase 0 del roadmap de ejecución. Es prerequisito para todas las demás soluciones — ningún agente, configuración ni funcionalidad opera sin el contexto de una empresa activa.

**Modelo de tenancy simplificado:**
- Un usuario = una empresa. No hay múltiples usuarios por empresa.
- Sin roles ni permisos diferenciados. El usuario único es el owner y tiene acceso completo.
- Sin planes, tiers ni facturación.
- Múltiples agentes por empresa, cada uno en su canal/número.

**Relación con otras soluciones:**
- Panel de Administración Web (#1): opera siempre dentro del contexto de una empresa autenticada.
- Todos los motores de agentes (#2, #3, #4): verifican que la empresa esté activa antes de procesar.
- Conector de WhatsApp (#5): los agentes se asocian a una empresa; si la empresa se desactiva, los agentes dejan de responder.

---

## 2. Solution Narrative

### 2.1 Registro de Empresa y Usuario

- **Trigger:** Un usuario nuevo accede a la plataforma y selecciona "Crear cuenta" / "Registrar empresa".

- **Comportamiento:**
  1. El sistema presenta un formulario de registro con los siguientes campos:
     - Nombre de la empresa (obligatorio)
     - Email (obligatorio, será el identificador de la cuenta)
     - Contraseña (obligatorio)
     - País/región (obligatorio)
     - Categoría de servicios (obligatorio, desplegable con categorías predefinidas)
     - Tamaño de empresa (obligatorio, desplegable: 1, 2-5, 6-10, 11-20, 20+)
     - Teléfono fijo (opcional, con selector de código de país)
     - ¿Cómo nos conociste? (opcional, desplegable: YouTube, Instagram, Facebook, Google, Referido, Otro)
  2. El usuario completa el formulario y envía.
  3. El sistema valida que el email no esté registrado previamente.
  4. El sistema crea la entidad Empresa con los datos proporcionados y estado `active`.
  5. El sistema crea la entidad Usuario asociada a la empresa con rol implícito de owner. La contraseña se almacena cifrada (hash + salt).
  6. El sistema genera un par de tokens (access token JWT + refresh token) y autentica al usuario automáticamente.
  7. El sistema envía un email de verificación al correo registrado (flujo 2.5).
  8. El usuario es redirigido al panel de administración de su empresa (vacío, listo para crear su primer agente).

- **Resultado:** Empresa creada, usuario autenticado con sesión activa. La empresa está lista para configurar agentes.

- **Error path:**
  - Email ya registrado → el sistema informa que ya existe una cuenta con ese email y sugiere iniciar sesión.
  - Datos incompletos o inválidos → validación en formulario, no se envía hasta completar campos obligatorios.
  - CAPTCHA fallido → no se procesa el registro, se solicita reintentar.

- **Decisiones de diseño:**
  - Registro y autenticación en un solo paso. Tras el registro, se envía un email de verificación. El usuario puede usar la plataforma inmediatamente, pero ciertas acciones críticas (ej: eliminación de empresa) requieren email verificado.
  - **CAPTCHA/challenge en el formulario de registro** (ej: hCaptcha, Cloudflare Turnstile). Implementado con fallback: si no hay token/dominio configurado (entorno de desarrollo), el CAPTCHA se omite y el registro procede sin él. En producción con dominio estable, se activa.
  - Autenticación directa contra base de datos (sin Cognito ni servicios externos de auth).
  - Envío de emails transaccionales mediante **Elastic Email** (API REST).
  - **Registro atómico con transacciones MongoDB:** la creación de Company, User y RefreshToken se ejecuta dentro de una transacción MongoDB (session). Si cualquier paso falla, se hace abort y no quedan datos huérfanos. Requiere replica set (Atlas lo provee por defecto).
  - **Tokens generados exclusivamente con `crypto.randomBytes`:** sin fallbacks, sin UUIDs, sin timestamps. Si crypto no está disponible, el handler falla con error 500 (mejor fallar que generar tokens débiles).
  - Un usuario = una empresa (por ahora). El modelo de datos soporta relación N:1 (múltiples usuarios por empresa) para facilitar evolución futura sin cambios estructurales.
  - Los campos opcionales (teléfono, cómo nos conociste) se pueden completar después desde el perfil.

---

### 2.2 Autenticación

- **Trigger:** Un usuario existente accede a la plataforma e ingresa sus credenciales.

- **Comportamiento:**
  1. El sistema presenta formulario de login (email + contraseña).
  2. El usuario ingresa credenciales y envía.
  3. El sistema busca el usuario por email, verifica la contraseña contra el hash almacenado.
  4. Si las credenciales son válidas, genera un par de tokens:
     - **Access token (JWT):** expiración corta (ej: 15-30 min). Claims: userId, companyId, email.
     - **Refresh token:** expiración larga (ej: 7 días). Almacenado de forma segura.
  5. Los tokens se entregan al cliente (frontend) para uso en requests subsiguientes.
  6. El usuario es redirigido al panel de su empresa.

- **Resultado:** Sesión activa con access token + refresh token. El frontend incluye el access token en cada request al backend. Cuando expira, usa el refresh token para obtener uno nuevo sin re-login.

- **Error path:**
  - Credenciales inválidas → mensaje genérico "Email o contraseña incorrectos" (no revelar cuál es incorrecto por seguridad).
  - Empresa en estado `pending_deletion` → informar que la cuenta está en proceso de eliminación y ofrecer opción de reactivar.
  - Cuenta inexistente → mismo mensaje genérico que credenciales inválidas.

- **Decisiones de diseño:**
  - JWT con expiración corta + refresh token. Al ser un contexto empresarial, la expiración corta del access token da mayor seguridad sin sacrificar UX (el refresh es transparente para el usuario).
  - **Sesión única por empresa:** solo se permite una sesión activa a la vez. Si el usuario inicia sesión en otro dispositivo, la sesión anterior se invalida automáticamente (el refresh token anterior deja de funcionar). Esto protege contra tokens comprometidos y simplifica el modelo de seguridad.
  - **Notificación de sesión reemplazada:** cuando el frontend recibe un rechazo de refresh por token revocado (no expirado), muestra un mensaje específico: "Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Si no fuiste tú, cambia tu contraseña." El backend diferencia el error con código `SESSION_REPLACED` vs `TOKEN_EXPIRED`.
  - **Rate limiting en login:** máximo 5 intentos fallidos por IP en 1 minuto (bloqueo temporal 5 min) + máximo 10 intentos fallidos por email en 10 minutos (bloqueo temporal 15 min). Implementado con colección MongoDB `rateLimits` con TTL index para auto-limpieza. Respuesta HTTP 429 con header `Retry-After`.
  - **Refresh token entregado como httpOnly cookie:** no se incluye en el response body. Se setea como cookie `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=7d`. El endpoint `/auth/refresh` lee el token de la cookie. Esto previene robo por XSS.
  - **Rotación de JWT secret:** soporte para múltiples secrets activos (array). Al verificar, se intenta con el actual y luego con el anterior. Al firmar, siempre se usa el primero. Rotación cada 90 días sin downtime.

---

### 2.3 Gestión del Perfil de Empresa

- **Trigger:** El usuario autenticado accede a la sección de configuración/perfil de su empresa desde el panel.

- **Comportamiento:**
  1. El sistema presenta los datos actuales de la empresa: nombre, país/región, categoría de servicios, tamaño, teléfono, logo (si tiene), "¿Cómo nos conociste?".
  2. El usuario modifica los campos que desea actualizar.
  3. El usuario guarda los cambios.
  4. El sistema valida los datos y actualiza la entidad Empresa.
  5. El sistema confirma la actualización exitosa.

- **Resultado:** Datos de la empresa actualizados. Los cambios se reflejan inmediatamente en el panel.

- **Error path:**
  - Datos inválidos (ej: nombre vacío) → validación en formulario, no se guarda hasta corregir.
  - Error de servidor → mensaje de error genérico, datos no se pierden (el formulario mantiene los valores ingresados).

- **Decisiones de diseño:**
  - El email del usuario NO se puede cambiar desde este flujo (es el identificador de la cuenta).
  - El logo se sube como imagen (formatos: PNG, JPG). Se almacena en storage de archivos. **SVG no se acepta** por riesgo de XSS almacenado (scripts embebidos en SVG se ejecutan al renderizar).

---

### 2.4 Cambio de Contraseña

- **Trigger:** El usuario autenticado accede a la sección de seguridad/contraseña dentro del perfil.

- **Comportamiento:**
  1. El sistema presenta un formulario con: contraseña actual, nueva contraseña, confirmación de nueva contraseña.
  2. El usuario completa los campos y envía.
  3. El sistema verifica que la contraseña actual sea correcta.
  4. El sistema valida que la nueva contraseña cumpla requisitos mínimos de seguridad.
  5. El sistema actualiza el hash de la contraseña.
  6. El sistema confirma el cambio exitoso. La sesión actual se mantiene activa.

- **Resultado:** Contraseña actualizada. La sesión actual permanece válida. No hay otras sesiones activas (modelo de sesión única).

- **Error path:**
  - Contraseña actual incorrecta → el sistema informa que la contraseña actual no es válida.
  - Nueva contraseña no cumple requisitos → el sistema informa los requisitos mínimos.
  - Nueva contraseña igual a la actual → el sistema informa que debe ser diferente.

- **Decisiones de diseño:**
  - Se requiere la contraseña actual como verificación de identidad (protege contra sesiones dejadas abiertas en dispositivos compartidos).
  - La sesión actual no se invalida al cambiar contraseña (el usuario ya demostró identidad con la contraseña actual).

---

### 2.5 Eliminación de Empresa

- **Trigger:** El usuario (owner) accede a la configuración de su empresa y selecciona "Eliminar empresa" / "Eliminar mi cuenta".

- **Comportamiento:**
  1. El sistema muestra una advertencia clara: se eliminarán todos los datos (agentes, configuraciones, historial de conversaciones, base de conocimiento, pedidos, métricas) después de 30 días de gracia.
  2. El sistema solicita confirmación explícita (ej: escribir el nombre de la empresa para confirmar).
  3. El usuario confirma.
  4. El sistema cambia el estado de la empresa a `pending_deletion` y registra la fecha de solicitud.
  5. **Desactivación inmediata de agentes (pendiente de implementación):** todos los agentes de la empresa deberán dejar de procesar mensajes entrantes de forma inmediata. *La lógica de desactivación de agentes queda pendiente hasta que se defina la solución de agentes.*
  6. El sistema programa la eliminación definitiva de datos para 30 días después.
  7. Durante el período de gracia: el usuario puede hacer login y ver un mensaje de eliminación pendiente con opción de reactivar.

- **Resultado:** Empresa marcada para eliminación. Desactivación de agentes pendiente de implementación (depende de la definición de la solución de agentes). Datos preservados 30 días para posible reactivación. Eliminación definitiva programada.

- **Error path:**
  - Confirmación incorrecta → no se procede con la eliminación.
  - Intento de reactivación después de 30 días → datos ya eliminados, no es posible recuperar. Se informa al usuario que debe crear una cuenta nueva.

- **Decisiones de diseño:**
  - **Soft delete con período de gracia de 30 días.** Durante este período los datos existen pero la empresa está inactiva.
  - **Desactivación inmediata de agentes (pendiente de implementación):** al marcar la empresa para eliminación, todos sus agentes deberán dejar de procesar mensajes. Esto evitará que se sigan generando datos y protegerá la experiencia del usuario final. *La implementación concreta queda pendiente hasta que se defina la solución de agentes (#2, #3, #4). Por ahora, el cambio de estado de la empresa a `pending_deletion` es suficiente — los motores de agentes verificarán este estado cuando se implementen.*
  - **Eliminación definitiva con doble verificación:** un proceso programado (job/cron) ejecuta la eliminación física de todos los datos asociados a la empresa después de los 30 días. **Antes de eliminar cada empresa individual, el job re-lee el documento y verifica que `status` sigue siendo `pending_deletion`** (protección contra race condition con reactivación). Usa `updateOne` con filtro `{ _id: companyId, status: "pending_deletion" }` — si no matchea, skip. Incluye: empresa, usuario, archivos en storage. *La eliminación de agentes, configuraciones, base de conocimiento, historial de conversaciones, pedidos y métricas queda pendiente hasta que se definan esas soluciones.*
  - **Reactivación:** durante los 30 días, el usuario puede hacer login normalmente. El sistema detecta el estado `pending_deletion`, muestra el aviso y ofrece reactivar. Al reactivar, la empresa vuelve a estado `active`. *La reactivación de agentes queda pendiente hasta que se defina la solución de agentes.*

- **Integraciones (pendientes de implementación — dependen de soluciones no definidas aún):**
  - Conector de WhatsApp (#5): al desactivar la empresa, los agentes asociados deberán dejar de responder mensajes entrantes.
  - Todos los motores de agentes (#2, #3, #4): deberán verificar que la empresa esté en estado `active` antes de procesar cualquier interacción.
  - Sistema de Base de Conocimiento (#6): los archivos e índices se eliminarán en la eliminación definitiva.
  - *Nota: por ahora, esta solución solo cambia el estado de la empresa. La lógica de desactivación/reactivación de agentes y limpieza de datos de otras soluciones se implementará cuando esas soluciones se definan.*

---

### 2.6 Verificación de Email

- **Trigger:** Inmediatamente después del registro exitoso (flujo 2.1), el sistema envía un email de verificación al correo registrado.

- **Comportamiento:**
  1. El sistema genera un token de verificación único con expiración (ej: 24h).
  2. El sistema envía un email transaccional al correo del usuario con un link que contiene el token.
  3. El usuario hace clic en el link.
  4. El sistema valida el token (no expirado, no usado previamente).
  5. El sistema marca el email del usuario como verificado.

- **Resultado:** Email marcado como verificado. El usuario puede realizar acciones que requieren email verificado (ej: eliminación de empresa).

- **Error path:**
  - Token expirado → el sistema informa que el link expiró y ofrece reenviar el email de verificación.
  - Token inválido o ya usado → el sistema informa que el link no es válido.
  - Email no llega → el usuario puede solicitar reenvío desde el panel (botón "Reenviar verificación").

- **Decisiones de diseño:**
  - El usuario puede usar la plataforma sin email verificado (no bloquea el onboarding). Solo se requiere verificación para acciones destructivas (eliminación de empresa).
  - Se usa **Elastic Email** (API REST) como servicio de email transaccional para el envío.
  - El token de verificación es de un solo uso y tiene expiración de 24h.
  - **Tokens generados exclusivamente con `crypto.randomBytes(32).toString('hex')`** — 256 bits de entropía. Sin fallbacks inseguros.

---

### 2.7 Recuperación de Contraseña

- **Trigger:** El usuario accede al formulario de login y selecciona "Olvidé mi contraseña".

- **Comportamiento:**
  1. El sistema presenta un formulario que solicita el email de la cuenta.
  2. El usuario ingresa su email y envía.
  3. El sistema genera un token de reset único con expiración (ej: 1h).
  4. El sistema envía un email transaccional con un link que contiene el token de reset.
  5. El usuario hace clic en el link y es dirigido a un formulario de nueva contraseña.
  6. El usuario ingresa la nueva contraseña (con confirmación).
  7. El sistema valida el token, actualiza el hash de la contraseña y marca el token como usado.
  8. El sistema redirige al login con mensaje de éxito.

- **Resultado:** Contraseña actualizada. El usuario puede iniciar sesión con la nueva contraseña. Tokens de sesión anteriores siguen válidos hasta su expiración natural.

- **Error path:**
  - Email no registrado → el sistema NO informa que el email no existe (por seguridad). Muestra mensaje genérico: "Si el email está registrado, recibirás un correo con instrucciones".
  - Token expirado (más de 1h) → el sistema informa que el link expiró y sugiere solicitar uno nuevo.
  - Token ya usado → el sistema informa que el link ya fue utilizado.

- **Decisiones de diseño:**
  - Mensaje genérico al solicitar reset (no revelar si el email existe o no).
  - Token de un solo uso con expiración corta (1h) por seguridad. Generado con `crypto.randomBytes(32).toString('hex')`.
  - No se invalidan sesiones existentes al cambiar contraseña (el access token expira naturalmente en 15-30 min).
  - Se usa el mismo servicio de email transaccional (Elastic Email) que la verificación.

---

## 3. Out of Scope

- **Roles y permisos** — No hay diferenciación de acceso. Un solo usuario por empresa con acceso total.
- **Múltiples usuarios por empresa** — No hay invitaciones, membresías ni gestión de equipo (el modelo de datos lo soporta pero no se implementa aún).
- **Cambio de email** — El email es el identificador fijo de la cuenta.
- **Planes, tiers, facturación** — No hay modelo comercial implementado.
- **Rate limiting avanzado** — Se implementa rate limiting básico en login (por IP y por email con MongoDB). No se implementa rate limiting global de API, WAF, ni protección DDoS avanzada.
- **OAuth / SSO / Login social** — Solo email + contraseña.
- **Auditoría de acceso** — No se registran logs de login/logout.
- **Multi-idioma del panel** — El panel opera en un solo idioma.
- **Emails de notificación** — Solo se envían emails transaccionales de verificación y recuperación de contraseña. No hay emails de marketing, onboarding ni recordatorios.
- **Multi-sesión** — Solo se permite una sesión activa por usuario. No hay gestión de dispositivos.

---

## 4. Technical Context

**Autenticación:**
- Autenticación directa contra base de datos MongoDB (sin servicios externos tipo Cognito/Auth0).
- Contraseñas almacenadas con hash + salt (bcrypt con cost factor 12). Librería: `bcryptjs` (JS puro, compatible con Lambda sin binarios nativos).
- JWT (access token) con expiración corta (30 min) + refresh token con expiración larga (7 días).
- Claims del JWT: userId, companyId, email, emailVerified.
- **Algoritmo JWT:** HS256 (HMAC-SHA256). Secret almacenado en SST Secrets.
- **Rotación de JWT secret:** soporte para array de secrets `["current", "previous"]`. Al verificar, se intenta con ambos. Al firmar, siempre el primero. Rotación cada 90 días sin downtime.
- **Sesión única:** solo un refresh token activo por usuario. Al generar uno nuevo, el anterior se revoca. Esto garantiza una sola sesión activa.
- **Refresh token como httpOnly cookie:** `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=7d`. No se expone en response body. Previene robo por XSS.
- **Generación de tokens:** exclusivamente `crypto.randomBytes` — refresh tokens: 64 bytes (512 bits), tokens de verificación/reset: 32 bytes (256 bits). Sin fallbacks.

**Protección contra abuso:**
- CAPTCHA/challenge en el formulario de registro (hCaptcha, Cloudflare Turnstile o equivalente). Implementado con fallback configurable por entorno: si no hay token/dominio configurado (desarrollo), el CAPTCHA se omite.
- **Rate limiting en login:** colección MongoDB `rateLimits` con TTL index. Reglas: 5 intentos/min por IP (bloqueo 5 min), 10 intentos/10 min por email (bloqueo 15 min). Respuesta HTTP 429 + `Retry-After`.

**Email transaccional:**
- **Elastic Email** (API REST) como servicio de envío de emails transaccionales.
- Emails enviados: verificación de cuenta, recuperación de contraseña.
- **Cola de emails con retry:** los handlers encolan el envío en una colección MongoDB `emailQueue`. Un worker Lambda (invocado por cron cada 30 segundos) procesa la cola. Si Elastic Email retorna error, el mensaje se reintenta con backoff exponencial (1 min, 5 min, 15 min). Máximo 3 reintentos.
- **Monitoreo:** alerta cuando la cola tiene > 50 mensajes pendientes por más de 10 minutos.
- Tokens de verificación y reset: almacenados en colección MongoDB `verifyTokens` con TTL index para auto-limpieza de tokens expirados.

**Atomicidad:**
- **Registro atómico:** la creación de Company + User + RefreshToken se ejecuta dentro de una transacción MongoDB (session con `startTransaction`/`commitTransaction`). Si cualquier paso falla, `abortTransaction` garantiza que no quedan datos huérfanos. Requiere replica set (MongoDB Atlas lo provee por defecto).

**Patrón de arquitectura:**
- Multi-tenant por registro lógico: todas las empresas comparten la misma base de datos MongoDB, diferenciadas por `companyId`.
- Cada request autenticado lleva el contexto de empresa en el token. El backend filtra datos por `companyId` en cada operación.
- **Base de datos única:** MongoDB para todo (entidades, tokens, rate limiting, cola de emails). Sin DynamoDB ni otros servicios de BD de AWS.

**Modelo de datos conceptual (entidades y relaciones):**

```
┌─────────────────┐         ┌─────────────────┐
│     Company     │ 1 ── N  │      User       │  ←── Relación N:1 (preparada para
├─────────────────┤         ├─────────────────┤       múltiples usuarios, por ahora 1)
│ id              │         │ id              │
│ name            │         │ email           │
│ country         │         │ passwordHash    │
│ category        │         │ emailVerified   │
│ size            │         │ companyId       │
│ phone           │         │ activeSessionId │  ←── ID de sesión activa (sesión única)
│ logo            │         │ createdAt       │
│ referralSource  │         │ updatedAt       │
│ status          │  ←── active | pending_deletion
│ deletionReqDate │  ←── fecha de solicitud (null si activa)
│ createdAt       │         └─────────────────┘
│ updatedAt       │
└─────────────────┘
       │
       │ 1 ── N
       ▼
┌─────────────────┐
│     Agent       │  (definido en otras soluciones)
├─────────────────┤
│ companyId       │
│ ...             │
└─────────────────┘

┌─────────────────┐
│  VerifyToken    │  (verificación de email y reset de contraseña)
├─────────────────┤
│ id              │
│ userId          │
│ type            │  ←── email_verification | password_reset
│ token           │  ←── crypto.randomBytes(32).toString('hex')
│ expiresAt       │  ←── TTL index para auto-limpieza
│ usedAt          │  ←── null si no usado
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│  RefreshToken   │  (sesiones — solo 1 activo por usuario)
├─────────────────┤
│ id              │
│ userId          │
│ token           │  ←── crypto.randomBytes(64).toString('hex')
│ expiresAt       │  ←── TTL index para auto-limpieza
│ revoked         │  ←── true si fue invalidado
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│  RateLimit      │  (rate limiting en login)
├─────────────────┤
│ id              │
│ key             │  ←── "ip:<ip>" o "email:<email>"
│ attempts        │  ←── contador de intentos fallidos
│ blockedUntil    │  ←── null si no bloqueado, fecha si bloqueado
│ expiresAt       │  ←── TTL index (auto-limpieza)
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│  EmailQueue     │  (cola de emails con retry)
├─────────────────┤
│ id              │
│ to              │  ←── email destino
│ template        │  ←── verification | password_reset
│ payload         │  ←── datos para el template (token, url, etc.)
│ status          │  ←── pending | processing | sent | failed
│ attempts        │  ←── número de intentos realizados
│ nextRetryAt     │  ←── fecha del próximo reintento
│ lastError       │  ←── último error (si falló)
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

**Storage:**
- Logo de empresa: almacenamiento de archivos (S3 o equivalente). URL pública o firmada para servir al frontend.

**Proceso de eliminación definitiva:**
- Job programado (cron/scheduler) que ejecuta diariamente: busca empresas con estado `pending_deletion` cuya `deletionReqDate` supere los 30 días.
- **Doble verificación:** antes de eliminar cada empresa individual, el job re-lee el documento con filtro `{ _id: companyId, status: "pending_deletion" }`. Si la empresa fue reactivada entre la lectura inicial y la eliminación, el job la salta sin daño.
- Ejecuta eliminación física de todos los datos asociados.
- **Resiliencia:** si falla la eliminación de una empresa individual, log del error y continuar con las demás. No detener el job completo por un fallo individual. Reintentar 3 veces con backoff exponencial si hay fallo de conexión a BD.

**Contratos de integración (interfaces que esta solución expone a otras):**
- Toda solución que opere sobre datos de una empresa debe recibir `companyId` del token JWT y filtrar por ese contexto.
- Antes de procesar cualquier interacción de agente, verificar que `company.status === 'active'`.

---

## 5. Acceptance Criteria

### Registro

- [ ] La plataforma permite crear una empresa nueva con: nombre, email, contraseña, país, categoría de servicios y tamaño de empresa.
- [ ] El sistema rechaza el registro si el email ya está asociado a otra cuenta.
- [ ] El registro incluye CAPTCHA/challenge con fallback (se omite si no hay configuración de dominio/token).
- [ ] Tras el registro exitoso, el usuario queda autenticado y accede al panel de su empresa.
- [ ] El sistema envía un email de verificación al correo registrado tras el registro (vía cola de emails).
- [ ] El registro es atómico: Company + User + RefreshToken se crean en una transacción MongoDB. Si falla cualquier paso, no quedan datos huérfanos.
- [ ] Los tokens se generan exclusivamente con `crypto.randomBytes`. No hay fallbacks inseguros.

### Autenticación

- [ ] El usuario puede iniciar sesión con email y contraseña.
- [ ] El sistema genera un access token (JWT, expiración 30 min) y un refresh token (expiración 7 días, entregado como httpOnly cookie) al autenticarse.
- [ ] El sistema muestra un mensaje genérico ante credenciales inválidas (no revela si el email existe o no).
- [ ] Si la empresa está en estado `pending_deletion`, el sistema informa al usuario y ofrece reactivar.
- [ ] Solo se permite una sesión activa por usuario. Al iniciar sesión en un nuevo dispositivo, la sesión anterior se invalida.
- [ ] Cuando una sesión es reemplazada, el frontend muestra un mensaje específico diferenciando `SESSION_REPLACED` de `TOKEN_EXPIRED`.
- [ ] El endpoint de login aplica rate limiting: máximo 5 intentos fallidos/min por IP y 10 intentos fallidos/10 min por email. Retorna HTTP 429 con `Retry-After` al exceder.
- [ ] El JWT secret soporta rotación: el sistema verifica tokens con el secret actual y el anterior.

### Cambio de Contraseña

- [ ] El usuario puede cambiar su contraseña desde el perfil.
- [ ] El cambio requiere ingresar la contraseña actual como verificación.
- [ ] El sistema valida que la nueva contraseña cumpla requisitos mínimos de seguridad.
- [ ] El sistema rechaza si la nueva contraseña es igual a la actual.

### Verificación de Email

- [ ] El usuario recibe un email con link de verificación tras registrarse.
- [ ] Al hacer clic en el link válido, el email queda marcado como verificado.
- [ ] El token de verificación expira después de 24h.
- [ ] El usuario puede solicitar reenvío del email de verificación desde el panel.

### Recuperación de Contraseña

- [ ] El usuario puede solicitar recuperación de contraseña desde el login.
- [ ] El sistema envía un email con link de reset (token con expiración de 1h).
- [ ] El sistema muestra mensaje genérico al solicitar reset (no revela si el email existe).
- [ ] El usuario puede establecer una nueva contraseña mediante el link válido.
- [ ] El token de reset es de un solo uso.

### Gestión de Perfil

- [ ] El usuario puede ver y editar los datos de su empresa (nombre, país, categoría, tamaño, teléfono, logo, referral source).
- [ ] El email no se puede modificar desde el perfil.
- [ ] El logo se puede subir en formatos PNG o JPG. SVG no se acepta (prevención de XSS almacenado).

### Eliminación de Empresa

- [ ] El usuario puede solicitar la eliminación de su empresa desde la configuración.
- [ ] La eliminación requiere confirmación explícita (escribir nombre de la empresa).
- [ ] La eliminación requiere email verificado.
- [ ] Al confirmar, el estado de la empresa cambia a `pending_deletion`. *(La desactivación de agentes queda pendiente de implementación hasta que se defina la solución de agentes.)*
- [ ] La empresa entra en estado `pending_deletion` con período de gracia de 30 días.
- [ ] Durante los 30 días, el usuario puede reactivar la empresa.
- [ ] Después de 30 días, un proceso programado elimina todos los datos de forma definitiva.
- [ ] El job de eliminación aplica doble verificación de estado antes de eliminar cada empresa individual (protección contra race condition con reactivación).
- [ ] El job de eliminación tiene monitoreo: logs de ejecución, alertas en caso de fallo, y métrica de empresas pendientes de eliminación.
- [ ] Si falla la eliminación de una empresa individual, el job continúa con las demás (no se detiene por un fallo).

### Transversal

- [ ] Toda operación del backend filtra datos por `companyId` extraído del JWT.
- [ ] Los motores de agentes verificarán que la empresa esté en estado `active` antes de procesar interacciones. *(Pendiente de implementación — depende de la definición de soluciones de agentes.)*
- [ ] El modelo de datos de User soporta relación N:1 con Company (preparado para múltiples usuarios sin migración destructiva).

### Rendimiento

- [ ] El endpoint de login responde en menos de 500ms (p95) bajo carga normal.
- [ ] El endpoint de registro responde en menos de 1s (p95), incluyendo creación de empresa y generación de tokens.
- [ ] El email de verificación y recuperación de contraseña se envía en menos de 5s tras la solicitud.
- [ ] El refresh de token responde en menos de 200ms (p95).
- [ ] El sistema soporta al menos 100 registros concurrentes y 500 logins concurrentes sin degradación.

---

## 6. Risks & Assumptions

**Supuestos:**
- Un usuario siempre pertenece a exactamente una empresa. El modelo de datos soporta relación N:1 (múltiples usuarios por empresa) para facilitar evolución futura sin cambios estructurales, pero por ahora solo se permite 1 usuario por empresa.
- El volumen de empresas registradas no justifica particionamiento de base de datos por ahora. Multi-tenant lógico es suficiente.
- No se requiere compliance específico (GDPR, SOC2) más allá de la eliminación de datos a solicitud del usuario.
- **Elastic Email** soporta los volúmenes esperados. La cola de emails con retry mitiga fallos temporales del servicio.
- El CAPTCHA se configura por entorno: desactivado en desarrollo (fallback), activado en producción con dominio estable.
- MongoDB está en replica set (Atlas lo provee por defecto), lo cual es requisito para transacciones multi-documento.
- El rate limiting basado en MongoDB es suficiente para el volumen actual. Si escala significativamente, se puede migrar a Redis sin cambios arquitectónicos.

**Riesgos:**

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Rate limiting en MongoDB agrega latencia al login | Bajo — una lectura adicional por request | TTL index mantiene la colección pequeña. Si crece, migrar a Redis. Monitorear p95 del endpoint. |
| JWT secret comprometido sin rotación oportuna | Alto — tokens forjados para cualquier empresa | Rotación cada 90 días con soporte multi-secret. Secret en SST Secrets (no en código). Política de no copiar secrets a archivos locales. |
| Race condition entre reactivación y job de eliminación | Alto — pérdida irreversible de datos | Doble verificación de estado con filtro atómico `{ status: "pending_deletion" }` antes de cada eliminación individual. |
| Registro no atómico deja datos huérfanos | Medio — empresas sin usuario, emails "libres" pero empresa existente | Transacciones MongoDB con session. Abort automático si falla cualquier paso. |
| Refresh token robado por XSS en frontend | Alto — account takeover | httpOnly cookie con `Secure; SameSite=Strict; Path=/auth/refresh`. Invisible para JavaScript. |
| SVG con scripts embebidos (XSS almacenado) | Alto — ejecución de código en browsers de otros usuarios | SVG rechazado. Solo PNG y JPG aceptados para logos. |
| Elastic Email tiene rate limits o downtime | Medio — emails no se envían temporalmente | Cola de emails en MongoDB con retry (backoff exponencial, 3 intentos). Alerta si cola > 50 pendientes por > 10 min. El fallo no bloquea el uso de la plataforma. |
| Tokens de verificación/reset con fallback inseguro | Alto — account takeover por tokens predecibles | Solo `crypto.randomBytes`. Sin fallbacks. Si crypto falla, error 500 (mejor fallar que generar tokens débiles). Test que verifica ausencia de fallbacks. |
| Sesión única causa UX confusa | Medio — usuarios frustrados por deslogueos inesperados | Código de error diferenciado `SESSION_REPLACED`. Frontend muestra mensaje explicativo con sugerencia de cambiar contraseña si no fue el usuario. |
| Sin verificación de email obligatoria, cuentas con emails falsos pueden existir | Bajo — no bloquea funcionalidad | La verificación existe pero no es obligatoria para usar la plataforma. Solo bloquea acciones destructivas (eliminación). |
| Modelo 1 usuario por empresa insuficiente para empresas reales | Medio — usuarios comparten credenciales, mala UX | Modelo de datos preparado para N:1. Iteración futura de "invitar usuario" no requiere migración destructiva. |

**Dependencias con soluciones no diseñadas:**
- **Panel de Administración Web (#1):** esta solución asume que el panel consume los endpoints de auth y gestión de empresa. Interfaz esperada: el panel envía JWT en headers, el backend valida y extrae companyId. El refresh token se maneja automáticamente via httpOnly cookie.
- **Conector de WhatsApp (#5):** al desactivar una empresa, el conector debe dejar de enrutar mensajes a sus agentes. Interfaz esperada: el conector consulta el estado de la empresa antes de procesar un mensaje entrante, o recibe un evento de desactivación.
