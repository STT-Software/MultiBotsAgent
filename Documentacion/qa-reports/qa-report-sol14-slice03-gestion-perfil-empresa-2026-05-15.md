# QA Report — Flujo 2.3: Gestión del Perfil de Empresa

**Fecha:** 2026-05-15  
**PR:** [#13 — feat(SL14): Gestión del Perfil de Empresa (flujo 2.3)](https://github.com/STT-Software/MultiBotsAgent/pull/13)  
**Autor PR:** jlamos-stt  
**Mergeada:** 2026-05-14T17:02:39Z → `dev`  
**QA ejecutado por:** Agente QA automatizado + QA humano (jhon99mendoza3)  
**Entorno:** Stage `dev` en AWS

---

## Entorno de Pruebas

| Recurso | URL |
|---------|-----|
| Frontend (CloudFront) | https://d1z7dsgvuqduin.cloudfront.net |
| ServicesApi (NestJS/Fargate) | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com |
| FunctionsApi (Lambdas) | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com |

**Estado del deploy:** ✅ Frontend activo (HTTP 307), ServicesApi activo (responde en todos los endpoints)

---

## Resumen Ejecutivo

| Categoría | Resultado |
|-----------|-----------|
| 🔴 Críticos | 2 |
| 🟡 Advertencias | 3 |
| 🟢 Pasaron | 10 |

**Veredicto:** ⚠️ **BLOQUEANTE** — Hay hallazgos críticos que deben resolverse antes de aprobar el flujo.

---

## Hallazgos Críticos

### 🔴 C01: Endpoints de company-profile retornan 500 sin token (en lugar de 401)

**Severidad:** Crítica  
**Tipo:** Seguridad / Comportamiento incorrecto del middleware  
**Origen:** QA automatizado (API)

**Evidencia:**

```
GET  /company-profile              → HTTP 500 {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
PATCH /company-profile             → HTTP 500 {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
POST  /company-profile/logo/upload-url → HTTP 500 {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
DELETE /company-profile/logo       → HTTP 500 {"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}
```

**Comportamiento esperado:** HTTP 401 `{"error": "UNAUTHORIZED"}` cuando no hay token.

**Comportamiento real:** HTTP 500 con error genérico de servidor.

**Análisis:** El JwtAuthGuard de NestJS no está capturando correctamente el caso de ausencia de token. El error 500 sugiere que el guard está lanzando una excepción no manejada en lugar de retornar 401. Puede deberse a que el `ExceptionFilter` no está registrado globalmente para este módulo, o que el guard intenta acceder a `request.user` antes de validar que el token existe.

**Impacto:** Un atacante que recibe 500 en lugar de 401 puede inferir que el endpoint existe y está activo. El comportamiento inconsistente del guard puede enmascarar otros problemas de autenticación.

**Reproducción:**
```bash
curl -s https://5em5s6gn59.execute-api.us-east-1.amazonaws.com/company-profile
# Resultado: HTTP 500
```

---

### 🔴 C02: Logo de empresa no persiste en MongoDB

**Severidad:** Crítica  
**Tipo:** Pérdida de datos  
**Origen:** QA humano (TC-05)

**Evidencia:**
- El usuario sube una imagen PNG/JPG → aparece el toast "Perfil actualizado correctamente"
- Al recargar la página → la imagen desaparece completamente (vuelve al placeholder)
- En la colección `companies` de MongoDB no existe ningún campo que almacene la URL del logo

**Comportamiento esperado:** El logo se sube a S3, la URL se persiste en el campo `logo` del documento de la empresa, y al recargar se muestra la imagen guardada.

**Comportamiento real:** El upload a S3 parece funcionar (la imagen se muestra en la sesión actual), pero la URL no se persiste en MongoDB. Al recargar, se pierde.

**Impacto:** El usuario cree que guardó su logo pero el dato se pierde. Experiencia de usuario engañosa — el sistema confirma éxito pero no persiste el cambio.

---

## Advertencias

### 🟡 W01: Con token JWT inválido retorna 400 en lugar de 401

**Severidad:** Media  
**Tipo:** Comportamiento incorrecto del middleware de autenticación  
**Origen:** QA automatizado (API)

**Evidencia:**

```
PATCH /company-profile con Authorization: Bearer <token_invalido>
→ HTTP 400 {"message":"Expected property name or '}' in JSON at position 1","error":"Bad Request","statusCode":400}
```

**Comportamiento esperado:** HTTP 401 `{"error": "UNAUTHORIZED", "message": "Token inválido"}`.

**Análisis:** El middleware está intentando hacer `JSON.parse()` sobre el token JWT en algún punto del pipeline. Debe retornar 401 para tokens con firma inválida.

---

### 🟡 W02: Modal de recorte de logo no se cierra al guardar

**Severidad:** Media  
**Tipo:** UX / Bug de UI  
**Origen:** QA humano (TC-05)

**Evidencia:** Al hacer clic en "Guardar cambios" con el logo recortado, el modal de recorte circular permanece activo/visible en lugar de cerrarse automáticamente.

**Comportamiento esperado:** El modal se cierra al confirmar el recorte o al guardar los cambios del perfil.

---

### 🟡 W03: No se puede verificar rechazo de SVG server-side sin token válido

**Severidad:** Baja (bloqueada por C01)  
**Tipo:** Cobertura de prueba incompleta  
**Origen:** QA automatizado (API)

**Contexto:** La validación client-side funciona (el selector de archivos filtra SVG), pero no fue posible verificar que el backend también rechaza SVG porque los requests sin token válido retornan 500/400 antes de llegar a la validación de negocio.

**Acción requerida:** Una vez resuelto C01, verificar:
```bash
curl -s -X POST https://5em5s6gn59.execute-api.us-east-1.amazonaws.com/company-profile/logo/upload-url \
  -H "Authorization: Bearer <token_valido>" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/svg+xml","fileSize":1024}'
# Debe retornar HTTP 400
```

---

## Pruebas Manuales — Resultados

| TC | Escenario | Resultado | Notas |
|----|-----------|-----------|-------|
| TC-01 | Acceso a página de perfil | ✅ Pasó | Todos los campos visibles, email en solo lectura |
| TC-02 | Editar datos y guardar | ✅ Pasó | Persiste al recargar, header se actualiza |
| TC-03 | Validación nombre vacío | ✅ Pasó | Formulario bloquea el envío |
| TC-04 | Validación nombre solo espacios | ✅ Pasó | Tratado como vacío, no se guarda |
| TC-05 | Upload de logo con recorte | ❌ Falló | Logo no persiste + modal no se cierra (C02, W02) |
| TC-06 | Rechazo de SVG (UI) | ✅ Pasó | Selector filtra por PNG/JPG, SVG no aparece |
| TC-07 | Inyección HTML en nombre | ✅ Pasó | Tags sanitizados server-side, solo queda texto plano |
| TC-08 | Botón volver (←) | ✅ Pasó | Navega a la página anterior correctamente |

---

## Pruebas Automatizadas (API) — Resultados

| Test | Escenario | Resultado | Notas |
|------|-----------|-----------|-------|
| A01 | GET /company-profile sin token | ❌ Falló | HTTP 500 en lugar de 401 (C01) |
| A02 | PATCH /company-profile sin token | ❌ Falló | HTTP 500 en lugar de 401 (C01) |
| A03 | POST /company-profile/logo/upload-url sin token | ❌ Falló | HTTP 500 en lugar de 401 (C01) |
| A04 | DELETE /company-profile/logo sin token | ❌ Falló | HTTP 500 en lugar de 401 (C01) |
| A05 | Endpoints con token JWT inválido | ❌ Falló | HTTP 400 JSON parse error (W01) |
| A06 | Frontend activo (CloudFront) | ✅ Pasó | HTTP 307 (redirect a login) |
| A07 | ServicesApi activo | ✅ Pasó | Todos los endpoints responden |
| A08 | CAPTCHA activo en dev | ✅ Pasó | Registro retorna 403 sin CAPTCHA token |
| A09 | Endpoints mapeados correctamente | ✅ Pasó | Ninguno retorna 404 |

---

## Criterios de Aceptación — Estado Final

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| El usuario puede ver y editar datos de empresa | ✅ Pasó | TC-01, TC-02 |
| El email no se puede modificar desde el perfil | ✅ Pasó | TC-01 — campo en solo lectura |
| SVG rechazado (prevención XSS) — client-side | ✅ Pasó | TC-06 — selector filtra extensiones |
| SVG rechazado (prevención XSS) — server-side | 🟡 No verificable | W03 — bloqueado por C01 |
| Sanitización HTML en campos de texto | ✅ Pasó | TC-07 — tags eliminados server-side |
| Logo se sube y persiste | 🔴 FALLA | C02 — URL no se guarda en MongoDB |
| Presigned URLs para upload directo a S3 | 🔴 No verificable | Bloqueado por C01 (API retorna 500) |
| companyId extraído del JWT (no de URL/body) | 🔴 No verificable | Bloqueado por C01 |
| Endpoints protegidos retornan 401 sin token | 🔴 FALLA | C01 — retornan 500 |
| Validación client-side (nombre vacío/espacios) | ✅ Pasó | TC-03, TC-04 |

---

## Acciones Requeridas

### Bloqueantes (antes de aprobar)

| # | Acción | Responsable | Hallazgo |
|---|--------|-------------|----------|
| 1 | Investigar por qué JwtAuthGuard retorna 500 sin token. Revisar ExceptionFilter global y acceso a `request.user` sin validación previa. | DEV | C01 |
| 2 | Persistir URL del logo en el campo `logo` de la colección `companies` al completar el upload a S3. | DEV | C02 |
| 3 | Investigar el 400 "Expected property name" con token JWT inválido — el middleware no debe parsear el token como JSON. | DEV | W01 |

### Post-fix

| # | Acción | Responsable | Hallazgo |
|---|--------|-------------|----------|
| 4 | Cerrar el modal de recorte al confirmar/guardar. | DEV | W02 |
| 5 | Verificar rechazo de SVG server-side con token válido. | QA | W03 |
| 6 | Re-ejecutar pruebas A01-A05 una vez resuelto C01. | QA | C01 |

---

## Notas Adicionales

- El CAPTCHA está activo en `dev` (confirmado: registro retorna 403). Correcto según especificación.
- Los 229 tests del PR (incluyendo 7 property-based tests) pasaron en el entorno local del dev. Los hallazgos C01 y W01 son específicos del deploy en AWS y pueden estar relacionados con la configuración del API Gateway o variables de entorno del stage `dev`.
- La sanitización HTML funciona correctamente — el `CompanyProfileValidator` elimina tags antes de persistir.
- La estructura Screaming Architecture y tipos TypeScript no son verificables desde QA — se asume correcta dado que el build pasó.

---

*Reporte generado el 2026-05-15. Formato Notion-ready: copiar contenido y pegar en Notion.*
