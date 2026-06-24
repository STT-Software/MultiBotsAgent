# QA Report — Flujo 2.1: Registro de Empresa y Usuario
**Solución:** 14 — Gestión de Empresas y Acceso  
**PR:** [#5 — SL14/Gestion-Empresas-Acceso](https://github.com/STT-Software/MultiBotsAgent/pull/5)  
**Fecha:** 2026-05-13  
**Entorno:** Stage `dev` — API Gateway  
**Endpoint base:** `https://5em5s6gn59.execute-api.us-east-1.amazonaws.com`  
**QA Agent:** Kiro (automatizado) + QA humano (sesión interactiva completada)

---

## Resumen Ejecutivo

| Categoría | Total | PASS | FAIL |
|-----------|-------|------|------|
| Tests automatizados (API) | 10 | 9 | 1 |
| Pruebas manuales | 5 | 4 | 1 |
| **Total** | **15** | **13** | **2** |

**Veredicto:** ✅ Aprobado con observaciones — T7 API es comportamiento esperado (no bug). BUG-01 debe corregirse antes de producción.

---

## Tests Automatizados — POST /auth/register

### T1: Validación server-side — campos inválidos
- **Input:** `companyName: ""`, `email: "invalid"`, `password: "weak"`, `country: "XX"`, `category: "invalid"`, `size: "invalid"`
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "companyName": "El nombre de empresa es obligatorio",
    "email": "Formato de email inválido",
    "password": "La contraseña debe tener al menos 8 caracteres",
    "country": "Código de país inválido",
    "category": "Categoría de servicios no válida",
    "size": "Tamaño de empresa no válido"
  }
}
```
- **Resultado:** PASS — Validación completa por campo, mensajes en español, formato `{ error, fields }` correcto.

---

### T2: Sanitización HTML/XSS en companyName
- **Input:** `companyName: "<script></script>"`, resto válido
- **Esperado:** 400 (nombre vacío tras sanitizar tags)
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "companyName": "El nombre de empresa es obligatorio"
  }
}
```
- **Resultado:** PASS — El HTML se sanitiza y el nombre queda vacío, lo que dispara la validación de campo obligatorio.

---

### T3: Request sin Content-Type
- **Input:** Body JSON válido, sin header `Content-Type`
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "companyName": "El nombre de empresa es obligatorio",
    "email": "El email es obligatorio",
    "password": "La contraseña es obligatoria",
    "country": "El país es obligatorio",
    "category": "La categoría de servicios es obligatoria",
    "size": "El tamaño de empresa es obligatorio"
  }
}
```
- **Resultado:** PASS — NestJS no parsea el body sin Content-Type, todos los campos quedan vacíos y la validación los rechaza.
- **Nota:** El rechazo es por validación de campos vacíos, no por Content-Type inválido explícitamente. Comportamiento aceptable.

---

### T4: Body malformado (no es JSON)
- **Input:** `"esto no es json"` con `Content-Type: application/json`
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "message": "Unexpected token 'e', \"esto no es json\" is not valid JSON",
  "error": "Bad Request",
  "statusCode": 400
}
```
- **Resultado:** PASS — NestJS rechaza el JSON malformado correctamente.
- **Observación menor:** El formato de este error es el de NestJS nativo (`{ message, error, statusCode }`), diferente al formato del dominio (`{ error, fields }`). No es un bug crítico pero hay inconsistencia de formato entre errores de parsing y errores de validación.

---

### T5: companyName excede longitud máxima (> 200 chars)
- **Input:** `companyName` de 201 caracteres
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "companyName": "El nombre de empresa no puede exceder 100 caracteres"
  }
}
```
- **Resultado:** PASS
- **⚠️ Discrepancia documentación:** El Swagger DTO declara `maxLength: 200` pero la validación real rechaza > 100 caracteres. El mensaje dice "100 caracteres". **El Swagger está desactualizado.**

---

### T6: Datos válidos sin captchaToken (CAPTCHA activo)
- **Input:** Datos completamente válidos, sin `captchaToken`
- **Esperado:** 403
- **Obtenido:** ✅ 403
- **Body:**
```json
{
  "error": "El challenge de seguridad no fue superado. Intenta nuevamente."
}
```
- **Resultado:** PASS — CAPTCHA activo en stage dev, bloquea correctamente antes de tocar la DB.

---

### T7: Email duplicado
- **Input:** `email: "test@empresa.com"` (email potencialmente registrado)
- **Esperado:** 409
- **Obtenido:** ⚠️ 403
- **Body:**
```json
{
  "error": "El challenge de seguridad no fue superado. Intenta nuevamente."
}
```
- **Resultado:** FAIL (esperado) — **No es un bug.** El CAPTCHA se valida ANTES de verificar unicidad del email. En stage dev con CAPTCHA activo, es imposible llegar al check de email duplicado sin un token CAPTCHA válido. El flujo de validación es correcto: CAPTCHA → unicidad → creación.
- **Para probar 409 real:** Requiere un token CAPTCHA válido del frontend. Se delega al QA humano.

---

### T8: Password sin mayúscula
- **Input:** `password: "password1"` (sin mayúscula)
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "password": "La contraseña debe contener al menos una letra mayúscula"
  }
}
```
- **Resultado:** PASS — Mensaje específico y claro.

---

### T9: Password sin número
- **Input:** `password: "Password"` (sin número)
- **Esperado:** 400
- **Obtenido:** ✅ 400
- **Body:**
```json
{
  "error": "Datos de registro inválidos",
  "fields": {
    "password": "La contraseña debe contener al menos un número"
  }
}
```
- **Resultado:** PASS — Mensaje específico y claro.

---

