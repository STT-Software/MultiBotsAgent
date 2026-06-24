# QA Report — SL01 Flujo 2.3: Listado de Agentes (2da sesión)

**PR:** [#12 — Panel Admin Web — Listado de Agentes](https://github.com/STT-Software/MultiBotsAgent/pull/12)
**Solución:** SL01 — Panel de Administración Web
**Flujo:** 2.3 — Listado de Agentes
**Fecha:** 2026-05-22
**QA:** Agente automatizado + QA humano
**Entorno:** Stage `dev` — CloudFront `https://d1z7dsgvuqduin.cloudfront.net`
**Sesión:** 2da ejecución (re-test completo)

---

## Resumen Ejecutivo

| Categoría | Estado |
|-----------|--------|
| Deploy accesible | ✅ PASS |
| Pruebas manuales desktop | ✅ 9/9 PASS |
| Prueba responsive mobile | ❌ FAIL — BUG-01 sin corregir |
| Vista de detalle (descubrimiento) | ⚠️ Discrepancias con especificación |

**Veredicto:** Todos los criterios de aceptación del flujo 2.3 se cumplen en desktop. El BUG-01 (sidebar no responsive) reportado en la sesión anterior **no fue corregido** — sigue bloqueando el contenido en mobile. Se descubrió que la vista de detalle (flujo 2.5) ya está implementada con discrepancias respecto a la especificación.

---

## Pruebas Manuales — Resultados

| # | Test Case | Resultado | Notas |
|---|-----------|-----------|-------|
| TC-01 | Skeleton de carga visible | ✅ PASS | Skeleton animado visible ~800ms |
| TC-02 | Tabla con datos y orden correcto | ✅ PASS | 4 agentes en orden descendente por fecha |
| TC-03 | Badges de tipo con colores diferenciados | ✅ PASS | RAG=azul, Cotizador=amarillo, Agendamiento=púrpura |
| TC-04 | Badges de estado diferenciados | ✅ PASS | Activo=verde con punto, Borrador=gris con punto |
| TC-05 | Tarjetas de métricas | ✅ PASS | 3 cards post-carga, ocultas durante skeleton |
| TC-06 | Botón "Crear agente" siempre visible | ✅ PASS | Presente en ambos estados, navega a `/agentes/crear` |
| TC-07 | Hover en filas de la tabla | ✅ PASS | Fondo verde oscuro sutil, cursor pointer |
| TC-08 | Responsive mobile 375px | ❌ FAIL | BUG-01 reincidente — sin corrección |
| TC-09 | Accesibilidad ARIA | ✅ PASS | `aria-label` en botón crear, `aria-hidden` en íconos |
| TC-10 | Navegación desde fila | ✅ PASS | Navega a `/agentes/{id}` — vista de detalle ya implementada |

**Resultado: 9/10 PASS**

---

## Bugs

### 🔴 BUG-01: Sidebar no responsive — bloquea contenido en mobile (REINCIDENTE)

**Severidad:** Alta
**Estado:** SIN CORREGIR desde sesión anterior (2026-05-15)
**Reproducción:** 100%
**Viewport afectado:** ≤ 375px (mobile)

**Descripción:**
En viewport mobile (375px / iPhone SE), el sidebar ocupa todo el ancho de la pantalla. No existe mecanismo para colapsarlo — ni automáticamente ni manualmente. No hay hamburger menu. El contenido principal queda completamente bloqueado.

**Pasos para reproducir:**
1. Abrir `https://d1z7dsgvuqduin.cloudfront.net/agentes`
2. DevTools → modo responsive → viewport 375px
3. Recargar

**Resultado actual:** Sidebar ocupa 100% del ancho. Contenido inaccesible.
**Resultado esperado:** Sidebar colapsado con hamburger menu/drawer en mobile.

**Impacto:** Aplicación inutilizable en dispositivos móviles.

---

## Nuevas Observaciones

### ⚠️ OBS-02: Vista de detalle ya implementada — discrepancias con especificación

Al hacer clic en un agente desde el listado, se navega a `/agentes/{id}` y se muestra una vista de detalle completa (no el 404 esperado de la sesión anterior). Esto indica que el flujo 2.5 fue implementado entre sesiones.

**Lo que se observa en la vista de detalle:**

| Elemento | En el deploy | En la especificación (flujo 2.5) |
|----------|-------------|----------------------------------|
| Tabs | General, Personalidad, Canal, Base de Conocimiento | ✅ Coincide |
| Nombre editable | ✅ Sí | ✅ Coincide |
| Estado actual | "Borrador" con descripción | ✅ Coincide |
| Tipos de agente | **RAG, Workflow, Conversacional** | ❌ Debería ser **RAG, Cotizador, Agendamiento** |
| Card "Eficiencia 98.4%" | Presente | ❌ No está en el modelo de datos |
| Botón "Eliminar agente" | Presente | ✅ Coincide con flujo 2.6 |
| Botón "Guardar cambios" | Presente | ✅ Coincide |

**Discrepancias críticas:**

1. **Tipos de agente inconsistentes:** El listado muestra "RAG / Cotizador / Agendamiento" pero la vista de detalle muestra "RAG / Workflow / Conversacional". Esto es una inconsistencia entre vistas que confunde al usuario.

2. **Card de "Eficiencia":** Muestra 98.4% pero no está definida en el modelo de datos ni en la especificación. Parece ser un dato mock sin respaldo.

**Acción requerida:** El dev debe alinear los tipos de agente entre el listado y la vista de detalle. La especificación define: `"rag" | "cotizador" | "agendamiento"`.

### ℹ️ OBS-01 (actualización): Ruta de detalle ya no retorna 404

La observación OBS-01 de la sesión anterior (404 en `/agentes/{id}`) ya no aplica — la vista de detalle fue implementada y responde correctamente.

---

## Criterios de Aceptación — Estado Final

### Flujo 2.3 — Listado de Agentes

| Criterio | Estado |
|----------|--------|
| La página `/agentes` renderiza sin errores | ✅ PASS |
| Se muestra skeleton durante la carga de datos | ✅ PASS |
| La tabla muestra los agentes con nombre, tipo, estado y fecha | ✅ PASS |
| Los badges de tipo muestran colores diferenciados | ✅ PASS |
| Los badges de estado distinguen "activo" de "borrador" | ✅ PASS |
| Las tarjetas de métricas muestran datos correctos | ✅ PASS |
| El estado de error muestra mensaje y botón de retry funcional | ✅ PASS (tests unitarios) |
| El estado vacío se muestra cuando no hay agentes | ✅ PASS (tests unitarios) |
| Desde el listado se puede acceder a la vista de detalle | ✅ PASS |
| Desde el listado se puede crear uno nuevo | ✅ PASS |

---

## Comparativa entre sesiones

| Aspecto | Sesión 1 (2026-05-15) | Sesión 2 (2026-05-22) |
|---------|----------------------|----------------------|
| Desktop funcional | ✅ | ✅ |
| Mobile responsive | ❌ BUG-01 | ❌ BUG-01 (sin corregir) |
| Vista de detalle | 404 (no implementada) | ✅ Implementada con discrepancias |
| Tipos de agente consistentes | ✅ | ❌ Inconsistencia listado vs detalle |

---

## Próximos Pasos

1. **BUG-01 (URGENTE)** — Implementar sidebar responsive. Reincidente, sin corrección en 7 días.
2. **OBS-02** — Alinear tipos de agente entre listado ("Cotizador", "Agendamiento") y detalle ("Workflow", "Conversacional"). Usar los de la especificación.
3. **OBS-02** — Evaluar si la card "Eficiencia 98.4%" debe existir o eliminarse (no está en la spec).

---

*Reporte generado por QA Agent + QA humano — STT-Software/MultiBotsAgent — 2026-05-22*
