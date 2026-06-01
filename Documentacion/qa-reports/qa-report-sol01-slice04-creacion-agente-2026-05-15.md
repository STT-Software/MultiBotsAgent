# QA Report — SL01 Flujo 2.4: Creación de un Agente

**PR:** [#15 — Formulario de creación de agente con validación y mock](https://github.com/STT-Software/MultiBotsAgent/pull/15)
**Solución:** SL01 — Panel de Administración Web
**Flujo:** 2.4 — Creación de un Agente
**Fecha:** 2026-05-15 (retest: 2026-05-21)
**QA:** Agente automatizado + QA humano
**Entorno:** Stage `dev` — CloudFront `https://d1z7dsgvuqduin.cloudfront.net`

---

## Resumen Ejecutivo

| Categoría | Estado |
|-----------|--------|
| Deploy accesible (`/agentes/crear`) | ✅ PASS |
| Estructura del formulario en SSR | ✅ PASS |
| Ruta destino post-creación (`/agentes`) | ✅ PASS |
| Ruta inválida bajo `/agentes/crear/*` | ✅ PASS |
| Protección de ruta sin autenticación | ✅ PASS |
| Validación client-side (campos vacíos, espacios, parcial) | ✅ PASS |
| Flujo completo de creación | ✅ PASS |
| Selector de tipo — exclusividad visual | ✅ PASS |
| Error simulado + banner cerrable | ✅ PASS |
| Doble submit bloqueado | ✅ PASS |
| Botón Cancelar | ✅ PASS |
| Responsive mobile — cards selector | ❌ FAIL — BUG-01 |
| Responsive mobile — sidebar | ❌ FAIL — BUG-02 (reincidencia) |

**Veredicto final: ✅ APROBADO CON OBSERVACIONES**

La implementación cumple todos los criterios funcionales en desktop (9/10 PASS). Los 2 bugs en mobile son deuda técnica documentada: el sidebar (BUG-02) es responsabilidad del layout compartido y el overflow de cards (BUG-01) es de severidad media. La discrepancia de tipos de agente (HALLAZGO-01) requiere actualización documental. Se aprueba el flujo para avanzar con los siguientes slices.

---

## Contexto de la PR

### Qué se implementó
Página completa de creación de agentes (`/agentes/crear`) con:
- Formulario con campo nombre + selector visual de tipo
- Hook `useCrearAgente` con validación client-side y manejo de loading/error
- Servicio mock `createAgente` con delay simulado de 800ms
- Accesibilidad ARIA (role=radiogroup, aria-checked, aria-invalid, role=alert)
- Redirect a `/agentes` tras creación exitosa
- Banner de error cerrable si el servicio falla

### Archivos modificados (PR #15)
| Archivo | Tipo |
|---------|------|
| `apps/web/src/app/(panel)/agentes/crear/page.tsx` | Nuevo |
| `apps/web/src/features/agentes/components/crear-agente-form.tsx` | Nuevo |
| `apps/web/src/features/agentes/components/tipo-agente-selector.tsx` | Nuevo |
| `apps/web/src/features/agentes/hooks/use-crear-agente.ts` | Nuevo |
| `apps/web/src/features/agentes/services/agentes.service.ts` | Modificado |
| `apps/web/src/features/agentes/types/agentes.types.ts` | Modificado |

### Nota: Deploy actual incluye PRs posteriores
El deploy actual en CloudFront incluye cambios de PRs #16, #17, #18 y #19 (mergeadas después de la #15). La PR #17 (Slice-05 — Detalle de agente) modificó el `tipo-agente-selector.tsx` y cambió los tipos de agente disponibles.

---

## Pruebas Automatizadas

| Test | Resultado | Detalle |
|------|-----------|---------|
| TC-AUTO-01: GET `/agentes/crear` | ✅ PASS | HTTP 200, CloudFront Hit |
| TC-AUTO-02: Estructura SSR | ✅ PASS | Título, subtítulo, STEP 01/01, CrearAgenteForm presentes |
| TC-AUTO-03: GET `/agentes` | ✅ PASS | HTTP 200, destino de redirect válido |
| TC-AUTO-04: Ruta inválida | ✅ PASS | `/agentes/crear/xxx` → HTTP 404 |

---

## Pruebas Manuales — Resultados

| # | Test Case | Resultado | Notas |
|---|-----------|-----------|-------|
| PM-01 | Flujo completo de creación | ✅ PASS | Spinner → redirect a `/agentes`. Sin toast de confirmación (OBS-UX-01) |
| PM-02 | Botón deshabilitado sin campos | ✅ PASS | Botón opaco e inactivo desde el inicio |
| PM-03 | Nombre de solo espacios | ✅ PASS | `.trim()` funciona — botón sigue deshabilitado |
| PM-04 | Nombre válido sin tipo | ✅ PASS | Botón deshabilitado hasta seleccionar tipo |
| PM-05 | Selector de tipo — exclusividad visual | ✅ PASS | Borde verde exclusivo, radio indicator correcto |
| PM-06 | Error simulado + banner cerrable | ✅ PASS | Banner rojo aparece, datos se mantienen, X cierra el banner |
| PM-07 | Doble click bloqueado | ✅ PASS | Spinner aparece y bloquea el botón al primer click |
| PM-08 | Botón Cancelar | ✅ PASS | Navega a `/agentes` sin confirmación |
| PM-09 | Acceso sin autenticación | ✅ PASS | Spinner breve → redirect a `/login`, formulario no visible |
| PM-10 | Responsive mobile 375px | ❌ FAIL | Cards se desbordan + sidebar bloquea contenido |

**Resultado: 9/10 PASS — 1 FAIL (confirmado en retest)**

---

## Bugs Encontrados

### 🔴 BUG-01: Cards del selector de tipo se desbordan en mobile

**Severidad:** Media
**Reproducción:** 100%
**Viewport afectado:** ≤ 375px (mobile)
**Estado:** Sin corrección (confirmado en retest 2026-05-21)

**Descripción:**
En viewport 375px, las cards del selector de tipo se desbordan horizontalmente del contenedor. El layout interno (icono 40px + texto + radio indicator) excede el ancho disponible cuando el sidebar ocupa parte del viewport.

**Causa probable:** Las cards tienen un ancho mínimo implícito que no se adapta al espacio reducido en mobile.

**Acción requerida:** Ajustar padding, tamaño de iconos o layout interno para viewport < 640px.

---

### 🔴 BUG-02: Sidebar bloquea contenido en mobile — reincidencia

**Severidad:** Alta
**Reproducción:** 100%
**Viewport afectado:** ≤ 375px (mobile)
**Estado:** Sin corrección (confirmado en retest 2026-05-21)
**Reincidencia de:** BUG-01 del reporte flujo 2.3 (2026-05-15)

**Descripción:**
El sidebar ocupa todo el ancho en viewport mobile y bloquea completamente el contenido de `/agentes/crear`. No existe mecanismo para colapsarlo. Afecta a TODAS las páginas del panel.

**Acción requerida:** Implementar sidebar responsive en `(panel)/layout.tsx` — hamburger menu o drawer en mobile.

---

## Hallazgos Adicionales

### ⚠️ HALLAZGO-01: Tipos de agente cambiaron sin actualizar documentación

**Severidad:** Media (discrepancia documental)

**Lo que dice la documentación (`panel-administracion-web.md`) y la PR #15:**
- RAG, Cotizador, Agendamiento

**Lo que está desplegado actualmente (post PR #17):**
- RAG, Workflow, Conversacional

**Causa:** La PR #17 (Slice-05 — Detalle de agente) modificó el componente `tipo-agente-selector.tsx` y cambió los tipos disponibles sin actualizar la documentación de la solución ni el modelo de datos.

**Impacto:** La documentación de la solución ya no refleja la realidad del deploy. Cuando se integre con la API real, el modelo de datos (`tipo: "rag" | "cotizador" | "agendamiento"`) no coincidirá con la UI.

**Acción requerida:**
1. Actualizar `panel-administracion-web.md` con los nuevos tipos
2. Actualizar el modelo de datos para reflejar `"rag" | "workflow" | "conversacional"`
3. Verificar que el backend (cuando se implemente) use los mismos valores

---

## Observaciones

### ⚠️ OBS-UX-01: Redirect silencioso post-creación — sin feedback de confirmación

**Severidad:** Media (UX)
**Descripción:** Tras crear un agente, el sistema redirige a `/agentes` sin toast ni snackbar de confirmación. El usuario queda sin certeza de si la acción se completó.
**Recomendación:** Agregar toast de éxito ("Agente creado correctamente") al llegar a `/agentes` post-creación.

### ℹ️ OBS-01: Guard de autenticación es client-side

**Severidad:** Baja (informativa)
**Descripción:** El servidor entrega HTML sin verificar sesión. El redirect a login ocurre client-side (spinner breve). Formulario no queda visible — aceptable.

### ℹ️ OBS-02: Sin validación de longitud máxima en nombre

**Severidad:** Baja
**Descripción:** El hook no valida longitud máxima. Sin impacto en fase mock, a resolver antes de integración con API real.

---

## Criterios de Aceptación — Estado Final

| Criterio | Estado |
|----------|--------|
| La página `/agentes/crear` renderiza sin errores | ✅ PASS |
| El formulario muestra validación al intentar enviar vacío | ✅ PASS |
| El selector de tipo muestra 3 opciones con iconos diferenciados | ✅ PASS (tipos actualizados: RAG, Workflow, Conversacional) |
| Al seleccionar un tipo, el radio indicator se activa visualmente | ✅ PASS |
| El botón "Crear Agente" está deshabilitado hasta llenar nombre + tipo | ✅ PASS |
| Al enviar, se muestra spinner de loading y luego redirige a `/agentes` | ✅ PASS |
| El banner de error se muestra si el servicio falla y se puede cerrar | ✅ PASS |
| El build completo del monorepo pasa sin errores | ✅ PASS (reportado por dev) |

---

## Próximos Pasos

1. **BUG-02 (Alta)** — Implementar sidebar responsive en `(panel)/layout.tsx`. Reincidencia desde flujo 2.3 — prioridad alta, bloquea usabilidad mobile de todo el panel.
2. **BUG-01 (Media)** — Ajustar layout de cards del selector para viewport < 640px.
3. **HALLAZGO-01 (Media)** — Actualizar documentación de la solución con los nuevos tipos de agente (RAG, Workflow, Conversacional).
4. **OBS-UX-01 (Media)** — Agregar toast de confirmación post-creación.
5. **OBS-02 (Baja)** — Agregar validación de longitud máxima antes del slice de integración con API real.

---

*Reporte generado por QA Agent + QA humano — STT-Software/MultiBotsAgent — 2026-05-21 (retest)*
