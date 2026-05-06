---
taxonomy: solution
key: gestion-empresas-acceso
solution: Gestión de Empresas y Acceso
initiative: ../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Por definir
created: 2026-05-06
updated: 2026-05-06
version: "0.1.0"
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
  - Envío de emails transaccionales mediante servicio externo (Plunk, Resend o equivalente).
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
  - Sin rate limiting por ahora (según restricciones de la iniciativa), pero la arquitectura no impide agregarlo después.

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
  - El logo se sube como imagen (formatos: PNG, JPG, SVG). Se almacena en storage de archivos.

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
  5. **Desactivación inmediata de agentes:** todos los agentes de la empresa dejan de procesar mensajes entrantes de forma inmediata.
  6. El sistema programa la eliminación definitiva de datos para 30 días después.
  7. Durante el período de gracia: el usuario puede hacer login y ver un mensaje de eliminación pendiente con opción de reactivar.

- **Resultado:** Empresa marcada para eliminación. Agentes desactivados inmediatamente. Datos preservados 30 días para posible reactivación. Eliminación definitiva programada.

- **Error path:**
  - Confirmación incorrecta → no se procede con la eliminación.
  - Intento de reactivación después de 30 días → datos ya eliminados, no es posible recuperar. Se informa al usuario que debe crear una cuenta nueva.

- **Decisiones de diseño:**
  - **Soft delete con período de gracia de 30 días.** Durante este período los datos existen pero la empresa está inactiva.
  - **Desactivación inmediata de agentes:** al marcar la empresa para eliminación, todos sus agentes dejan de procesar mensajes. Esto evita que se sigan generando datos y protege la experiencia del usuario final (no recibe respuestas de un agente cuya empresa ya no existe).
  - **Eliminación definitiva:** un proceso programado (job/cron) ejecuta la eliminación física de todos los datos asociados a la empresa después de los 30 días. Incluye: empresa, usuario, agentes, configuraciones, base de conocimiento, historial de conversaciones, pedidos, métricas, archivos en storage.
  - **Reactivación:** durante los 30 días, el usuario puede hacer login normalmente. El sistema detecta el estado `pending_deletion`, muestra el aviso y ofrece reactivar. Al reactivar, la empresa vuelve a estado `active` y los agentes se reactivan automáticamente.

