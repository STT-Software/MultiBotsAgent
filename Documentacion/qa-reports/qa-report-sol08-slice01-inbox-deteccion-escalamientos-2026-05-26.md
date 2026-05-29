# Reporte QA — [SL08/Slice-01] Inbox: detección y vista de escalamientos

## Información General

| Campo | Valor |
|-------|-------|
| **PR** | [#22](https://github.com/STT-Software/MultiBotsAgent/pull/22) |
| **Título** | [SL08/Slice-01] Inbox: detección y vista de escalamientos |
| **Autor** | ogomez-stt |
| **Fecha de merge** | 25 mayo 2026 |
| **QA ejecutado por** | jhon99mendoza |
| **Fecha de QA** | 26 mayo 2026 |
| **Entorno** | Deploy dev (AWS) |
| **Frontend** | https://d1z7dsgvuqduin.cloudfront.net |
| **Veredicto** | ✅ APROBADO (desktop) |

---

## URLs de prueba

- **Frontend (CloudFront):** https://d1z7dsgvuqduin.cloudfront.net
- **ServicesApi (NestJS/Fargate):** https://5em5s6gn59.execute-api.us-east-1.amazonaws.com
- **FunctionsApi (Lambdas):** https://eibwrbqsna.execute-api.us-east-1.amazonaws.com

---

## Alcance de la PR

- Feature module `inbox/` completo (types, service, hooks, components)
- Vista master-detail funcional con selección de conversación
- Historial de mensajes con burbujas diferenciadas por sender
- Badges de tipo de escalamiento (explícito vs detectado por agente)
- Badge de contador en sidebar
- Empty state y skeleton de carga
- Datos mock (sin integración backend real)

---

## Pruebas automatizadas

| Tipo | ¿Aplica? | Razón |
|------|----------|-------|
| Unit tests (property-based) | ❌ No aplica | No hay lógica de negocio pura — solo UI y mocks |
| Integration tests (API) | ❌ No aplica | No hay endpoints reales implementados |
| E2E (Playwright) | ❌ No aplica | Valor bajo contra mocks estáticos |

**Justificación:** Esta slice es 100% frontend con datos mock. No existe lógica de negocio en `packages/core` ni endpoints API reales. Las pruebas automatizadas aportarán valor cuando se integre el backend real.

---

## Resultados de pruebas manuales

| # | Escenario | Severidad | Resultado | Observaciones |
|---|-----------|-----------|-----------|---------------|
| TC-01 | Navegación rápida entre conversaciones (sin flickering) | 🔴 Crítico | ✅ Pasó | Observación cosmética: scrollbars visibles |
| TC-02 | Auto-scroll al último mensaje al seleccionar conversación | 🟡 Alto | ✅ Pasó | — |
| TC-03 | Badge numérico en sidebar (cantidad correcta) | 🟡 Alto | ✅ Pasó | Badge muestra "4", consistente con lista |
| TC-04 | Comportamiento responsive (viewport mobile) | 🟢 Medio | ⚠️ Conocido | Bloqueado por bug previo del sidebar |
| TC-05 | Badges de tipo de escalamiento (diferenciación visual) | 🟡 Alto | ✅ Pasó | Verificado en desktop |

---

## Hallazgos

### 🟡 HAL-01: Scrollbars visibles innecesarios (Cosmético)

**Severidad:** Baja — No bloqueante
**Dónde:** Panel izquierdo (lista de conversaciones) + Input de mensaje (panel derecho)
**Descripción:** Se observan barras de scroll que no deberían ser visibles:
- Scrollbar horizontal en la parte inferior de la lista de conversaciones
- Scrollbar vertical en el textarea del input de mensaje cuando está vacío

**Impacto:** Solo visual. No afecta funcionalidad.
**Sugerencia:** Agregar `overflow-x: hidden` al contenedor de la lista y revisar el overflow del textarea.

---

### 🟡 HAL-02: En pantallas pequeñas, clic en conversación no abre detalle (UX)

**Severidad:** Media — No bloqueante (fuera del alcance declarado de la PR)
**Dónde:** Vista `/inbox` en viewport < 768px (con sidebar colapsado)
**Descripción:** En pantallas pequeñas se puede ver la lista de conversaciones, pero al hacer clic en una conversación no se abre el panel de detalle/chat. El usuario ve la lista como si fuera funcional pero no puede interactuar con ella.

**Impacto:** UX confusa en mobile. La PR documenta explícitamente que "no hay responsive split", pero el comportamiento actual es engañoso.
**Sugerencia:** Ocultar la lista en mobile con un mensaje "Vista disponible solo en desktop", o implementar navegación tipo stack (lista → detalle) en viewport pequeño.

---

### ⚠️ HAL-03: Sidebar superpone contenido en mobile (Bug conocido)

**Severidad:** Media — Ya documentado en reportes anteriores
**Dónde:** Sidebar en viewport mobile
**Descripción:** El sidebar se superpone al contenido del inbox en pantallas pequeñas, impidiendo la interacción con la vista.

**Impacto:** Bloquea uso en mobile. No es regresión de esta PR.
**Estado:** Conocido — no atribuible a este slice.

---

## Criterios de aceptación — Verificación

| Criterio | Estado |
|----------|--------|
| La ruta `/inbox` muestra la vista master-detail con conversaciones escaladas | ✅ |
| Al seleccionar una conversación, se muestra el historial de mensajes | ✅ |
| Los mensajes se diferencian visualmente por sender (usuario, agente, operador) | ✅ |
| El badge de escalamiento muestra el tipo correcto (explícito vs detectado) | ✅ |
| El sidebar muestra un badge numérico con la cantidad de conversaciones pendientes | ✅ |
| El auto-scroll posiciona la vista en el último mensaje | ✅ |

---

## Veredicto final

**✅ APROBADO para desktop**

Los criterios de aceptación funcionales se cumplen correctamente en desktop. Los hallazgos encontrados son:
- 1 cosmético (scrollbars) — no bloqueante
- 1 de UX en responsive — fuera del alcance declarado de la PR
- 1 bug conocido del sidebar — no atribuible a esta PR

La funcionalidad core del Inbox (vista master-detail, navegación entre conversaciones, badges, auto-scroll) funciona correctamente.