### T10: GET /auth/register (método incorrecto)
- **Input:** `GET /auth/register`
- **Esperado:** 404
- **Obtenido:** ✅ 404
- **Body:**
```json
{
  "message": "Cannot GET /auth/register",
  "error": "Not Found",
  "statusCode": 404
}
```
- **Resultado:** PASS — El endpoint solo acepta POST.

---

## Pruebas Manuales — Resultados

**Frontend:** `https://d1z7dsgvuqduin.cloudfront.net`  
**Ejecutadas por:** QA humano (sesión interactiva guiada)

### M1: Registro completo end-to-end
- **Pasos:** Wizard 3 pasos con datos válidos + CAPTCHA real
- **Esperado:** Animación de éxito → redirect post-registro → cookie `refreshToken` httpOnly
- **Resultado:** ✅ PASS

### M2: Email duplicado con CAPTCHA real
- **Pasos:** Registrar con email ya existente + CAPTCHA válido
- **Esperado:** Error 409 con mensaje "Ya existe una cuenta con este email. ¿Deseas iniciar sesión?"
- **Resultado:** ✅ PASS — El mensaje de error se muestra correctamente en el formulario sin crash ni redirect.

### M3: Responsive mobile (viewport 375px)
- **Pasos:** DevTools → iPhone SE (375px) → recargar `/register`
- **Esperado:** Columna marketing oculta, header con logo visible, wizard usable sin overflow
- **Resultado:** ✅ PASS

### M4: Red lenta — protección contra doble submit
- **Pasos:** DevTools → Slow 3G → completar wizard → click Crear cuenta → observar botón
- **Esperado:** Botón deshabilitado durante todo el vuelo del request
- **Resultado:** ❌ FAIL — Ver bug BUG-01 abajo.

### M5: Animaciones stagger al cargar
- **Pasos:** Desktop > 1024px → hard reload → observar columna marketing
- **Esperado:** Elementos aparecen escalonados (logo → título → subtítulo → 3 bullets)
- **Resultado:** ✅ PASS

---

## Bugs Encontrados

### 🔴 BUG-01 — Doble submit posible bajo red lenta (CAPTCHA timeout)
- **Severidad:** Media
- **Reproducción:** DevTools → Slow 3G → completar wizard → submit → esperar ~10s
- **Comportamiento observado:**
  1. El botón muestra spinner correctamente al hacer submit
  2. Después de unos segundos (timeout del widget reCAPTCHA bajo red lenta), el botón se **re-habilita silenciosamente**
  3. El request original sigue pendiente en Network
  4. Al hacer click de nuevo, se envía un **segundo request** al servidor — confirmado en DevTools Network
- **Causa raíz probable:** El widget de reCAPTCHA tiene un timeout propio. Cuando expira bajo red lenta, el estado del componente se resetea (incluyendo el estado `isLoading` del botón) sin que el request HTTP haya terminado. El botón no está protegido contra este estado intermedio.
- **Impacto:** Posibles registros duplicados o requests concurrentes al mismo endpoint. El backend tiene protección de unicidad por email, pero genera carga innecesaria y puede confundir al usuario.
- **Recomendación:** El estado `isLoading` del botón debe ser independiente del estado del CAPTCHA. Una vez que el usuario hace submit, el botón debe permanecer deshabilitado hasta que el request HTTP complete (éxito o error), independientemente de lo que haga el widget de CAPTCHA.

---

## Hallazgos de API (tests automatizados)

### 🟡 OBS-01 — Inconsistencia de formato en error de parsing JSON
- **Descripción:** Body malformado retorna formato NestJS nativo `{ message, error, statusCode }` en lugar del formato del dominio `{ error }`.
- **Impacto:** Bajo. El frontend puede fallar al parsear el campo `error` en este caso específico.
- **Recomendación:** Agregar `ExceptionFilter` para `BadRequestException` de parsing.

### 🟡 OBS-02 — Swagger desactualizado: maxLength companyName
- **Descripción:** El DTO declara `maxLength: 200` en Swagger pero la validación real rechaza > 100 caracteres.
- **Impacto:** Bajo. Confunde a integradores que lean la documentación.
- **Recomendación:** Corregir `@ApiProperty` en `register.dto.ts` → `maxLength: 100`.

---

## Criterios de Aceptación — Estado Final

| Criterio | Estado |
|----------|--------|
| Validación server-side rechaza campos inválidos (400) | ✅ Verificado |
| Sanitización HTML/XSS en companyName | ✅ Verificado |
| CAPTCHA activo bloquea sin token (403) | ✅ Verificado |
| Password requiere mayúscula y número | ✅ Verificado |
| companyName tiene límite de longitud | ✅ Verificado (100 chars) |
| Body malformado retorna 400 | ✅ Verificado |
| Email duplicado retorna 409 (con CAPTCHA real) | ✅ Verificado |
| Registro completo end-to-end | ✅ Verificado |
| Responsive mobile | ✅ Verificado |
| Botón deshabilitado durante submit bajo red lenta | ❌ Bug encontrado (BUG-01) |
| Animaciones stagger al cargar | ✅ Verificado |

---

## Conclusión

El flujo 2.1 está **funcionalmente sólido**. El backend valida correctamente todos los edge cases de seguridad. El flujo end-to-end completo funciona. Se encontró **1 bug de severidad media** (BUG-01) relacionado con la protección contra doble submit bajo red lenta, y 2 observaciones menores de documentación/formato.

**Veredicto:** ✅ Aprobado con observaciones — BUG-01 debe corregirse antes de producción.

| Categoría | Resultado |
|-----------|-----------|
| Tests API automatizados | 9/10 PASS (T7 es comportamiento esperado) |
| Pruebas manuales | 4/5 PASS |
| Bugs críticos | 0 |
| Bugs medios | 1 (BUG-01) |
| Observaciones menores | 2 (OBS-01, OBS-02) |
