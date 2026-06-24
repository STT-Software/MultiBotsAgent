# QA Report — SL01 Flujo 2.3: Listado de Agentes

**PR:** [#12 — Panel Admin Web — Listado de Agentes](https://github.com/STT-Software/MultiBotsAgent/pull/12)
**Solución:** SL01 — Panel de Administración Web
**Flujo:** 2.3 — Listado de Agentes
**Fecha:** 2026-05-15
**QA:** Agente automatizado + QA humano
**Entorno:** Stage `dev` — CloudFront `https://d1z7dsgvuqduin.cloudfront.net`

---

## Resumen Ejecutivo

| Categoría | Estado |
|-----------|--------|
| Deploy accesible | ✅ PASS |
| Rutas del panel | ✅ PASS |
| Comportamiento con ID inexistente | ⚠️ OBSERVACIÓN |
| Tests unitarios (PR) | ✅ PASS (reportado por dev) |
| Criterios de aceptación automatizables | ✅ 5/5 verificados |
| Pruebas manuales | ✅ 9/10 — 1 bug encontrado |

**Veredicto final:** La implementación cumple todos los criterios de aceptación en desktop. Se encontró **1 bug de usabilidad alto** en mobile: el sidebar no es responsive y bloquea completamente el contenido en viewports < 768px. Requiere corrección antes de considerar la vista mobile como funcional.

---

## Contexto de la PR

### Qué se implementó
Vista completa de listado de agentes (`/agentes`) con:
- Tabla con columnas: Nombre/ID, Tipo, Estado, Vencimiento, Acciones
- Tarjetas de métricas (Agentes Activos, Latencia Media, Token Usage)
- Badges de tipo con colores diferenciados (RAG=azul, Cotizador=amarillo, Agendamiento=púrpura)
- Badges de estado (Activo=verde, Borrador=gris)
- Estado de carga (skeleton animado)
- Estado de error con botón "Reintentar"
- Estado vacío con CTA para crear primer agente
- Servicio mock con delay simulado (800ms agentes, 400ms métricas)

### Capas modificadas
- `apps/web/` únicamente — sin cambios en backend, DB ni infraestructura
- Servicio es **mock** (no conecta a API real)

---

## Pruebas Automatizadas

### 1. Accesibilidad del deploy

| Ruta | HTTP Status | Resultado |
|------|-------------|-----------|
| `/agentes` | 200 | ✅ PASS |
| `/dashboard` | 200 | ✅ PASS |
| `/agentes/crear` | 200 | ✅ PASS |
| `/inbox` | 200 | ✅ PASS |
| `/pedidos` | 200 | ✅ PASS |
| `/metricas` | 200 | ✅ PASS |
| `/agentes/999-id-inexistente` | 404 | ⚠️ VER OBSERVACIÓN OBS-01 |

**Headers verificados:**
- `Content-Type: text/html; charset=utf-8` ✅
- `Cache-Control: s-maxage=31536000` ✅ (caché de CloudFront activo)
- `X-Cache: Hit from cloudfront` ✅

### 2. Contenido SSR de `/agentes`

El HTML inicial entregado por CloudFront contiene:
- Referencias al componente `AgentesListView` ✅
- Spinner de carga (`animate-spin`, `border-emerald`) ✅ — esperado, el componente es `"use client"` (CSR)

**Nota técnica:** El contenido de la tabla se renderiza en el cliente después de que el mock resuelve (~800ms). El SSR solo entrega el shell con el spinner. Correcto dado que `AgentesListView` usa `"use client"` y datos mock asincrónicos.

### 3. Tests unitarios incluidos en la PR

| Suite | Tests | Cobertura |
|-------|-------|-----------|
| `agente-estado-badge.test.tsx` | 3 | Colores activo/borrador, unicidad visual |
| `agente-tipo-badge.test.tsx` | 4 | Colores RAG/Cotizador/Agendamiento, unicidad |
| `agentes-list-view.test.tsx` | 5 | Botón crear siempre visible, estados vacío/datos/error, intercambiabilidad del servicio |
| `use-agentes-list.test.ts` | 5 | Estados mutuamente excluyentes, error, retry, idempotencia retry, orden por fecha |

**Total: 17 tests** — todos passing (reportado por dev).

---

## Pruebas Manuales — Resultados

| # | Test Case | Resultado | Notas |
|---|-----------|-----------|-------|
| TC-01 | Skeleton de carga visible | ✅ PASS | Skeleton animado visible ~800ms antes de los datos |
| TC-02 | Tabla con datos y orden correcto | ✅ PASS | 4 agentes en orden descendente por fecha |
| TC-03 | Badges de tipo con colores diferenciados | ✅ PASS | RAG=azul, Cotizador=amarillo, Agendamiento=púrpura |
| TC-04 | Badges de estado diferenciados | ✅ PASS | Activo=verde con punto, Borrador=gris con punto |
| TC-05 | Tarjetas de métricas | ✅ PASS | 3 cards visibles post-carga, ocultas durante skeleton |
| TC-06 | Botón "Crear agente" siempre visible | ✅ PASS | Presente durante skeleton y post-carga, navega a `/agentes/crear` |
| TC-07 | Hover en filas de la tabla | ✅ PASS | Fondo verde oscuro sutil, cursor pointer |
| TC-08 | Responsive mobile 375px | ❌ FAIL | **Ver BUG-01** |
| TC-09 | Accesibilidad ARIA | ✅ PASS | `aria-label` en botón crear y `aria-hidden` en íconos confirmados. Skeleton verificado por código |
| TC-10 | Navegación desde fila | ✅ PASS | Click en fila navega a `/agentes/{id}`, 404 esperado (flujo 2.5 pendiente) |

**Resultado: 9/10 PASS**

---

## Bugs Encontrados

### 🔴 BUG-01: Sidebar no responsive — bloquea contenido en mobile

**Severidad:** Alta
**Reproducción:** 100%
**Viewport afectado:** ≤ 375px (mobile)

**Descripción:**
En viewport mobile (375px / iPhone SE), el sidebar ocupa todo el ancho de la pantalla. No existe mecanismo para colapsarlo — ni automáticamente al cambiar de viewport, ni manualmente mediante hamburger menu o gesto. El contenido principal (tabla de agentes, métricas, botón crear) queda completamente bloqueado detrás del sidebar. Haciendo scroll se puede detectar que el contenido existe, pero es inaccesible.

**Pasos para reproducir:**
1. Abrir `https://d1z7dsgvuqduin.cloudfront.net/agentes`
2. Abrir DevTools → activar modo responsive → viewport 375px
3. Recargar la página

**Resultado actual:** Sidebar ocupa 100% del ancho. Contenido inaccesible.
**Resultado esperado:** Sidebar colapsado o con hamburger menu en mobile. Contenido principal visible.

**Impacto:** La aplicación es inutilizable en dispositivos móviles.

**Nota adicional:** En el panel de red de DevTools se observaron 27 requests con status 404 durante la prueba mobile. Puede estar relacionado con rutas de assets que no resuelven correctamente en ese contexto, o ser rutas RSC de Next.js que fallan. Requiere investigación adicional.

**Acción requerida:** El dev de SL01 debe implementar comportamiento responsive del sidebar (colapso automático en mobile + hamburger menu o drawer).

---

## Observaciones

### ⚠️ OBS-01: Ruta de detalle de agente inexistente retorna 404 genérico de Next.js

**Ruta probada:** `/agentes/999-id-inexistente`
**Resultado:** 404 con página de error genérica de Next.js.

**Contexto:** Esperado para esta fase — la vista de detalle (flujo 2.5) no está implementada. Confirmado también en TC-10: al hacer clic en una fila real navega a `/agentes/1` y muestra 404. Comportamiento correcto hasta que se implemente el flujo 2.5.

**Acción:** Documentar como deuda técnica para el flujo 2.5 (Vista de Detalle), que deberá redirigir al listado con mensaje informativo cuando el agente no exista.

### ℹ️ INFO-01: Servicio es mock — métricas ficticias

El servicio usa datos hardcodeados. Las métricas (24 agentes activos, 342ms latencia, 1.2M tokens) son ficticias. Intencional para esta fase con TODOs explícitos en el código.

### ℹ️ INFO-02: Campo `vencimiento` no está en el modelo de datos de la solución

El tipo `Agente` incluye `vencimiento: string` que no aparece en el modelo definido en `panel-administracion-web.md`. Deberá alinearse con el contrato de la API cuando se integre el backend real.

---

## Criterios de Aceptación — Estado Final

| Criterio | Estado |
|----------|--------|
| La página `/agentes` renderiza sin errores | ✅ PASS |
| Se muestra skeleton durante la carga de datos | ✅ PASS |
| La tabla muestra los agentes con todas las columnas | ✅ PASS |
| Los badges de tipo muestran colores diferenciados | ✅ PASS |
| Los badges de estado distinguen "activo" de "borrador" | ✅ PASS |
| Las tarjetas de métricas muestran datos correctos | ✅ PASS |
| El estado de error muestra mensaje y botón de retry funcional | ✅ PASS (tests unitarios) |
| El estado vacío se muestra cuando no hay agentes | ✅ PASS (tests unitarios) |
| Los tests pasan sin errores | ✅ PASS (reportado por dev) |
| El build completo del monorepo pasa sin errores | ✅ PASS (reportado por dev) |

---

## Próximos Pasos

1. **BUG-01** — Dev de SL01 implementa sidebar responsive con hamburger menu/drawer en mobile. Prioridad alta.
2. **OBS-01** — Documentar como deuda técnica para flujo 2.5 (Vista de Detalle).
3. **INFO-02** — Alinear campo `vencimiento` con contrato de API cuando se integre el backend real.
4. **404s en red (mobile)** — Investigar los 27 requests con 404 observados en DevTools durante la prueba mobile.

---

*Reporte generado por QA Agent + QA humano — STT-Software/MultiBotsAgent — 2026-05-15*
