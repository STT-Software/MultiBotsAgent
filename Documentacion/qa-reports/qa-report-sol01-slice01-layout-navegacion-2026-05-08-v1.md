# QA Report — Flujo 2.1: Layout y Navegación General

| Campo | Valor |
|-------|-------|
| **Solución** | SL01 — Panel de Administración Web |
| **Flujo** | 2.1 — Layout y Navegación General |
| **Fecha** | 2026-05-08 |
| **Entorno** | Stage `lamos` — `https://d1z7dsgvuqduin.cloudfront.net` |
| **QA** | Sesión guiada (agente + QA humano) |
| **Resultado general** | ❌ No aprobado — 2 bugs críticos bloqueantes |

---

## Resumen Ejecutivo

El layout base del panel funciona correctamente: sidebar, header, área de contenido y placeholders de secciones pendientes están implementados. Sin embargo, se encontraron **2 bugs de alta prioridad** que impiden aprobar el flujo: el panel es accesible sin autenticación, y falta el ítem "Configuración" en el sidebar. Adicionalmente, el header no muestra el nombre del usuario autenticado.

---

## Criterios de Aceptación — Estado

### Shell y Navegación

| Criterio | Estado | Notas |
|----------|--------|-------|
| La aplicación muestra un layout con sidebar, header y área de contenido | ✅ Pasa | Los tres elementos presentes y funcionales |
| El sidebar permite navegar entre: Dashboard, Agentes, Inbox, Pedidos, Historial, Métricas | ✅ Pasa | Todos los ítems presentes y navegables |
| El sidebar incluye "Configuración" | ❌ Falla | No aparece. En su lugar hay "Docs" y "Soporte" no especificados |
| El header muestra el nombre de la empresa | 🟡 Parcial | Aparece en el sidebar superior, no en el header |
| El header muestra el usuario actual | ❌ Falla | Campo existe (avatar) pero no resuelve el nombre del usuario |
| Las secciones sin implementación muestran página placeholder con mensaje informativo | ✅ Pasa | Inbox, Pedidos, Historial y Métricas muestran "Próximamente" |
| Si no hay sesión, redirige al login | ❌ Falla | El panel es accesible sin autenticación — **BUG-01** |

---

## Hallazgos

### 🔴 BUG-01 — Panel accesible sin autenticación
**Severidad:** Alta  
**Tipo:** Seguridad  
**Reproducción:**
1. Abrir ventana de incógnito (sin sesión activa)
2. Navegar a `https://d1z7dsgvuqduin.cloudfront.net/dashboard`

**Resultado actual:** HTTP 200 — el panel renderiza completamente con datos reales (agentes, contadores)  
**Resultado esperado:** Redirección a `/login` o `/register`  
**Impacto:** Cualquier persona con la URL accede al panel y ve datos de la empresa sin credenciales. El middleware de autenticación no está aplicado a las rutas del panel.

---

### 🔴 BUG-02 — Ítem "Configuración" falta en el sidebar
**Severidad:** Media  
**Tipo:** Funcionalidad faltante  
**Reproducción:** Observar el sidebar en cualquier página del panel

**Resultado actual:** Sidebar muestra: Dashboard, Agentes, Inbox, Pedidos, Historial, Métricas, Docs, Soporte  
**Resultado esperado:** Sidebar debe incluir "Configuración" según el spec (sección 2.1)  
**Impacto:** La sección de Configuración no es accesible desde la navegación principal. "Docs" y "Soporte" no están definidos en el spec — su presencia debe ser validada con el equipo de producto.

---

### 🟡 OBS-03 — Nombre de usuario no se resuelve en el header
**Severidad:** Baja  
**Tipo:** Funcionalidad incompleta  
**Descripción:** El header tiene un avatar circular en la esquina superior derecha pero no muestra el nombre del usuario autenticado. El campo existe estructuralmente pero no consume los datos de sesión.  
**Criterio afectado:** *"El header muestra el nombre de la empresa y usuario actual"*

---

### 🟡 OBS-04 — Nombre de empresa en sidebar, no en header
**Severidad:** Baja  
**Tipo:** Desviación de spec  
**Descripción:** "MultiBotAgents / Panel Admin" aparece en la parte superior del sidebar, no en el header. Funciona como identificador de contexto pero la ubicación difiere de lo especificado.  
**Nota:** Puede ser una decisión de diseño válida — requiere alineación con el equipo.

---

## Tests Ejecutados

| ID | Descripción | Resultado |
|----|-------------|-----------|
| TC-01 | Acceso a `/dashboard` sin sesión activa | ❌ Falla — muestra panel |
| TC-02 | Layout completo: sidebar, header, área de contenido | ✅ Pasa |
| TC-03 | Ítems de navegación en sidebar | 🟡 Parcial — falta Configuración |
| TC-04 | Placeholder Métricas | ✅ Pasa |
| TC-05 | Placeholders Inbox, Pedidos, Historial | ✅ Pasa |
| TC-06 | Redirección a login sin sesión (confirmación formal) | ❌ Falla |
| TC-07 | Header: nombre de empresa y usuario | 🟡 Parcial — empresa presente, usuario no |

---

## Recomendaciones

1. **BUG-01 es bloqueante.** Antes de cualquier demo o acceso externo, el middleware de autenticación debe proteger todas las rutas del panel (`/dashboard`, `/agentes`, y cualquier subruta). En Next.js App Router esto se resuelve con un middleware en `middleware.ts` que valide la cookie/token de sesión.

2. **BUG-02** debe resolverse alineando el sidebar con el spec. Definir también si "Docs" y "Soporte" son ítems aprobados por producto o fueron agregados sin spec.

3. **OBS-03** se resolverá naturalmente cuando la solución 14 (autenticación) esté integrada y el contexto de sesión esté disponible en el frontend.

4. **OBS-04** requiere decisión de diseño: ¿el nombre de empresa va en el header o en el sidebar? Actualizar el spec según lo que se decida.

---

## Próximos pasos

- [ ] Dev corrige BUG-01 (middleware de auth en rutas del panel)
- [ ] Dev corrige BUG-02 (agregar Configuración al sidebar)
- [ ] Producto decide sobre "Docs" y "Soporte" en sidebar
- [ ] Producto decide ubicación del nombre de empresa (header vs sidebar) y actualiza spec
- [ ] Re-test del flujo 2.1 tras correcciones
