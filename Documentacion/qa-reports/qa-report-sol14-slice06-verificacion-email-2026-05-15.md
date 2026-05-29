# QA Report — Flujo 2.6: Verificación de Email
**Fecha:** 2026-05-15  
**PR:** [#11 — [SL14/Flujo-2.6] Verificación de Email completa](https://github.com/STT-Software/MultiBotsAgent/pull/11)  
**Solución:** SL14 — Gestión de Empresas y Acceso  
**Stage:** `dev`  
**ServicesApi:** `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`  
**Frontend:** `https://d1z7dsgvuqduin.cloudfront.net`  
**Ejecutado por:** QA Agent + QA Humano  

---

## Resumen Ejecutivo

| Categoría | Resultado |
|-----------|-----------|
| Tests API ejecutados | 14 |
| ✅ API Pasaron | 11 |
| ❌ API Fallaron | 2 |
| Tests manuales ejecutados | 5 |
| ✅ Manuales Pasaron | 1 |
| ❌ Manuales Fallaron | 3 |
| ⚠️ Observaciones UX | 2 |
| **Bugs totales** | **5** |

**Estado general:** 🔴 **NO APROBADO** — 5 bugs encontrados, 3 de severidad crítica/alta. El flujo de verificación de email no es funcional en el stage `dev` tal como está desplegado.

---

## Criterios de Aceptación — Estado

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Post-registro muestra "Verifica tu email" (no dashboard) | ✅ PASS | Verificado manualmente |
| Email llega con template correcto y link funcional | ❌ BUG-03 | Link apunta a `localhost:3000` |
| Token inválido/inventado → error claro | ✅ PASS | `400 TOKEN_INVALID` |
| Token de un solo uso | ✅ PASS | Segundo uso retorna error correcto |
| Guard bloquea dashboard si email no verificado | ❌ BUG-04 | Entra al dashboard sin verificar |
| Pantalla de bloqueo muestra botón "Reenviar verificación" | ❌ BUG-05 | Botón no existe en la pantalla |
| Reenvío con body vacío → 400 (no 500) | ❌ BUG-01 | Retorna `500 INTERNAL_ERROR` |
| Reenvío con `expiredToken: null` → 400 (no 500) | ❌ BUG-02 | Retorna `500 INTERNAL_ERROR` |
| Cooldown 60s entre reenvíos | ⚠️ N/A | No se pudo probar (botón no existe) |
| Worker procesa cola cada 30s | ⚠️ N/A | Requiere CloudWatch — delegar al dev team |

---

## Resultados de Tests Manuales

### ✅ TC-01 — Post-registro: pantalla correcta + email llega
**Resultado:** PASS parcial  
- ✅ Post-registro muestra pantalla "Verifica tu email" (no redirige al dashboard)
- ✅ Email llega en tiempo real (< 1 minuto)
- ✅ Template profesional con branding correcto
- ⚠️ **Logo roto en el email** — imagen no carga (cuadro gris en lugar del robot)
- ⚠️ **UX:** pantalla "Verifica tu email" no tiene link a `/login` ni botón de reenvío

---

### ❌ TC-02 — Verificación via link del email
**Resultado:** FAIL — BUG-03  
El link del email apunta a `http://localhost:3000/verify-email?token=...` en lugar de `https://d1z7dsgvuqduin.cloudfront.net/verify-email?token=...`. El usuario ve "No se puede acceder a este sitio — localhost rechazó la conexión."

El backend SÍ funciona — el token fue verificado directamente via API y retornó `{"verified":true,"message":"Email verificado exitosamente"}`. El problema es exclusivamente la URL generada en el email.

---

### ✅ TC-03 — Token de un solo uso
**Resultado:** PASS  
Al intentar usar el token ya consumido, el sistema muestra: *"Este enlace de verificación ya fue utilizado. Si ya verificaste tu email, puedes iniciar sesión."* El mensaje incluye link a login. Comportamiento correcto.

---

### ❌ TC-04 — Guard: acceso al dashboard sin email verificado
**Resultado:** FAIL — BUG-04  
Al hacer login con una cuenta recién registrada (email no verificado), el sistema permite el acceso completo al dashboard. El `EmailVerifiedGuard` no está activo en el flujo de login del stage `dev`.

---

### ❌ TC-05 — Botón "Reenviar verificación"
**Resultado:** FAIL — BUG-05  
La pantalla post-registro "Verifica tu email" no tiene botón de reenvío. Solo muestra el texto estático "¿No lo encuentras? Revisa tu carpeta de spam o correo no deseado." sin ninguna acción interactiva.

---

## Bugs Encontrados — Resumen Completo

### 🔴 BUG-03 — Link de verificación apunta a `localhost` (CRÍTICO)
**Severidad:** Crítica — bloquea el 100% de las verificaciones en producción  
**Tipo:** Configuración de infraestructura  
**Síntoma:** El email contiene `http://localhost:3000/verify-email?token=...`  
**Causa raíz:** La variable `FRONTEND_DOMAIN` en `infra/src/services/api-multi-bots.ts` se resuelve como `localhost:3000` en el stage `dev` en lugar de usar la URL de CloudFront. La PR #11 menciona "FRONTEND_DOMAIN automático en dev" — ese automatismo no está funcionando correctamente.  
**Fix esperado:** `FRONTEND_DOMAIN` debe resolverse como `https://d1z7dsgvuqduin.cloudfront.net` en el stage `dev`.

---

### 🔴 BUG-04 — Guard `EmailVerifiedGuard` no activo en login (CRÍTICO)
**Severidad:** Crítica — bypass completo del requisito de verificación  
**Tipo:** Lógica / configuración del guard  
**Síntoma:** Login con cuenta no verificada → acceso directo al dashboard  
**Causa raíz:** El guard está implementado en el código pero no está siendo aplicado en el flujo de login del stage `dev`. Puede ser un problema de registro del guard en el módulo NestJS, o que el claim `emailVerified` en el JWT no se está evaluando correctamente.  
**Nota:** Hay una ambigüedad en la spec — la sección 2.6 dice que el email no bloquea el onboarding, pero la PR implementó un guard explícito. El equipo debe alinear spec e implementación.

---

### 🔴 BUG-05 — Botón "Reenviar verificación" no existe en pantalla post-registro (ALTO)
**Severidad:** Alta — el usuario no tiene forma de recuperarse si el email no llega  
**Tipo:** Feature incompleto  
**Síntoma:** Pantalla "Verifica tu email" no tiene botón de reenvío  
**Causa raíz:** El componente frontend de la pantalla post-registro no incluye el botón de reenvío. La PR menciona "pantalla bloqueo, página verificación, polling 5s" pero el botón de reenvío en la pantalla inicial no fue implementado.

---

### 🔴 BUG-01 — `POST /auth/resend-verification` con body `{}` retorna 500 (ALTO)
**Severidad:** Alta  
**Tipo:** Validación de DTO  
**Síntoma:** `500 INTERNAL_ERROR` en lugar de `400`  
**Fix:** Agregar `@IsDefined()` e `@IsNotEmpty()` al campo `expiredToken` en `ResendVerificationDto`

---

### 🔴 BUG-02 — `POST /auth/resend-verification` con `expiredToken: null` retorna 500 (ALTO)
**Severidad:** Alta  
**Tipo:** Validación de DTO  
**Síntoma:** `500 INTERNAL_ERROR` en lugar de `400`  
**Fix:** Mismo que BUG-01 — `@IsDefined()` rechaza `null` y `undefined`

---

## Observaciones UX (no bloqueantes)

### OBS-01 — Logo roto en el email
El logo del robot en el template de Elastic Email no carga (muestra cuadro gris). La imagen referenciada en el template probablemente apunta a una URL inaccesible o el asset no está publicado.

### OBS-02 — Pantalla "Verifica tu email" sin link a login
La pantalla post-registro no ofrece ninguna acción al usuario más allá de revisar el spam. Debería tener al menos un link "Ya verifiqué mi email → Ir al login" para usuarios que verificaron en otro dispositivo y quieren continuar.

---

## Acciones Requeridas

### Bloqueantes (deben corregirse antes de aprobar):

| # | Bug | Acción | Archivo probable |
|---|-----|--------|-----------------|
| 1 | BUG-03 | Corregir `FRONTEND_DOMAIN` para que use la URL de CloudFront en stage `dev` | `infra/src/services/api-multi-bots.ts` |
| 2 | BUG-04 | Verificar registro y aplicación del `EmailVerifiedGuard` en el módulo de auth | `apps/services/api-multi-bots/src/modules/email-verification/` |
| 3 | BUG-05 | Agregar botón "Reenviar verificación" a la pantalla post-registro | `apps/web/src/features/email-verification/` |
| 4 | BUG-01/02 | Agregar `@IsDefined()` e `@IsNotEmpty()` al DTO `ResendVerificationDto` | `apps/services/api-multi-bots/src/modules/email-verification/` |

### Recomendadas (mejoras UX):

| # | Observación | Acción |
|---|-------------|--------|
| 1 | OBS-01 | Verificar URL del logo en el template de Elastic Email |
| 2 | OBS-02 | Agregar link "Ir al login" en pantalla "Verifica tu email" |

---

## Checklist Final de Criterios de Aceptación (PR #11)

| Criterio | Estado |
|----------|--------|
| Registro crea token de verificación y encola email en transacción atómica | ✅ (email llega) |
| Email llega con template correcto y link funcional | ❌ BUG-03 (link a localhost) |
| Clic en link verifica el email y redirige | ❌ BUG-03 (link inutilizable) |
| Token expirado muestra opción de reenvío | ⚠️ N/A (botón no existe) |
| Cooldown de 60s entre reenvíos funciona | ⚠️ N/A (botón no existe) |
| Guard bloquea acceso a rutas protegidas si email no verificado | ❌ BUG-04 |
| Pantalla de bloqueo muestra email y botón reenviar | ❌ BUG-05 |
| Worker procesa cola cada 30s con retry exponencial | ⚠️ Pendiente CloudWatch |
| Post-registro muestra "Verifica tu email" (no redirect a dashboard) | ✅ |
| Token inválido retorna error claro (no 500) | ✅ |
| Reenvío con token inválido retorna error claro (no 500) | ✅ |
| Reenvío con body vacío retorna 400 (no 500) | ❌ BUG-01 |
| Reenvío con `expiredToken: null` retorna 400 (no 500) | ❌ BUG-02 |
| Token de un solo uso | ✅ |

---

*Reporte generado por QA Agent + QA Humano — 2026-05-15*
