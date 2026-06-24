# QA Report — SL14 Flujo 2.2: Autenticación JWT
**PR:** [#7 — [SL14/Flujo-2.2] Autenticación JWT + Screaming Architecture + Skills](https://github.com/STT-Software/MultiBotsAgent/pull/7)
**Mergeada:** 2026-05-13 | **Stage:** `dev` | **Fecha QA:** 2026-05-14
**QA:** Kiro AI Agent + QA Humano

---

## Entorno de Pruebas

| Recurso | URL |
|---------|-----|
| Frontend (CloudFront) | `https://d1z7dsgvuqduin.cloudfront.net` |
| ServicesApi (NestJS/Fargate) | `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com` |
| FunctionsApi (Lambdas) | `https://eibwrbqsna.execute-api.us-east-1.amazonaws.com` |

---

## Resumen Ejecutivo

| Categoría | Total | ✅ Pass | ❌ Fail | ⚠️ Observación |
|-----------|-------|---------|---------|----------------|
| API — Login | 4 | 2 | 1 | 1 |
| API — Refresh | 2 | 2 | 0 | 0 |
| API — Logout (API) | 2 | 0 | 2 | 0 |
| API — Rate Limiting | 1 | 1 | 0 | 0 |
| Manual — Login E2E | 1 | 1 | 0 | 0 |
| Manual — Sesión única | 1 | 1 | 0 | 0 |
| Manual — Logout UI | 1 | 0 | 1 | 0 |
| **Total** | **12** | **7** | **4** | **1** |

**Estado general: 🔴 NO APROBADO** — 4 fallos, 3 críticos (BUG-01, BUG-02, BUG-03).

---

## Resultados Detallados

### 🔐 POST /auth/login — Pruebas de API

#### ✅ T1 — Rate Limiting activo con header Retry-After
```
Request:  POST /auth/login (múltiples intentos fallidos desde misma IP)
Expected: 429 con header Retry-After
Actual:   HTTP 429 | retry-after: 55 | {"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Demasiados intentos. Intenta de nuevo en 55 segundos."}}
```
**Resultado:** ✅ PASS — Rate limiting funciona. Header `retry-after` presente con valor en segundos.

---

#### ✅ T2 — Body malformado (no JSON) retorna 400
```
Request:  POST /auth/login  Content-Type: application/json  body: "esto no es json"
Expected: 400 Bad Request
Actual:   HTTP 400 | {"message":"Unexpected token 'e'...","error":"Bad Request","statusCode":400}
```
**Resultado:** ✅ PASS — NestJS rechaza JSON malformado correctamente.

> ⚠️ **OBS-01:** Formato de error inconsistente — usa esquema NestJS nativo `{message, error, statusCode}` en lugar del esquema de dominio `{error: {code, message}}`. El frontend debe manejar dos formatos distintos para el mismo endpoint.

---

#### 🔴 T3 — Body vacío `{}` retorna 500 en lugar de 400
```
Request:  POST /auth/login  {}
Expected: 400 con validación de campos requeridos
Actual:   HTTP 500 | {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
```
**Resultado:** ❌ FAIL — **BUG-02.** Body vacío sin campos `email`/`password` causa un error interno en lugar de retornar validación 400. El `LoginDto` no tiene validación de campos requeridos con `class-validator`, o el `ValidationPipe` no está configurado globalmente.

---

#### ⚠️ T4 — Email con formato inválido retorna 401 en lugar de 400
```
Request:  POST /auth/login  {"email":"notanemail","password":"Password1"}
Expected: 400 validación de formato de email
Actual:   HTTP 401 | {"error":{"code":"INVALID_CREDENTIALS","message":"Email o contraseña incorrectos"}}
```
**Resultado:** ⚠️ OBSERVACIÓN — No hay validación server-side del formato de email en login. El sistema intenta buscar el usuario con el email inválido y retorna credenciales incorrectas. No es un bug de seguridad (no revela información), pero es una validación faltante.

---

### 🔄 POST /auth/refresh — Pruebas de API

#### ✅ T5 — Refresh sin cookie retorna 401
```
Actual: HTTP 401 | {"error":{"code":"TOKEN_EXPIRED","message":"Tu sesión ha expirado..."}}
```
**Resultado:** ✅ PASS

---

#### ✅ T6 — Refresh con token falso en cookie retorna 401
```
Actual: HTTP 401 | {"error":{"code":"TOKEN_EXPIRED","message":"Tu sesión ha expirado..."}}
```
**Resultado:** ✅ PASS

---

### 🚪 POST /auth/logout — Pruebas de API

#### 🔴 T7 — Logout sin Authorization header retorna 500
```
Request:  POST /auth/logout  (sin header)
Expected: 401 Unauthorized
Actual:   HTTP 500 | {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
```
**Resultado:** ❌ FAIL — **BUG-01.** `AuthExceptionFilter` no maneja `HttpException` del `JwtAuthGuard`.

---

#### 🔴 T8 — Logout con JWT firma inválida retorna 500
```
Request:  POST /auth/logout  Authorization: Bearer <firma inválida>
Expected: 401
Actual:   HTTP 500
```
**Resultado:** ❌ FAIL — **BUG-01** (mismo root cause).

---

### 👤 Pruebas Manuales (QA Humano)

#### ✅ TC-MANUAL-01 — Login exitoso E2E
```
URL: https://d1z7dsgvuqduin.cloudfront.net/login
```
- Animación de éxito: ✅
- Redirect a `/dashboard`: ✅
- Cookie `refreshToken` en response headers: ✅ (`HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`)
- Cookie visible en DevTools → Application: ⚠️ No visible (esperado — `Path=/auth/refresh` restringe visibilidad al path actual `/dashboard`)

**Resultado:** ✅ PASS

---

#### ✅ TC-MANUAL-02 — Sesión única: refreshToken del dispositivo A revocado al login en B
```javascript
// Ejecutado en navegador A después de login en navegador B:
fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
// → Status: 401 Body: {"error":{"code":"TOKEN_EXPIRED","message":"Tu sesión ha expirado..."}}
```
- RefreshToken del navegador A revocado: ✅
- AccessToken del navegador A sigue válido hasta expiración (30 min): ✅ (comportamiento correcto por diseño JWT stateless)

**Resultado:** ✅ PASS

> Nota: el código retornado es `TOKEN_EXPIRED` en lugar de `SESSION_REPLACED`. Semánticamente `SESSION_REPLACED` sería más preciso para este caso. Observación menor.

---

#### 🔴 TC-MANUAL-03 — Logout desde UI no funciona
```
Acción: Clic en botón logout en el header
Expected: POST /auth/logout → redirect a /login
Actual:   No ocurre ningún request a /auth/logout. 
          Se disparan requests RSC (React Server Components): crear?_rsc=j79Vj4yI5...
          X-Cache: Error from cloudfront
```
**Resultado:** ❌ FAIL — **BUG-03.** El botón de logout no está conectado a la función `logout()` de `auth.ts`. En lugar de llamar `fetchWithAuth('/auth/logout', { method: 'POST' })`, dispara una navegación RSC. El refreshToken NO se revoca en el servidor. El usuario queda con sesión activa en la DB aunque crea haber cerrado sesión.

**Severidad:** 🔴 Crítica — fallo de seguridad. Un usuario que hace logout sigue teniendo un refreshToken válido en la base de datos.

---

## 🐛 Bugs Encontrados

### BUG-01 — `AuthExceptionFilter` convierte 401 del `JwtAuthGuard` en 500
**Severidad:** 🔴 Crítica | **Endpoint:** `POST /auth/logout`

**Reproducción:**
```bash
curl -X POST https://5em5s6gn59.execute-api.us-east-1.amazonaws.com/auth/logout
# → 500 (esperado: 401)
```

**Root cause:** `AuthExceptionFilter` usa `@Catch()` sin parámetros. Captura `UnauthorizedException` del `JwtAuthGuard` pero no la maneja como `HttpException` — cae en el bloque genérico de 500.

**Fix en `auth-exception.filter.ts`:**
```typescript
import { HttpException } from '@nestjs/common';

// Agregar al inicio del método catch():
if (exception instanceof HttpException) {
  response.status(exception.getStatus()).json(exception.getResponse());
  return;
}
```

---

### BUG-02 — Body vacío en `/auth/login` retorna 500 en lugar de 400
**Severidad:** 🔴 Crítica | **Endpoint:** `POST /auth/login`

**Reproducción:**
```bash
curl -X POST https://5em5s6gn59.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" -d '{}'
# → 500 (esperado: 400)
```

**Root cause probable:** `LoginDto` no tiene decoradores `class-validator` (`@IsEmail()`, `@IsNotEmpty()`), o el `ValidationPipe` global no está configurado en `main.ts` para el módulo de login.

**Fix:** Agregar `ValidationPipe` global en `main.ts` y decoradores en `LoginDto`:
```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

// login.dto.ts
@IsEmail()
@IsNotEmpty()
email: string;

@IsString()
@IsNotEmpty()
password: string;
```

---

### BUG-03 — Botón logout en UI no llama al endpoint `/auth/logout`
**Severidad:** 🔴 Crítica | **Componente:** Header / botón logout frontend

**Síntoma:** Clic en logout dispara navegación RSC en lugar de `POST /auth/logout`. El refreshToken no se revoca en la DB. Fallo de seguridad.

**Evidencia:** Network tab muestra requests `crear?_rsc=...` con `Content-Type: text/x-component` y `X-Cache: Error from cloudfront`. Ningún request a `/auth/logout`.

**Root cause probable:** El botón de logout usa `<Link href="/login">` o `router.push('/login')` en lugar de llamar a la función `logout()` de `apps/web/src/lib/auth.ts`.

**Fix:** El handler del botón debe llamar:
```typescript
import { logout } from '@/lib/auth';
// en el onClick:
await logout(); // llama POST /auth/logout + limpia token + redirige
```

---

### OBS-01 — Formato de error inconsistente para JSON malformado
**Severidad:** 🟡 Menor | **Endpoint:** `POST /auth/login`

NestJS retorna `{message, error, statusCode}` para JSON malformado, pero el resto de la API usa `{error: {code, message}}`. El frontend necesita manejar dos formatos.

---

### OBS-02 — Código de error `TOKEN_EXPIRED` en lugar de `SESSION_REPLACED` para sesión única
**Severidad:** 🟢 Cosmética | **Endpoint:** `POST /auth/refresh`

Cuando el refreshToken fue revocado por login en otro dispositivo, el código retornado es `TOKEN_EXPIRED` en lugar del más semántico `SESSION_REPLACED`. No afecta funcionalidad.

---

## Criterios de Aceptación de la PR — Estado Final

| Criterio | Estado | Notas |
|----------|--------|-------|
| Usuario registrado puede hacer login con credenciales válidas | ✅ Verificado | Login E2E funciona correctamente |
| Se retorna accessToken JWT y refreshToken como cookie httpOnly | ✅ Verificado | Cookie seteada con flags correctos |
| Rate limiting bloquea después de N intentos fallidos | ✅ Verificado | 429 + header `Retry-After` presente |
| Refresh token genera nuevo accessToken sin re-autenticación | ✅ Parcial | Tokens inválidos rechazados; flujo exitoso no probado (requiere token válido) |
| Logout invalida el refreshToken en la base de datos | 🔴 Falla | BUG-03: botón logout no llama al endpoint. Token no se revoca |
| Guard JWT rechaza requests sin token o con token expirado (401) | 🔴 Falla | BUG-01: retorna 500 en lugar de 401 |
| Frontend muestra errores específicos (credenciales inválidas, rate limited) | 🔲 No verificado | Requiere login con credenciales incorrectas desde UI |
| Build completo del monorepo pasa | ✅ Verificado por dev | 229 tests pasando según PR |
| Sesión única por usuario | ✅ Verificado | RefreshToken revocado al login en segundo dispositivo |

---

## Conclusión

**Estado: 🔴 NO APROBADO**

Se encontraron 3 bugs críticos que deben resolverse antes de aprobar:

| Bug | Severidad | Fix estimado |
|-----|-----------|--------------|
| BUG-01: `AuthExceptionFilter` convierte 401 en 500 | 🔴 Crítica | 5 líneas en `auth-exception.filter.ts` |
| BUG-02: Body vacío en login retorna 500 | 🔴 Crítica | `ValidationPipe` global + decoradores en `LoginDto` |
| BUG-03: Botón logout no llama al endpoint | 🔴 Crítica | Conectar `onClick` a `logout()` de `auth.ts` |

**Lo que funciona correctamente:**
- Login E2E completo (animación, redirect, cookie httpOnly) ✅
- Rate limiting con `Retry-After` ✅
- Sesión única (refreshToken revocado al login en otro dispositivo) ✅
- Refresh rechaza tokens inválidos/ausentes con 401 ✅
- Arquitectura del código (Screaming Architecture, separación de capas) ✅
