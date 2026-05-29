# QA Report — Flujo 2.7: Recuperación de Contraseña

**Fecha:** 2026-05-20
**PR:** [#16 — SL14/Flujo-2.7 Recuperación de contraseña](https://github.com/STT-Software/MultiBotsAgent/pull/16)
**Stage:** `dev`
**Ejecutado por:** QA Agent (automatizadas) + QA humano (manuales guiadas)

---

## 🎯 Veredicto

**🔴 NO APROBADO — Requiere correcciones antes de promover a producción.**

El flujo principal funciona, pero hay **un bug de severidad ALTA** que rompe la UX en todos los caminos de error tras submit (token expirado, ya usado, modificado). Las pantallas amigables existen pero nunca se muestran porque el componente crashea con un error de React.

| ID | Severidad | Hallazgo | Bloqueante |
|----|-----------|----------|------------|
| BUG-4 | 🔴 Alta | `ResetPasswordContainer` crashea (React error #300) cuando el backend rechaza tokens | **Sí** |
| BUG-1 | 🟡 Media | `ValidationPipe` no se aplica en `/auth/forgot-password` ni en `/auth/reset-password` | No |
| BUG-3 | 🟢 Baja | Regla "Máximo 128 caracteres" aparece como ✓ cuando el campo de contraseña está vacío | No |

---

## Entorno de pruebas

| Recurso | URL | Estado |
|---------|-----|--------|
| Frontend (CloudFront) | https://d1z7dsgvuqduin.cloudfront.net | ✅ Activo |
| ServicesApi (NestJS/Fargate) | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com | ✅ Activo |
| FunctionsApi (Lambdas) | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com | No aplica |
| MongoDB Atlas | Stage `dev` | ✅ Verificado |
| Email de prueba | `kardstoredev@gmail.com` | ✅ Registrado y verificado |

---

## Resumen ejecutivo

| Dimensión | Resultado |
|-----------|-----------|
| Endpoint `forgot-password` (caso feliz) | ✅ OK |
| Endpoint `forgot-password` (no enumerable, mensaje genérico invariante) | ✅ OK |
| Endpoint `forgot-password` (validación server-side de DTO) | 🟡 No valida formato ni campos faltantes (BUG-1) |
| Rate limit silencioso (3/hora por email) | ✅ OK — verificado en MongoDB |
| Endpoint `reset-password` (validación de token) | ✅ OK (devuelve los códigos correctos) |
| Frontend — links de acceso al flujo | ✅ OK |
| Frontend — validación cliente | ✅ OK (con observación menor en BUG-3) |
| Frontend — flujo end-to-end happy path | ✅ OK |
| Frontend — manejo de errores tras submit | 🔴 CRASHEA (BUG-4) |

---

## 🐛 Bugs detectados

### 🔴 BUG-4: `ResetPasswordContainer` viola las reglas de hooks de React

**Severidad:** Alta
**Reproducible:** Sí, al 100%
**Tests afectados:** TC-15, TC-16

**Descripción:**
Cuando el backend rechaza el token tras un submit (token expirado, modificado, o ya usado) el componente `ResetPasswordContainer.tsx` crashea con `Uncaught Error: Minified React error #300` ("Rendered more hooks than during the previous render"). El usuario ve un error genérico del navegador ("This page couldn't load") en lugar de las pantallas amigables ("Enlace expirado" / "Enlace inválido" / "Enlace ya utilizado") que sí están implementadas pero nunca se muestran.

**Causa raíz (verificada con DevTools):**
El archivo `apps/web/src/features/password-recovery/ResetPasswordContainer.tsx` tiene un `useEffect` declarado **después** de `return` condicionales. Cuando `tokenError` cambia de `null` a un valor tras el submit, el render entra en una rama que retorna antes de llegar al `useEffect`. React detecta que el número de hooks ejecutados es menor que en el render anterior y lanza el error #300.

**Estructura problemática actual:**
```tsx
if (!token) return <TokenError type="TOKEN_INVALID" />;
if (tokenError) return <TokenError type={tokenError} />;

useEffect(() => {
  if (status === 'success') router.push('/login?reset=success');
}, [status, router]);  // ❌ Hook después de return condicional
```

**Fix sugerido:**
Mover **todos** los hooks (`useEffect`, etc.) antes de cualquier `return` condicional. Los `return` deben ir al final.
```tsx
useEffect(() => {
  if (status === 'success') router.push('/login?reset=success');
}, [status, router]);

if (!token) return <TokenError type="TOKEN_INVALID" />;
if (tokenError) return <TokenError type={tokenError} />;
// ...resto
```

**Impacto al usuario:**
- Si recibe un email con token y lo usa después de 1 hora → ve "This page couldn't load" en vez de "Enlace expirado"
- Si usa un link ya utilizado → mismo crash en lugar de "Enlace ya utilizado"
- Si alguien modifica el token (ej. compartiendo el link mal) → crash en vez de "Enlace inválido"

**Prioridad de fix:** Alta — el flujo de seguridad pierde toda comunicación con el usuario en sus caminos de error.

---

### 🟡 BUG-1: `ValidationPipe` no aplicado en los nuevos endpoints

**Severidad:** Media
**Reproducible:** Sí
**Tests afectados:** Pruebas de API automatizadas

**Descripción:**
Los DTOs `ForgotPasswordRequestDto` y `ResetPasswordRequestDto` definen validaciones (`@IsEmail()`, `@IsNotEmpty()`, `@MaxLength(128)`) pero estas no se ejecutan a nivel de pipeline de NestJS.

**Evidencia:**
| Request | Esperado | Obtenido |
|---------|----------|----------|
| `POST /auth/forgot-password {"email":"not-an-email"}` | 400 (formato) | 200 (mensaje genérico) |
| `POST /auth/forgot-password {"email":""}` | 400 (vacío) | 200 (mensaje genérico) |
| `POST /auth/forgot-password {}` | 400 (campo faltante) | 500 `INTERNAL_ERROR` |
| `POST /auth/reset-password` con password de 130 chars | 400 (`@MaxLength(128)`) | 400 `TOKEN_INVALID` (no se llegó a validar la password) |

**Comparación de control:** `/auth/register` y `/auth/login` SÍ validan correctamente y retornan 400 con mensajes específicos. El problema es específico de los nuevos endpoints.

**Causa probable:**
Los nuevos endpoints no tienen `@UsePipes(new ValidationPipe())` o el `ValidationPipe` global no incluye las opciones `transform` / `whitelist` necesarias para procesar estos DTOs.

**Impacto:**
- **Bajo en seguridad** — La respuesta de `forgot-password` sigue siendo invariante para emails inválidos, así que no se filtra información de existencia.
- **Bajo en operación** — Cuando llega `{}` el handler crashea con `TypeError` al hacer `dto.email.trim()` y devuelve 500 en vez de 400. Eso ensucia logs y da una mala experiencia a clientes mal configurados.

**Fix sugerido:**
Agregar `@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))` en los métodos del controller, o asegurar que el pipe global tenga `transform: true`.

---

### 🟢 BUG-3: Regla de longitud máxima muestra ✓ con campo vacío

**Severidad:** Baja (cosmético/UX)
**Reproducible:** Sí
**Tests afectados:** TC-06

**Descripción:**
En `/reset-password`, antes de escribir nada en el campo "Nueva contraseña", la regla "Máximo 128 caracteres" aparece marcada con check verde (✓) mientras todas las demás están en rojo (✗). Esto confunde al usuario porque le da la sensación de que ya cumple 1 de 6 reglas sin haber escrito nada.

**Causa probable:**
La regla evalúa `length <= 128` lo cual es `true` por vacuidad cuando `length === 0`. Las otras reglas evalúan "el contenido tiene X" y devuelven `false` con campo vacío, lo cual es consistente.

**Fix sugerido:**
Mostrar todas las reglas como ✗ (o en estado neutral/gris) cuando el campo está vacío. Solo activar evaluación cuando `length > 0`.

---

### ❌ BUG-2 (descartado): Rate limit silencioso

**Estado:** Inicialmente sospechoso desde las pruebas automatizadas, **confirmado funcionando** en TC-12.

Las pruebas de API enviaron 5 solicitudes consecutivas con el mismo email y todas retornaron 200, lo que parecía indicar un fallo del rate limit. Sin embargo, la verificación en MongoDB Atlas confirmó que solo 3 documentos fueron creados en `emailQueue` para ese email en la última hora — el rate limit **sí está funcionando correctamente**, simplemente la respuesta es invariante por diseño (silenciosa, no enumerable).

---

## 📋 Detalle de Test Cases ejecutados

### Sesión guiada — QA humano

| ID | Nombre | Resultado |
|----|--------|-----------|
| TC-01 | Registro del usuario de prueba | ✅ |
| TC-02 | Acceso al flujo desde login | ✅ |
| TC-03 | Validación cliente del campo email | ✅ |
| TC-04 | Solicitar reset y recibir email | ✅ |
| TC-05 | Acceso a `/reset-password` sin token | ✅ |
| TC-06 | Token modificado en URL — frontend acepta y rechaza al submit | ✅ + observación BUG-3 |
| TC-07 | Validación en tiempo real de reglas de contraseña | ✅ |
| TC-08 | Reset exitoso con token real (E2E) | ✅ |
| TC-09 | Token de un solo uso (`TOKEN_ALREADY_USED`) | ✅ |
| TC-10 | Login con contraseña vieja debe fallar | ✅ |
| TC-11 | Login con contraseña nueva debe funcionar | ✅ |
| TC-12 | Rate limit silencioso (3/hora) — verificado en MongoDB | ✅ |
| TC-13 | Forgot-password con email no registrado (no enumerable) | ✅ |
| TC-14 | Doble clic rápido en "Restablecer" | ✅ |
| TC-15 | Token modificado tras submit | ❌ BUG-4 |
| TC-16 | Token expirado (`TOKEN_EXPIRED`) | ❌ BUG-4 confirmado con DevTools |

### Pruebas automatizadas — API contra el deploy

| Endpoint | Escenarios probados | Resultado |
|----------|---------------------|-----------|
| `POST /auth/forgot-password` | Email válido, no registrado, formato inválido, vacío, sin campo, normalización (espacios+mayúsculas), body malformado | 4/7 OK + 3 hallazgos en BUG-1 |
| `POST /auth/reset-password` | Token inválido (64 hex), sin token, token vacío, password débil, sin mayúscula, sin número, sin especial, vacío, longitud > 128, no-hex, corto | 11/11 responden con `400 TOKEN_INVALID` (correcto, aunque BUG-1 evita validar password antes que token) |
| Frontend (CloudFront) | `/login`, `/forgot-password`, `/reset-password`, `/login?reset=success`, `/reset-password?token=fake` | 5/5 HTTP 200 |

### Verificación en MongoDB

| Colección | Verificación | Resultado |
|-----------|--------------|-----------|
| `emailQueue` | Tras 6 solicitudes (1 + 5) en 1h, solo 3 documentos creados | ✅ Rate limit OK |
| `emailQueue` | Email no registrado → ningún documento creado | ✅ No enumerable confirmado |
| `verifyTokens` | Token usado tras reset exitoso queda con `usedAt` poblado (inferido por TC-09) | ✅ Token de un solo uso confirmado |

---

## ✅ Lo que funciona bien

- Generación de token (256 bits) y email transaccional vía Elastic Email
- Template HTML profesional con nombre de usuario y link
- Mensaje genérico no enumerable en `forgot-password`
- Rate limiting silencioso de 3 solicitudes/hora por email
- Manejo correcto de `TOKEN_INVALID` por el backend en todos los inputs malformados
- Token de un solo uso (`TOKEN_ALREADY_USED` tras reuso)
- Banner verde de éxito en `/login?reset=success`
- Validación cliente en tiempo real de reglas de contraseña
- Idempotencia del botón "Restablecer" (doble clic no envía request duplicado)
- Login con nueva contraseña tras reset exitoso
- Rechazo de login con contraseña anterior tras reset

---

## 🔧 Acciones requeridas antes de aprobar

1. **🔴 BLOQUEANTE:** Corregir **BUG-4** moviendo el `useEffect` antes de los `return` condicionales en `ResetPasswordContainer.tsx`.
2. **🟡 RECOMENDADO:** Corregir **BUG-1** asegurando que el `ValidationPipe` se aplique en `/auth/forgot-password` y `/auth/reset-password`.
3. **🟢 NICE-TO-HAVE:** Corregir **BUG-3** ajustando la lógica del indicador "Máximo 128 caracteres" para que no muestre ✓ con campo vacío.

Una vez corregido BUG-4, repetir TC-15 y TC-16 para validar el fix antes de promover.

---

## Notas adicionales

- El flujo end-to-end real (registro → login → forgot → email → reset → login con nueva password) se completó exitosamente.
- El backend está correctamente implementado: todos los códigos de error (`TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`, `VALIDATION_FAILED`) se devuelven con el formato esperado y los emails llegan con el template configurado.
- El bug crítico es **exclusivamente del frontend**, en el manejo del estado de error tras submit. El fix es trivial (reordenar 3 líneas) pero el impacto en UX es alto.
