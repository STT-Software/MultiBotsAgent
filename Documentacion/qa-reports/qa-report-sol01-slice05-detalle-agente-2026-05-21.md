# QA Report — SL01/Slice-05: Detalle de Agente (Tabs + Edición General)

**Fecha:** 2026-05-21
**PR:** [#17 — SL01/Slice-05: Detalle de agente: tabs y edición general](https://github.com/STT-Software/MultiBotsAgent/pull/17)
**Stage:** `dev`
**Ejecutado por:** QA Agent (automatizadas) + QA humano (sesión guiada)

---

## 🎯 Veredicto

**🟡 APROBADO CON OBSERVACIONES — Un bug menor documentado, no bloqueante.**

El flujo principal funciona correctamente. La navegación al detalle, edición de nombre y tipo, validaciones, manejo de errores y persistencia en memoria operan según lo especificado. Se encontró un bug de UX medio relacionado con la pérdida de cambios no guardados al cambiar de tab.

| ID | Severidad | Hallazgo | Bloqueante |
|----|-----------|----------|------------|
| BUG-1 | 🟡 Media | Cambios no guardados en tab General se pierden al navegar a otro tab y volver | No |
| OBS-1 | ⚠️ Conocido | Acceso directo por URL a ID inexistente redirige a `/login` en lugar de `/agentes` (consecuencia del bug de sesión preexistente de PR #14) | No |

---

## Entorno de Pruebas

| Recurso | URL | Estado |
|---------|-----|--------|
| Frontend (CloudFront) | https://d1z7dsgvuqduin.cloudfront.net | ✅ Activo |
| ServicesApi (NestJS/Fargate) | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com | ⚠️ No aplica — `/agentes` no desplegado (mock en frontend) |
| FunctionsApi (Lambdas) | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com | No aplica |

> **Nota de alcance:** Todo el flujo de este slice es 100% mock en frontend (`MOCK_AGENTES` array mutable en memoria). No existen endpoints `/agentes` en el ServicesAPI desplegado. Las pruebas de API no aplican para este slice.

---

## Resumen Ejecutivo

| Dimensión | Resultado |
|-----------|-----------|
| Carga de detalle desde listado (clic en agente) | ✅ OK |
| Skeleton durante carga (~500ms) | ✅ OK |
| Tabs: General, Personalidad, Canal, Base de Conocimiento | ✅ OK |
| Tabs placeholder con animaciones | ✅ OK |
| Edición de nombre — caso feliz | ✅ OK |
| Edición de nombre — solo espacios (validación trim) | ✅ OK |
| Edición de nombre — error simulado (palabra "error") | ✅ OK |
| Cambio de tipo de agente | ✅ OK |
| Idempotencia del botón guardar (doble clic) | ✅ OK |
| Persistencia de cambios entre detalle y listado (mock en memoria) | ✅ OK |
| Botón "← Volver" navega a `/agentes` | ✅ OK |
| Navegación rápida entre tabs (estabilidad) | ✅ OK |
| Responsive: selector de tipo horizontal/vertical | ✅ OK |
| Estado no guardado al cambiar de tab | ❌ BUG-1 |
| Acceso directo por URL a ID inexistente | ⚠️ OBS-1 (bug preexistente) |

---

## 🐛 Bugs Detectados

### 🟡 BUG-1: Cambios no guardados en tab General se pierden al cambiar de tab

**Severidad:** Media
**Reproducible:** Sí, al 100%
**Test afectado:** TC-08

**Descripción:**
Si el usuario edita el nombre o tipo en el tab General sin guardar, y navega a cualquier otro tab (Personalidad, Canal, Base de Conocimiento) y vuelve a General, los cambios no guardados se pierden silenciosamente. El campo nombre vuelve al valor guardado original.

**Causa raíz (verificada en código):**

`AgenteDetalleTabs` usa `renderTabContent()` con `useCallback`. Cada vez que se cambia de tab, React **desmonta y remonta** `AgenteTabGeneral` porque el switch/case genera un nuevo elemento. Al montarse, el estado local `nombre` y `tipo` se inicializa desde `agente.nombre` y `agente.tipo` (los valores guardados), descartando los cambios en curso.

El `useEffect` de sincronización en `AgenteTabGeneral` agrava el problema:
```tsx
// agente-tab-general.tsx
useEffect(() => {
  setNombre(agente.nombre);  // ← sobreescribe el estado local al montar
  setTipo(agente.tipo);
}, [agente.nombre, agente.tipo]);
```

**Impacto actual (mock):** Bajo — el usuario pierde cambios no guardados sin aviso, pero no hay pérdida de datos reales.

**Impacto en producción (con API real):** Medio — el usuario puede creer que sus cambios se perdieron o confundirse sobre qué está guardado.

**Fix sugerido (dos opciones):**

*Opción A — Elevar el estado al componente padre `AgenteDetalleTabs`:*
Mover `nombre` y `tipo` como estado de `AgenteDetalleTabs` y pasarlos como props a `AgenteTabGeneral`. Así el estado sobrevive al desmontaje del tab.

*Opción B — Usar `key` estable para evitar desmontaje:*
Renderizar siempre `AgenteTabGeneral` pero ocultarlo con CSS cuando no está activo:
```tsx
<div hidden={activeTab !== 'general'}>
  <AgenteTabGeneral ... />
</div>
```
Esto preserva el estado del componente sin desmontarlo.

*Opción C — Advertir al usuario antes de cambiar de tab con cambios pendientes:*
Mostrar un diálogo de confirmación si `hasChanges` es `true` al intentar cambiar de tab.

---

## ⚠️ Observaciones

### OBS-1: Acceso directo por URL a ID inexistente redirige a `/login`

**Tipo:** Comportamiento conocido — bug preexistente de PR #14
**Reproducible:** Sí

Al escribir directamente en la barra del navegador una URL como `/agentes/id-inexistente`, el usuario es redirigido a `/login` en lugar de a `/agentes`.

**Causa:** La navegación directa por URL es una navegación completa (full navigation), equivalente a F5. El middleware de auth client-side pierde la cookie `session` en este contexto (bug documentado en PR #14 — persistencia de sesión al recargar). La guard de auth actúa antes que el lookup del agente, enviando al login.

**Comportamiento esperado:** Skeleton → `notFound = true` → `router.replace("/agentes")`.

**Nota:** Este comportamiento NO es un bug de este slice. Está documentado como bug preexistente en el reporte `qa-report-flujo-2.2-autenticacion-2026-05-14.md` (M2: Persistencia de sesión al recargar). Se resuelve cuando se corrija el bug de sesión de PR #14.

---

## 📋 Detalle de Test Cases

### Pruebas automatizadas

| ID | Escenario | Resultado | Notas |
|----|-----------|-----------|-------|
| AUTO-01 | Frontend CloudFront responde | ✅ HTTP 307→200 | Redirect a `/login` desde root |
| AUTO-02 | Ruta `/agentes` accesible | ✅ HTTP 200 | SSR correcto |
| AUTO-03 | Ruta `/agentes/{id}` accesible | ✅ HTTP 200 | SSR devuelve HTML con spinner + JS del componente |
| AUTO-04 | ServicesAPI `/agentes` no existe | ⚠️ HTTP 404 | Esperado — mock en frontend, no hay endpoint real |
| AUTO-05 | ID con XSS en URL (`<script>`) | ✅ HTTP 200 | No crash de servidor, parámetro tratado como string |
| AUTO-06 | Path traversal en URL (`..%2Fetc`) | ✅ HTTP 200 | No crash, tratado como string |
| AUTO-07 | Protección de ruta sin sesión | ⚠️ Client-side | Redirect a `/login` ocurre en cliente tras hidratación, no en servidor (decisión arquitectónica documentada en PR #14) |

### Sesión guiada — QA humano

| ID | Nombre | Resultado |
|----|--------|-----------|
| TC-01 | Acceso a ID inexistente por URL directa | ⚠️ OBS-1 (bug preexistente) |
| TC-02 | Clic en agente del listado → carga detalle | ✅ |
| TC-03 | Edición de nombre — caso feliz | ✅ |
| TC-04 | Nombre con solo espacios — validación trim | ✅ |
| TC-05 | Error simulado (nombre contiene "error") | ✅ |
| TC-06 | Doble clic en "Guardar cambios" — idempotencia | ✅ |
| TC-07 | Cambio de tipo de agente + responsive | ✅ |
| TC-08 | Cambios no guardados al cambiar de tab | ❌ BUG-1 |
| TC-09 | Persistencia de cambios entre detalle y listado | ✅ |
| TC-10 | Botón "← Volver" navega a `/agentes` | ✅ |
| TC-11 | Navegación rápida entre 4 tabs (estabilidad) | ✅ |

---

## ✅ Lo que funciona bien

- Carga del detalle desde el listado con skeleton animado (~500ms)
- Header con nombre e ID del agente en monospace
- Sistema de 4 tabs con indicador activo (línea verde inferior)
- Tabs placeholder (Personalidad, Canal, Base de Conocimiento) con animaciones y diseño glass panel
- Edición de nombre con validación en tiempo real (trim, campo vacío)
- Selector de tipo en grid 3 columnas (desktop) / 1 columna (mobile)
- Feedback visual de guardado: spinner → "✓ Cambios guardados" (auto-clear 3s)
- Feedback de error: mensaje rojo con auto-clear 3s
- Idempotencia del botón guardar (doble clic bloqueado)
- Persistencia de cambios en mock en memoria (visible en listado tras volver)
- Botón "← Volver" funcional
- Estabilidad al navegar rápidamente entre tabs
- Consola limpia en todos los casos felices

---

## 🔧 Acciones recomendadas

1. **🟡 RECOMENDADO:** Corregir **BUG-1** — preservar estado no guardado al cambiar de tab. Opción B (ocultar con CSS) es la más simple; Opción A (elevar estado) es la más correcta arquitectónicamente.
2. **🟢 NICE-TO-HAVE:** Una vez corregido el bug de sesión de PR #14, re-verificar TC-01 para confirmar que `/agentes/id-inexistente` redirige a `/agentes` y no a `/login`.

---

## Notas adicionales

- El flujo completo de edición (listado → detalle → editar → guardar → volver → verificar en listado) funciona correctamente de extremo a extremo.
- El bug BUG-1 es de UX, no de datos. En el contexto actual (mock) el impacto es bajo. Cobra importancia cuando se integre la API real.
- La decisión de protección de rutas client-side (no server-side) es arquitectónica y está documentada. No se considera bug de este slice.
- Los tabs placeholder tienen diseño consistente con el sistema Obsidian Emerald y animaciones correctas.
