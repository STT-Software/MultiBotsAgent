# QA Report — SL01 Flujo 2.2: Dashboard Principal

**Solución:** Panel de Administración Web (SL01)
**Flujo:** 2.2 — Dashboard Principal
**PR:** [#10 — feat(panel-admin-web): Slice 02 — Dashboard Principal](https://github.com/STT-Software/MultiBotsAgent/pull/10)
**Mergeada:** 2026-05-13 · `dev`
**Autor:** ogomez-stt
**Fecha QA:** 2026-05-14 (segunda ronda con nuevo deploy)
**QA ejecutado por:** Kiro (automatizado) + QA humano ✅

---

## Entorno de pruebas

| Recurso | URL |
|---------|-----|
| Frontend (CloudFront) | https://d1z7dsgvuqduin.cloudfront.net |
| Services API (NestJS) | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com |
| Functions API (Lambdas) | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com |

---

## Resumen ejecutivo

| Categoría | Estado |
|-----------|--------|
| Deploy activo | ✅ OK |
| Rutas del panel | ✅ OK |
| Tests del dashboard (PR #10) | ✅ 7/7 PASAN |
| Tests change-password (PR #14) | ✅ 37/37 PASAN (tras build local) |
| Tests de regresión (login-form / register-form) | ⚠️ 18 fallos — deuda técnica, no relacionados con esta PR |
| Pruebas manuales (navegador) | ✅ Completadas |

**Veredicto:** ⚠️ **APROBADO CON BLOQUEANTE** — El flujo 2.2 funciona correctamente en todos los escenarios funcionales. Sin embargo, BUG-01 (pérdida de sesión al recargar) persiste porque el deploy en CloudFront no incluye el fix de la PR #14. El bundle desplegado no contiene `setLoading` ni `SessionCookie` — confirmado por inspección del JS bundle en producción.

---

## 1. Verificación del deploy

| Ruta | HTTP | Estado |
|------|------|--------|
| `/` (raíz) | 200 | ✅ |
| `/login` | 200 | ✅ |
| `/dashboard` | 200 | ✅ |
| `/agentes` | 200 | ✅ |

**Nota técnica:** El dashboard es un Client Component (`'use client'`). El HTML base entrega un spinner de carga; el contenido real se hidrata via JavaScript. Comportamiento esperado para Next.js App Router.

---

## 2. Tests automatizados

### Tests del Dashboard (PR #10) — ✅ 7/7 PASAN

| Test | Resultado |
|------|-----------|
| `useAgentesSummary` — total === activos + borradores (consistencia) | ✅ |
| `useAgentesSummary` — siempre en exactamente 1 de 3 estados (completitud) | ✅ |
| `useAgentesSummary` — estado error: loading=false, error!=null, data=null | ✅ |
| `useAgentesSummary` — retry() después de error transiciona a success | ✅ |
| `DashboardView` — QuickActions y NavCards visibles aunque API falle (independencia) | ✅ |
| `DashboardView` — botón Reintentar ejecuta retry (idempotencia) | ✅ |
| `DashboardView` — muestra KPI cards en estado success | ✅ |

### Tests de regresión — ⚠️ 18 fallos (deuda técnica, no relacionados con PR #10)

| Suite | Fallos | Causa raíz |
|-------|--------|------------|
| `login-form` | 15/15 | Tests desactualizados — el componente fue refactorizado en PR #14 |
| `register-form` | 3/34 | Tests desactualizados — flujo post-registro cambió con PR #11 (verify-email) |

Estos fallos son deuda técnica acumulada. No afectan el funcionamiento del dashboard ni del deploy.

---

## 3. Criterios de aceptación — Estado

| Criterio | Verificado por | Estado |
|----------|---------------|--------|
| Muestra cantidad de agentes (total, activos, borradores) | Test unitario + manual | ✅ |
| Permite navegar a "Crear agente" desde el dashboard | Test unitario + manual | ✅ |
| Muestra estado de error con opción de reintentar si la API no responde | Test unitario | ✅ |
| NavCards y QuickActions visibles aunque la API falle | Test unitario | ✅ |
| Retry transiciona de error a success correctamente | Test unitario | ✅ |
| Consistencia de conteos (total = activos + borradores) | Test unitario | ✅ |
| El deploy responde en `/dashboard` | Verificación HTTP | ✅ |
| Contenido renderizado correctamente en navegador | Prueba manual | ✅ |
| Animaciones stagger al cargar | Prueba manual | ✅ |
| Dot pulsante en "Agentes activos" | Prueba manual | ✅ |
| Hover glow en KPI cards y NavCards | Prueba manual | ✅ |
| Protección de rutas sin sesión | Prueba manual | ✅ |
| Persistencia de sesión al recargar | Prueba manual | ❌ BUG-01 |

---

## 4. Pruebas manuales — Resultados

### TC-01: Persistencia de sesión al recargar — ❌ FALLA (BUG-01)

Al recargar `/dashboard` con F5, la sesión se pierde y redirige a `/login`. El usuario debe re-autenticarse en cada recarga.

**Causa confirmada:** Inspección del bundle JS en CloudFront confirma que el código desplegado no contiene `setLoading` ni `SessionCookie` — el fix de la PR #14 no está en el deploy actual.

### TC-02: Carga visual del dashboard — ✅ Pasó

- Skeleton animado visible durante la carga (~500ms)
- 3 KPI cards: "Total de agentes" (5), "Agentes activos" (3), "Agentes en borrador" (2)
- Dot verde pulsante en "Agentes activos"
- Barra de progreso gradiente en "Agentes en borrador"
- Indicador "+12%" en cada card
- Animaciones stagger escalonadas al aparecer

### TC-03: QuickActions y NavCards — ✅ Pasó

- Botón "Crear agente" navega correctamente a `/agentes/crear`
- Las 5 NavCards (Agentes, Inbox, Pedidos, Historial, Métricas) navegan a sus rutas
- Hover glow emerald visible al pasar el cursor

### TC-04: Acceso sin sesión → redirect a login — ✅ Pasó

Navegar a `/dashboard` sin sesión activa redirige correctamente a `/login`.

---

## 5. Hallazgos

### 🔴 BLOQUEANTE

**BUG-01: Pérdida de sesión al recargar la página**
- **Síntoma:** Al recargar `/dashboard` con F5, la sesión se pierde y redirige a `/login`
- **Causa raíz:** El deploy en CloudFront no incluye el fix de persistencia de sesión de la PR #14. Verificado por inspección del bundle JS — no contiene `setLoading` ni `SessionCookie`
- **Fix disponible:** ✅ Código correcto ya en `dev` (PR #14 mergeada 2026-05-14 19:04 UTC)
- **Acción requerida:** Redesplegar el frontend — `sst deploy --stage dev`
- **Impacto:** El usuario debe re-autenticarse en cada recarga. No es pérdida de datos ni vulnerabilidad de seguridad, pero degrada significativamente la experiencia de uso

### ⚠️ ADVERTENCIA

**W-01: 18 tests de regresión fallando**
- `login-form` (15 fallos) y `register-form` (3 fallos) tienen tests desactualizados
- Causa: refactorizaciones de PRs #11 y #14 no actualizaron los tests correspondientes
- No afectan el dashboard ni el deploy
- Acción: crear issue para actualizar los tests

### 🔵 OBSERVACIÓN

**O-01: Estado de error del dashboard no testeable manualmente en esta fase**
- `fetchAgentes()` usa datos mock hardcodeados — no hay fetch real de red
- El estado de error está correctamente implementado y cubierto por tests unitarios (pasan)
- Será testeable cuando el backend de agentes (slice 03) esté conectado

---

## 6. Veredicto final

| Criterio | Estado |
|----------|--------|
| Dashboard carga correctamente | ✅ |
| KPIs muestran datos (mock) | ✅ |
| Animaciones y diseño visual | ✅ |
| QuickActions navega a `/agentes/crear` | ✅ |
| NavCards navegan a sus rutas | ✅ |
| Protección de rutas sin sesión | ✅ |
| Persistencia de sesión al recargar | ❌ BUG-01 — deploy incompleto |
| Tests del dashboard | ✅ 7/7 |

**Decisión:** ⚠️ **APROBADO CON BLOQUEANTE** — El flujo 2.2 es funcional. BUG-01 bloquea la experiencia de uso pero tiene fix disponible. Requiere redespliegue del frontend antes de considerar el flujo completo como listo.

**Acción requerida:** `sst deploy --stage dev` para incluir el fix de PR #14 en CloudFront, luego verificar que la recarga mantiene la sesión.

---

*Reporte generado por Kiro QA — 2026-05-14 (segunda ronda)*
*Pruebas automatizadas: Kiro | Pruebas manuales: QA humano*
