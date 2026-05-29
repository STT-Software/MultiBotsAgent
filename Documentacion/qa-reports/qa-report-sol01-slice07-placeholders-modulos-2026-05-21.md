# QA Report — SL01 / Slice-07: Placeholders Módulos
**PR:** [#19 — [SL01/Slice-07] Placeholders: Pedidos, Inbox, Historial, Métricas](https://github.com/STT-Software/MultiBotsAgent/pull/19)  
**Fecha:** 2026-05-21  
**QA:** Agente automatizado + QA humano (jhon99mendoza)  
**Stage:** `dev`  
**Frontend:** https://d1z7dsgvuqduin.cloudfront.net  

> **Nota de alcance:** Este slice es 100% frontend estático. No hay endpoints de API involucrados. ServicesApi y FunctionsApi no aplican para esta PR.

---

## Veredicto Final

**✅ SLICE APROBADO CON BUGS**

Todos los criterios funcionales verificados en desktop. Se encontraron 2 bugs:
- **BUG-01 (Alta):** Sidebar no responsive — reincidencia desde flujo 2.3, afecta todo el panel
- **BUG-02 (Media):** SVGs decorativos sin `aria-hidden="true"` en `/metricas`

---

## Resumen Ejecutivo

| Categoría | Estado |
|-----------|--------|
| Disponibilidad de rutas (automatizado) | ✅ PASS |
| Contenido HTML shell (automatizado) | ✅ PASS |
| Manejo de rutas inexistentes 404 (automatizado) | ✅ PASS |
| Headers de seguridad HTTP (automatizado) | ⚠️ OBSERVACIÓN |
| Auth guard — sin sesión redirige a login | ✅ PASS |
| Contenido visual `/pedidos` | ✅ PASS |
| Contenido visual `/inbox` | ✅ PASS |
| Contenido visual `/historial` | ✅ PASS |
| Contenido visual `/metricas` | ✅ PASS |
| Navegación rápida entre páginas | ✅ PASS |
| Botones decorativos sin errores | ✅ PASS |
| Accesibilidad básica (aria-hidden) | ❌ FAIL — BUG-02 |
| Responsive viewport 320px | ❌ FAIL — BUG-01 reincidente |

---

## Pruebas Automatizadas

### 1. Disponibilidad de rutas — ✅ PASS

Todas las rutas del slice responden HTTP 200 desde CloudFront.

| Ruta | HTTP Status | Resultado |
|------|-------------|-----------|
| `/pedidos` | 200 | ✅ |
| `/inbox` | 200 | ✅ |
| `/historial` | 200 | ✅ |
| `/metricas` | 200 | ✅ |

### 2. Contenido en HTML shell — ✅ PASS

Next.js App Router entrega un HTML shell con spinner de carga. El contenido real se hidrata en el cliente. Se verificó que el HTML base contiene referencias al módulo correcto.

| Ruta | Keywords encontradas | Keywords ausentes en shell |
|------|---------------------|---------------------------|
| `/pedidos` | Pedidos, pedido, estado | — |
| `/inbox` | Inbox, mensaje | bandeja (en JS chunks, esperado) |
| `/historial` | Historial, log | actividad (en JS chunks, esperado) |
| `/metricas` | Métricas, dashboard | gráfico (en JS chunks, esperado) |

> Las keywords "ausentes" están en los JS chunks del cliente, no en el HTML inicial. Comportamiento esperado para Next.js App Router con componentes client-side.

### 3. Manejo de rutas inexistentes — ✅ PASS

```
GET /ruta-inexistente-xyz123 → HTTP 404
```

### 4. Headers HTTP — ⚠️ OBSERVACIÓN

| Header | Valor | Evaluación |
|--------|-------|------------|
| `Cache-Control` | `s-maxage=31536000` | ✅ CDN cache correcto para assets estáticos |
| `X-Powered-By` | `Next.js` | ⚠️ Expone tecnología — remover en producción |
| `x-nextjs-cache` | `HIT` | ✅ CloudFront sirviendo desde caché |
| `X-Frame-Options` | ausente | ⚠️ Riesgo clickjacking en producción |
| `X-Content-Type-Options` | ausente | ⚠️ Agregar `nosniff` en producción |
| `Strict-Transport-Security` | ausente | ⚠️ Agregar HSTS en producción |

> Aceptables en stage `dev`. No bloquean este QA. Ver HAL-01 y HAL-02.

### 5. Arquitectura del deploy — INFO

- Servidor: OpenNext sobre CloudFront + Lambda
- CDN POP: BOG51-P2 (Bogotá) — latencia óptima para Colombia
- Prerender activo (`x-nextjs-prerender: 1`)
- Stale time: 300s

---

## Pruebas Manuales

Ejecutadas por QA humano (jhon99mendoza) contra https://d1z7dsgvuqduin.cloudfront.net el 2026-05-21.

### M-01: Contenido `/pedidos` — ✅ PASS

- [x] Tabla mock con 4 pedidos visibles (ORD-9821, ORD-8842, ORD-7751, ORD-6629)
- [x] Badges de estado con colores diferenciados: PROCESANDO (azul), PENDIENTE (amarillo), COMPLETADO (verde), CANCELADO (rojo)
- [x] Título "Módulo de Pedidos" visible
- [x] Mensaje descriptivo presente ("La gestión de pedidos estará disponible cuando se implemente el motor cotizador")
- [x] Botones de acción visibles: "Notificar disponibilidad", "Ver documentación API"
- [x] Sidebar con "Pedidos" activo

### M-02: Contenido `/inbox` — ✅ PASS

- [x] Panel izquierdo con 3 skeletons de mensajes
- [x] Panel derecho con título "Inbox" y mensaje descriptivo
- [x] Badge de status `PENDING MIGRATION` visible
- [x] Botones de acción: "Revisar Roadmap", "Notificarme"
- [x] Sidebar con "Inbox" activo

### M-03: Contenido `/historial` — ✅ PASS

- [x] Timeline con 3 entradas de log (Initialization Sequence, Neural Link Established, Awaiting Messaging Protocol)
- [x] Dots de estado con colores diferenciados (verde activo, gris pendiente)
- [x] Timestamps visibles (12:45:01, 12:48:15)
- [x] Título "Historial" y mensaje descriptivo presentes
- [x] Botones de acción: "Verificar Estado", "Documentación"
- [x] Sidebar con "Historial" activo

### M-04: Contenido `/metricas` — ✅ PASS

- [x] 3 cards con gráficos SVG visibles y bien contenidos
- [x] Gráfico de línea (izquierda) — sin desbordamiento
- [x] Gráfico de barras (centro) — sin desbordamiento
- [x] Gauge donut con label "READY" (derecha) — sin desbordamiento
- [x] Título "Métricas" y mensaje descriptivo presentes
- [x] Botón de acción: "Notificarme al Lanzamiento"
- [x] Sidebar con "Métricas" activo

### M-05: Auth guard — ✅ PASS

- [x] Acceso a `/pedidos` sin sesión (ventana incógnito) → redirige a `/login`
- [x] El contenido del módulo no es accesible sin autenticación

### M-06: Responsive viewport 320px — ❌ FAIL (reincidencia)

- [x] Sidebar ocupa 100% del ancho en viewport mobile — bloquea completamente el contenido de las 4 páginas
- [ ] No hay overflow horizontal adicional verificado (contenido inaccesible por el sidebar)
- [ ] Grids de las páginas no verificables por el mismo motivo

**Bug reincidente:** Este es el mismo BUG-01 reportado en flujo 2.3 (listado de agentes) y reincidente en flujo 2.4 (creación de agente). Afecta a nivel de layout compartido `(panel)/layout.tsx` — impacta todas las páginas del panel sin excepción. No es específico de este slice.

### M-07: Navegación rápida entre páginas — ✅ PASS

- [x] Pedidos → Inbox → Historial → Métricas → Pedidos sin flickering
- [x] Sin errores en consola del browser
- [x] Sidebar mantiene ítem activo correcto en cada página

### M-08: Botones decorativos sin errores — ✅ PASS

- [x] Todos los botones de acción en las 4 páginas no hacen nada al hacer clic
- [x] Ningún botón lanza error en consola
- [x] Ningún botón navega a una ruta rota

### M-09: Accesibilidad básica (aria-hidden) — ❌ FAIL

- [x] Los SVGs de los gráficos en `/metricas` verificados — NO tienen `aria-hidden="true"`
- [ ] Los SVGs del icono de módulo en las 4 páginas — no verificados

**Hallazgo:** SVGs decorativos expuestos a lectores de pantalla sin nombre accesible. Ver BUG-02.

---

## Criterios de Aceptación de la PR

| Criterio | Verificado por | Estado |
|----------|---------------|--------|
| La ruta `/pedidos` muestra la vista placeholder con tabla mock | QA manual M-01 | ✅ |
| La ruta `/inbox` muestra la vista placeholder con skeletons | QA manual M-02 | ✅ |
| La ruta `/historial` muestra la vista placeholder con timeline | QA manual M-03 | ✅ |
| La ruta `/metricas` muestra la vista placeholder con gráficos SVG | QA manual M-04 | ✅ |
| Cada página tiene título, mensaje descriptivo y botones visibles | QA manual M-01..04 | ✅ |
| El componente `PlaceholderPage` es reutilizable con props tipadas | Revisión PR diff | ✅ |
| Auth guard redirige a `/login` sin sesión | QA manual M-05 | ✅ |
| Navegación entre páginas sin flickering ni errores de consola | QA manual M-07 | ✅ |
| Botones decorativos no lanzan errores ni navegan a rutas rotas | QA manual M-08 | ✅ |
| El diseño es responsive y no se rompe en mobile | QA manual M-06 | ❌ FAIL (reincidencia sidebar) |
| Accesibilidad básica (aria-hidden en iconos) | QA manual M-09 | ❌ FAIL — BUG-02 |
| El build completo del monorepo pasa sin errores | Dev checklist | ✅ |

---

## Hallazgos

### 🔴 BUG-01 — Sidebar no responsive (reincidencia)
**Severidad:** Alta  
**Reproducción:** 100%  
**Viewport afectado:** ≤ 375px (mobile)  
**Reincidencia de:** BUG-01 flujo 2.3, BUG-02 flujo 2.4  
**Descripción:** El sidebar ocupa 100% del ancho en viewport mobile y bloquea completamente el contenido de las 4 páginas placeholder. No existe mecanismo para colapsarlo.  
**Impacto:** Todas las páginas del panel son inaccesibles en mobile.  
**Causa raíz:** Layout compartido `apps/web/src/app/(panel)/layout.tsx` — no implementa sidebar responsive.  
**Acción requerida:** Implementar sidebar colapsable (hamburger menu o drawer) a nivel del layout compartido. Corrección de alto impacto — resuelve el problema en todos los flujos del panel de una sola vez.

---

### 🟡 BUG-02 — SVGs decorativos sin aria-hidden
**Severidad:** Media  
**Reproducción:** 100%  
**Afecta:** `/metricas` (gráficos SVG) y potencialmente los iconos de módulo en las 4 páginas  
**Descripción:** Los elementos `<svg>` de los gráficos mock en `/metricas` no tienen el atributo `aria-hidden="true"`. Los lectores de pantalla los interpretan como contenido sin nombre accesible, generando ruido para usuarios con discapacidad visual.  
**Resultado actual:** SVG expuesto al árbol de accesibilidad sin nombre ni descripción.  
**Resultado esperado:** `<svg aria-hidden="true">` en todos los SVGs decorativos.  
**Acción requerida:** Agregar `aria-hidden="true"` a todos los SVGs decorativos en `metricas-mock.tsx` y revisar los iconos de módulo en `placeholder-page.tsx`.

---

### HAL-01 — Headers de seguridad ausentes
**Severidad:** Baja / No bloqueante  
**Descripción:** Los headers `X-Frame-Options`, `X-Content-Type-Options` y `Strict-Transport-Security` no están presentes en las respuestas HTTP.  
**Impacto:** Riesgo de clickjacking y MIME sniffing en producción.  
**Recomendación:** Configurar en `next.config.js` → `headers()` o en CloudFront Response Headers Policy antes del deploy a producción.

### HAL-02 — `X-Powered-By: Next.js` expuesto
**Severidad:** Baja / Informativo  
**Descripción:** El header revela la tecnología del servidor.  
**Recomendación:** Agregar `poweredByHeader: false` en `next.config.js`.

---

*Reporte generado por QA Automation Agent + QA humano — MultiBotsAgent*
