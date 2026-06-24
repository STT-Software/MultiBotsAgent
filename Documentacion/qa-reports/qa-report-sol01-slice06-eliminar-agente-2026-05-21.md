# QA Report — Panel Admin Web / Slice 06: Eliminar Agente

**Fecha:** 2026-05-21
**PR:** [#18 — SL01/Slice-06 Eliminar agente: diálogo, menú y hook](https://github.com/STT-Software/MultiBotsAgent/pull/18)
**Stage:** `dev`
**Ejecutado por:** QA Agent (análisis de código + guía) + QA humano (pruebas manuales)

---

## 🎯 Veredicto

**🟡 APROBADO CON OBSERVACIONES — Se puede promover, pero hay correcciones recomendadas.**

El flujo principal de eliminación funciona correctamente en todos sus caminos (listado, detalle, cancelación, bloqueo durante operación). Se detectaron **5 hallazgos**: ninguno es bloqueante para producción, pero 2 tienen impacto en accesibilidad y UX que conviene corregir antes de que el módulo tenga usuarios reales.

| ID | Severidad | Hallazgo | Bloqueante |
|----|-----------|----------|------------|
| BUG-1 | 🟡 Media | Menú contextual cortado en la última fila de la tabla (`overflow-hidden`) | No |
| BUG-2 | 🟡 Media | Toast "Agente eliminado" queda fijo permanentemente (no se auto-descarta) | No |
| BUG-3 | 🟢 Baja | Toast de éxito no aparece al eliminar desde la vista de detalle | No |
| BUG-4 | 🟡 Media | Focus trap incompleto — el foco escapa del modal al contenido detrás del backdrop | No |
| BUG-5 | 🟢 Baja | Cursor no cambia a `pointer` en botones "Eliminar" del menú y vista de detalle | No |

---

## Entorno de pruebas

| Recurso | URL | Estado |
|---------|-----|--------|
| Frontend (CloudFront) | https://d1z7dsgvuqduin.cloudfront.net | ✅ Activo |
| ServicesApi (NestJS/Fargate) | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com | No aplica (slice sin backend) |
| FunctionsApi (Lambdas) | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com | No aplica (slice sin backend) |
| Usuario de prueba | `jhon99mendoza@gmail.com` | ✅ Sesión activa |

---

## Resumen ejecutivo

| Dimensión | Resultado |
|-----------|-----------|
| Menú contextual ⋮ en filas del listado | ✅ OK (con observación BUG-1 en última fila) |
| Apertura del diálogo con nombre correcto | ✅ OK |
| Cancelar / Escape / Backdrop cierran sin eliminar | ✅ OK |
| Bloqueo del diálogo durante eliminación | ✅ OK |
| Doble clic no envía requests duplicados | ✅ OK |
| Eliminación desde listado actualiza la tabla | ✅ OK (con observación BUG-2 en toast) |
| Eliminación desde detalle redirige a `/agentes` | ✅ OK (con observación BUG-3 en toast) |
| Click en ⋮ no navega al detalle (stopPropagation) | ✅ OK |
| Empty state al eliminar último agente | ✅ OK |
| Accesibilidad — focus trap en modal | ❌ BUG-4 |
| Cursor pointer en botones de eliminar | ❌ BUG-5 |

---

## ⚠️ Nota sobre pruebas automatizadas

Las pruebas E2E con Playwright y los tests unitarios del hook `useEliminarAgente` **no se ejecutaron** por las siguientes razones:

1. **Sin Playwright instalado:** `apps/web/package.json` no incluye Playwright como dependencia. Instalarlo requeriría modificar el monorepo, lo cual está fuera del alcance de una sesión de QA.
2. **Servicio 100% mock:** `deleteAgente` usa `MOCK_AGENTES.splice()` en memoria del bundle del cliente. No hay endpoint real en `ServicesApi` ni `FunctionsApi` para esta slice, por lo que las pruebas de API con `curl` no aplican.
3. **Autenticación requerida:** `/agentes` está bajo el layout `(panel)` con guard de sesión client-side. Los tests E2E necesitarían un flujo de login previo con credenciales reales del stage `dev`, lo cual añade complejidad de setup sin beneficio proporcional dado que el servicio es mock.
4. **Cobertura manual suficiente:** Los 12 escenarios ejecutados manualmente cubren todos los criterios de aceptación de la PR y los edge cases sugeridos por el dev.

---

## 🐛 Bugs detectados

### 🟡 BUG-1: Menú contextual cortado en la última fila de la tabla

**Severidad:** Media
**Reproducible:** Sí, al 100% en la fila 4 ("Asistente Ventas")
**TC afectado:** TC-01, TC-12

**Descripción:**
Al hacer clic en el ⋮ de la última fila del listado, el menú desplegable queda visualmente cortado por el borde inferior del contenedor de la tabla. Solo se ve una franja pequeña del botón "Eliminar". El área clickeable también está parcialmente recortada, aunque con precisión se puede activar.

**Causa raíz (verificada en código):**
`apps/web/src/features/agentes/components/agentes-table.tsx:12`

```tsx
<div className="w-full rounded-lg overflow-hidden border" ...>
```

El `overflow-hidden` es necesario para los bordes redondeados del contenedor, pero recorta los elementos con `position: absolute` que se desbordan hacia abajo (el dropdown del menú contextual).

**Impacto en producción:** Afectará SIEMPRE a la última fila visible de cualquier listado, independientemente del número de agentes. Con paginación, el problema se repetirá en la última fila de cada página.

**Fix sugerido (en orden de calidad):**
1. **Portal de React** (ideal): renderizar el menú en `document.body` con coordenadas absolutas calculadas desde `getBoundingClientRect()`. Elimina el problema de clipping por completo.
2. **Detección de posición**: calcular si la fila es la última visible y abrir el menú hacia arriba (`bottom: 100%`) en lugar de hacia abajo (`top: 100%`).
3. **Separar el clip del overflow**: usar `clip-path` o un wrapper adicional para los bordes redondeados sin afectar el overflow de los hijos.

---

### 🟡 BUG-2: Toast "Agente eliminado" queda fijo permanentemente

**Severidad:** Media
**Reproducible:** Sí, al 100%
**TC afectado:** TC-05

**Descripción:**
Después de eliminar un agente desde el listado, aparece el toast verde "Agente eliminado exitosamente" en la esquina inferior derecha. Este toast **nunca desaparece** — permanece visible indefinidamente hasta que el usuario recarga la página.

**Causa raíz (verificada en código):**
`apps/web/src/features/agentes/hooks/use-eliminar-agente.ts`

El estado `success` se setea en `true` al eliminar pero solo se resetea a `false` cuando se llama `abrir()` de nuevo. No hay `setTimeout` ni mecanismo de auto-dismiss.

Contraste con `useEditarAgente` que sí implementa el auto-reset:
```ts
// useEditarAgente — SÍ tiene auto-reset ✅
useEffect(() => {
  if (success || error) {
    const timer = setTimeout(() => resetStatus(), 3000);
    return () => clearTimeout(timer);
  }
}, [success, error, resetStatus]);

// useEliminarAgente — NO tiene auto-reset ❌
// success queda en true hasta que se llama abrir() de nuevo
```

**Fix sugerido:**
Agregar en `AgentesListView` (o en el propio hook) un `useEffect` que limpie `success` después de 3 segundos:
```tsx
useEffect(() => {
  if (!eliminar.success) return;
  const timer = setTimeout(() => eliminar.resetSuccess?.(), 3000);
  return () => clearTimeout(timer);
}, [eliminar.success]);
```

---

### 🟢 BUG-3: Toast de éxito no aparece al eliminar desde la vista de detalle

**Severidad:** Baja
**Reproducible:** Sí, al 100%
**TC afectado:** TC-08

**Descripción:**
Al eliminar un agente desde `/agentes/[id]`, la eliminación funciona correctamente y la redirección a `/agentes` ocurre, pero el toast verde "Agente eliminado exitosamente" **nunca se muestra**.

**Causa raíz (verificada en código):**
`apps/web/src/features/agentes/components/agente-detalle-view.tsx`

El callback `onSuccess` llama `router.push("/agentes")` inmediatamente después de que `success` se setea en `true`. Esto desmonta el componente antes de que React pueda renderizar el toast:

```tsx
// El componente se desmonta antes del render del toast
const eliminar = useEliminarAgente(() => {
  router.push("/agentes"); // ← desmonta AgenteDetalleView inmediatamente
});

{eliminar.success && <Toast />} // ← nunca se ejecuta
```

**Fix sugerido:**
```tsx
// Opción A: delay antes de navegar
const eliminar = useEliminarAgente(() => {
  setTimeout(() => router.push("/agentes"), 1500);
});

// Opción B: pasar query param y mostrar toast en AgentesListView
router.push("/agentes?deleted=true");
// En AgentesListView: leer el param y mostrar toast
```

---

### 🟡 BUG-4: Focus trap incompleto — el foco escapa del modal

**Severidad:** Media (Accesibilidad — WCAG 2.1 criterio 2.1.2)
**Reproducible:** Sí, al 100%
**TC afectado:** TC-11

**Descripción:**
Con el diálogo de confirmación abierto, al presionar `Tab` repetidamente el foco sale del modal y navega por el contenido detrás del backdrop (sidebar, filas de la tabla, botones del header). Un usuario de teclado puede activar accidentalmente elementos de la página mientras el modal está abierto.

**Nota positiva:** El foco inicial sí va al botón "Cancelar" al abrir el diálogo. `Enter` sobre "Eliminar" sí confirma la eliminación. Solo falta el ciclo de Tab.

**Causa raíz (verificada en código):**
`apps/web/src/features/agentes/components/eliminar-agente-dialog.tsx`

El comentario dice "Focus trap básico" pero solo implementa el focus inicial, no el ciclo:
```tsx
// Solo hace focus al abrir — NO es un focus trap real
useEffect(() => {
  if (isOpen && cancelButtonRef.current) {
    cancelButtonRef.current.focus(); // ← solo esto
  }
}, [isOpen]);
// Falta: interceptar Tab/Shift+Tab para ciclar dentro del modal
```

**Fix sugerido:**
```tsx
useEffect(() => {
  if (!isOpen) return;
  const focusable = dialogRef.current?.querySelectorAll(
    'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable?.[0] as HTMLElement;
  const last = focusable?.[focusable.length - 1] as HTMLElement;

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', handleTab);
  return () => document.removeEventListener('keydown', handleTab);
}, [isOpen]);
```

O usar `focus-trap-react` para manejar todos los edge cases.

---

### 🟢 BUG-5: Cursor no cambia a `pointer` en botones "Eliminar" del menú y detalle

**Severidad:** Baja (UX cosmético)
**Reproducible:** Sí, al 100%
**TC afectado:** TC-12 (hallazgo adicional)

**Descripción:**
Al pasar el mouse sobre el botón "Eliminar" del menú contextual (⋮) y sobre el botón "Eliminar agente" en la vista de detalle, el cursor permanece como flecha en lugar de cambiar a manito (`pointer`). Los botones del modal de confirmación sí muestran el cursor correcto.

**Causa raíz (verificada en código):**
- `agente-row-menu.tsx` — botón "Eliminar" del menú: sin `cursor` en el `style`
- `agente-detalle-view.tsx` — botón "Eliminar agente" del header: sin `cursor` en el `style`
- `eliminar-agente-dialog.tsx` — botones del modal: **sí tienen** `cursor: deleting ? "not-allowed" : "pointer"` ✅

**Fix:** Agregar `cursor: "pointer"` al `style` de ambos botones afectados.

---

## 📋 Detalle de Test Cases ejecutados

### Sesión guiada — QA humano

| ID | Nombre | Resultado |
|----|--------|-----------|
| TC-01 | Menú ⋮ aparece en todas las filas y cierra con clic fuera / Escape | ✅ + BUG-1 |
| TC-02 | Diálogo abre con nombre correcto del agente | ✅ |
| TC-03 | Cancelar y Escape cierran sin eliminar | ✅ |
| TC-04 | Backdrop cierra el diálogo sin eliminar | ✅ |
| TC-05 | Eliminar desde listado actualiza la tabla | ✅ + BUG-2 |
| TC-06 | Diálogo bloqueado durante eliminación (botones deshabilitados) | ✅ |
| TC-07 | Doble clic rápido no envía requests duplicados | ✅ |
| TC-08 | Eliminar desde detalle redirige a `/agentes` | ✅ + BUG-3 |
| TC-09 | Clic en ⋮ no navega al detalle del agente (stopPropagation) | ✅ |
| TC-10 | Eliminar último agente muestra empty state | ✅ |
| TC-11 | Accesibilidad — focus trap en modal | ❌ BUG-4 |
| TC-12 | Última fila — severidad BUG-1 + cursor pointer | ⚠️ BUG-1 + BUG-5 |

---

## ✅ Lo que funciona bien

- Menú contextual ⋮ con opción "Eliminar" en cada fila del listado
- Diálogo de confirmación con nombre del agente correcto
- Cancelar, Escape y backdrop cierran el diálogo sin eliminar
- Bloqueo completo del diálogo durante la operación (botones deshabilitados, backdrop no cierra)
- Idempotencia del botón "Eliminar" — doble clic no envía requests duplicados
- Eliminación desde listado refresca la tabla correctamente
- Eliminación desde detalle redirige a `/agentes` correctamente
- `stopPropagation` en el menú ⋮ — no navega al detalle al abrir el menú
- Empty state correcto al eliminar el último agente
- `Enter` sobre el botón "Eliminar" del modal confirma la eliminación (comportamiento nativo correcto)
- Escape cierra el diálogo (cuando no está eliminando)

---

## 🔧 Acciones recomendadas antes de producción

1. **🟡 RECOMENDADO:** Corregir **BUG-4** — implementar focus trap real en el modal de confirmación (accesibilidad WCAG).
2. **🟡 RECOMENDADO:** Corregir **BUG-1** — usar Portal o detección de posición para el menú contextual de la última fila.
3. **🟡 RECOMENDADO:** Corregir **BUG-2** — agregar auto-dismiss al toast de éxito (3 segundos, consistente con `useEditarAgente`).
4. **🟢 NICE-TO-HAVE:** Corregir **BUG-3** — mostrar toast de éxito al eliminar desde detalle (delay o query param).
5. **🟢 NICE-TO-HAVE:** Corregir **BUG-5** — agregar `cursor: "pointer"` a los botones de eliminar del menú y detalle.

---

## Notas adicionales

- Esta slice es **100% frontend con servicio mock** (`deleteAgente` hace `splice` en memoria). Al recargar la página, los agentes "eliminados" reaparecen. Esto es intencional y está documentado en la PR.
- No hay endpoint real en `ServicesApi` ni `FunctionsApi` para esta slice — las pruebas de API con `curl` no aplican.
- Los bugs detectados son consistentes con el patrón de la slice: la lógica de negocio está bien implementada, los gaps son de UX y accesibilidad.
- Una vez que el backend real esté disponible (endpoint `DELETE /agentes/:id`), se deberá ejecutar una nueva sesión de QA para validar la integración real.