- **Integraciones:**
  - Conector de WhatsApp (#5): al desactivar la empresa, los agentes asociados deben dejar de responder mensajes entrantes.
  - Todos los motores de agentes (#2, #3, #4): deben verificar que la empresa esté en estado `active` antes de procesar cualquier interacción.
  - Sistema de Base de Conocimiento (#6): los archivos e índices se eliminan en la eliminación definitiva.

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
  - Se usa un servicio externo de email transaccional (Plunk, Resend o equivalente) para el envío.
  - El token de verificación es de un solo uso y tiene expiración de 24h.

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
  - Token de un solo uso con expiración corta (1h) por seguridad.
  - No se invalidan sesiones existentes al cambiar contraseña (el access token expira naturalmente en 15-30 min).
  - Se usa el mismo servicio de email transaccional que la verificación.

---

## 3. Out of Scope

- **Roles y permisos** — No hay diferenciación de acceso. Un solo usuario por empresa con acceso total.
- **Múltiples usuarios por empresa** — No hay invitaciones, membresías ni gestión de equipo (el modelo de datos lo soporta pero no se implementa aún).
- **Cambio de email** — El email es el identificador fijo de la cuenta.
- **Planes, tiers, facturación** — No hay modelo comercial implementado.
- **Rate limiting** — No se limitan intentos de login ni requests (CAPTCHA protege solo el registro).
- **OAuth / SSO / Login social** — Solo email + contraseña.
- **Auditoría de acceso** — No se registran logs de login/logout.
- **Multi-idioma del panel** — El panel opera en un solo idioma.
- **Emails de notificación** — Solo se envían emails transaccionales de verificación y recuperación de contraseña. No hay emails de marketing, onboarding ni recordatorios.
- **Multi-sesión** — Solo se permite una sesión activa por usuario. No hay gestión de dispositivos.

---

## 4. Technical Context

**Autenticación:**
- Autenticación directa contra base de datos (sin servicios externos tipo Cognito/Auth0).
- Contraseñas almacenadas con hash + salt (bcrypt o argon2).
- JWT (access token) con expiración corta (15-30 min) + refresh token con expiración larga (7 días).
- Claims del JWT: userId, companyId, email, emailVerified.
- **Sesión única:** solo un refresh token activo por usuario. Al generar uno nuevo, el anterior se revoca. Esto garantiza una sola sesión activa.

**Protección contra abuso:**
- CAPTCHA/challenge en el formulario de registro (hCaptcha, Cloudflare Turnstile o equivalente).
- Implementado con fallback configurable por entorno: si no hay token/dominio configurado (desarrollo), el CAPTCHA se omite.

**Email transaccional:**
- Servicio externo para envío de emails (Plunk, Resend o equivalente).
- Emails enviados: verificación de cuenta, recuperación de contraseña.
- Tokens de verificación y reset: almacenados en base de datos con expiración y flag de uso.

**Patrón de arquitectura:**
- Multi-tenant por registro lógico: todas las empresas comparten la misma base de datos, diferenciadas por `companyId`.
- Cada request autenticado lleva el contexto de empresa en el token. El backend filtra datos por `companyId` en cada operación.

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
│ token           │
│ expiresAt       │
│ usedAt          │  ←── null si no usado
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│  RefreshToken   │  (sesiones — solo 1 activo por usuario)
├─────────────────┤
│ id              │
│ userId          │
│ token           │
│ expiresAt       │
│ revoked         │  ←── true si fue invalidado
│ createdAt       │
└─────────────────┘
```

**Storage:**
- Logo de empresa: almacenamiento de archivos (S3 o equivalente). URL pública o firmada para servir al frontend.

**Proceso de eliminación definitiva:**
- Job programado (cron/scheduler) que ejecuta diariamente: busca empresas con estado `pending_deletion` cuya `deletionReqDate` supere los 30 días y ejecuta eliminación física de todos los datos asociados.

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
- [ ] El sistema envía un email de verificación al correo registrado tras el registro.

### Autenticación

- [ ] El usuario puede iniciar sesión con email y contraseña.
- [ ] El sistema genera un access token (JWT, expiración corta) y un refresh token (expiración larga) al autenticarse.
- [ ] El sistema muestra un mensaje genérico ante credenciales inválidas (no revela si el email existe o no).
- [ ] Si la empresa está en estado `pending_deletion`, el sistema informa al usuario y ofrece reactivar.
- [ ] Solo se permite una sesión activa por usuario. Al iniciar sesión en un nuevo dispositivo, la sesión anterior se invalida.

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
- [ ] El logo se puede subir en formatos PNG, JPG o SVG.

### Eliminación de Empresa

- [ ] El usuario puede solicitar la eliminación de su empresa desde la configuración.
- [ ] La eliminación requiere confirmación explícita (escribir nombre de la empresa).
- [ ] La eliminación requiere email verificado.
- [ ] Al confirmar, los agentes de la empresa se desactivan inmediatamente.
- [ ] La empresa entra en estado `pending_deletion` con período de gracia de 30 días.
- [ ] Durante los 30 días, el usuario puede reactivar la empresa.
- [ ] Después de 30 días, un proceso programado elimina todos los datos de forma definitiva.
- [ ] El job de eliminación tiene monitoreo: logs de ejecución, alertas en caso de fallo, y métrica de empresas pendientes de eliminación.

### Transversal

- [ ] Toda operación del backend filtra datos por `companyId` extraído del JWT.
- [ ] Los motores de agentes verifican que la empresa esté en estado `active` antes de procesar interacciones.
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
- El servicio de email transaccional elegido soporta los volúmenes esperados sin configuración adicional.
- El CAPTCHA se configura por entorno: desactivado en desarrollo (fallback), activado en producción con dominio estable.

**Riesgos:**

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Sin rate limiting en login, vulnerable a fuerza bruta | Alto — seguridad comprometida | CAPTCHA protege registro. Para login, diseñar middleware que permita agregar rate limiting sin cambios arquitectónicos. Priorizar post-MVP. |
| Sin verificación de email obligatoria, cuentas con emails falsos pueden existir | Bajo — no bloquea funcionalidad | La verificación existe pero no es obligatoria para usar la plataforma. Solo bloquea acciones destructivas (eliminación). |
| Eliminación definitiva es irreversible después de 30 días | Alto — pérdida total de datos | Período de gracia de 30 días + advertencia + confirmación explícita. Job con monitoreo y alertas para detectar fallos. |
| Job de eliminación falla silenciosamente | Medio — acumulación de datos que deberían haberse borrado | Monitoreo obligatorio: logs de ejecución, alertas en caso de fallo, métrica de empresas pendientes. |
| Dependencia de servicio externo de email | Medio — si el servicio falla, no se pueden verificar emails ni recuperar contraseñas | Elegir servicio con alta disponibilidad. El fallo no bloquea el uso de la plataforma (solo verificación y recovery). |
| Modelo 1 usuario por empresa insuficiente para empresas reales | Medio — usuarios comparten credenciales, mala UX | Modelo de datos preparado para N:1. Iteración futura de "invitar usuario" no requiere migración destructiva. |

**Dependencias con soluciones no diseñadas:**
- **Panel de Administración Web (#1):** esta solución asume que el panel consume los endpoints de auth y gestión de empresa. Interfaz esperada: el panel envía JWT en headers, el backend valida y extrae companyId.
- **Conector de WhatsApp (#5):** al desactivar una empresa, el conector debe dejar de enrutar mensajes a sus agentes. Interfaz esperada: el conector consulta el estado de la empresa antes de procesar un mensaje entrante, o recibe un evento de desactivación.
