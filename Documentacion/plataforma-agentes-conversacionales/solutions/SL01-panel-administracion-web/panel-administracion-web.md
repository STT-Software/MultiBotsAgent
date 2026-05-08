---
taxonomy: solution
key: panel-administracion-web
solution: Panel de Administración Web
initiative: ../../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Oscar Gomez
created: 2026-05-07
updated: 2026-05-07
version: "0.2.0"
status: drafting
language: es
changelog:
  - date: 2026-05-07
    author: Oscar Gomez
    change: "Creación inicial del documento de solución — Panel de Administración Web"
  - date: 2026-05-07
    author: Oscar Gomez
    change: "Reducción de alcance — El panel se limita a shell, navegación y CRUD básico de agentes. Secciones de otros módulos quedan como placeholders/mock."
---

# Panel de Administración Web

## 1. Overview

El Panel de Administración Web es el **shell de la aplicación**: la estructura visual, la navegación y el punto de entrada a toda la plataforma. Su responsabilidad es proveer el esqueleto donde los demás módulos se integran progresivamente.

En esta versión, el panel cubre:
- Layout general (sidebar, header, navegación)
- Dashboard resumen con datos básicos
- CRUD de agentes (crear, listar, editar datos básicos, eliminar)
- Páginas placeholder para las secciones que dependen de otras soluciones

**No define flujos, validaciones ni estructuras de datos de otros módulos.** Cada módulo (personalidad, base de conocimiento, inbox, pedidos, métricas, canales) tiene su propia solución que definirá su lógica, endpoints y modelos. El panel solo provee el espacio visual donde esos módulos se renderizan cuando estén listos.

### Relación con otras soluciones

| Solución | Relación con el panel |
|----------|----------------------|
| 14 — Gestión de Empresas y Acceso | Provee autenticación. El panel asume usuario ya autenticado. |
| 5 — Conector WhatsApp | Cuando esté lista, el panel mostrará la asociación de canales. Por ahora: placeholder. |
| 6 — Base de Conocimiento | Cuando esté lista, el panel mostrará la interfaz de carga. Por ahora: placeholder. |
| 8 — Escalamiento | Cuando esté lista, el panel mostrará el inbox. Por ahora: placeholder. |
| 12 — Métricas | Cuando esté lista, el panel mostrará dashboards. Por ahora: placeholder. |
| 3 — Motor Cotizador | Cuando esté lista, el panel mostrará pedidos. Por ahora: placeholder. |

### Stack técnico

- **Frontend:** Next.js (ya existente en el monorepo como `@multibotagents/web`)
- **Backend:** API NestJS (`@multibotagents/api-multi-bots`)
- **Base de datos:** MongoDB Atlas
- **Infraestructura:** AWS via SST (CloudFront + Lambda@Edge + S3 en deploy)

---

## 2. Solution Narrative

### 2.1 Layout y Navegación General

- **Trigger:** El usuario accede a la aplicación tras autenticarse.
- **Comportamiento:** El sistema presenta el layout principal compuesto por:
  - **Sidebar:** Menú de navegación con las secciones: Dashboard, Agentes, Inbox, Pedidos, Historial, Métricas, Configuración.
  - **Header:** Nombre de la empresa, usuario actual, opción de cerrar sesión.
  - **Área de contenido:** Donde se renderiza la página activa.
  
  Las secciones que aún no tienen su solución implementada (Inbox, Pedidos, Historial, Métricas) muestran una página placeholder con mensaje "Próximamente" o un mock estático básico.
- **Resultado:** El usuario puede navegar entre todas las secciones de la plataforma. Las secciones disponibles funcionan; las pendientes muestran su estado.
- **Error path:** Si la sesión expira o no hay contexto de empresa, redirige al login (responsabilidad de solución 14).

---

### 2.2 Dashboard Principal

- **Trigger:** El usuario accede al panel o navega a "Dashboard".
- **Comportamiento:** El sistema muestra una vista resumen con:
  - Cantidad de agentes creados (total, activos, borradores)
  - Acceso rápido a "Crear agente"
  - Cards de navegación a las secciones principales
  
  No muestra métricas de conversaciones, pedidos ni actividad — eso depende de las soluciones respectivas. Cuando esas soluciones estén listas, el dashboard se enriquece con sus datos.
- **Resultado:** Vista de entrada con resumen básico y navegación rápida.
- **Error path:** Si la API no responde, muestra estado de error con opción de reintentar.

---

### 2.3 Listado de Agentes

- **Trigger:** El usuario navega a la sección "Agentes".
- **Comportamiento:** El sistema muestra una lista de todos los agentes de la empresa. Cada agente muestra:
  - Nombre
  - Tipo (RAG / Cotizador / Agendamiento) con indicador visual
  - Estado (borrador / activo)
  - Fecha de creación
  
  Desde el listado, el usuario puede acceder a la vista de detalle de cada agente o crear uno nuevo.
- **Resultado:** Vista completa de los agentes de la empresa.
- **Error path:** Si no hay agentes, muestra estado vacío con call-to-action para crear el primero.

---

### 2.4 Creación de un Agente

- **Trigger:** El usuario hace clic en "Crear agente".
- **Comportamiento:** El sistema presenta un formulario con:
  1. Nombre del agente (obligatorio)
  2. Tipo de agente: RAG, Cotizador, Agendamiento (obligatorio)
  
  Al confirmar, el sistema crea el agente en estado "borrador" asociado a la empresa del usuario.
  
  **Nota:** La configuración de personalidad, asociación de canal y base de conocimiento se realizan desde la vista de detalle del agente, y su lógica completa depende de las soluciones respectivas. En esta versión, esas secciones aparecen como placeholders en la vista de detalle.
- **Resultado:** Agente creado en estado borrador, visible en el listado.
- **Error path:** Si la creación falla, muestra error y mantiene los datos del formulario para reintentar.

---

### 2.5 Vista de Detalle / Configuración de un Agente

- **Trigger:** El usuario selecciona un agente del listado.
- **Comportamiento:** El sistema muestra la vista de detalle del agente con tabs o secciones:
  - **General:** Nombre y tipo (editables). Estado actual.
  - **Personalidad:** Placeholder — "Configuración disponible cuando el módulo de personalidad esté implementado". Mock con campos deshabilitados o texto informativo.
  - **Canal:** Placeholder — "Asociación de canal disponible cuando el conector WhatsApp esté implementado".
  - **Base de Conocimiento:** Placeholder — "Gestión de documentos disponible cuando el módulo de conocimiento esté implementado".
  
  El usuario puede editar nombre y tipo del agente desde la pestaña General.
- **Resultado:** El usuario ve toda la información del agente y las secciones que se irán habilitando progresivamente.
- **Error path:** Si el agente no existe (URL inválida), redirige al listado con mensaje informativo.

---

### 2.6 Eliminación de un Agente

- **Trigger:** El usuario selecciona "Eliminar" en un agente.
- **Comportamiento:** El sistema solicita confirmación. Si el usuario confirma, elimina el agente. Si el agente estaba activo, se desactiva primero (la desconexión del canal dependerá de la solución 5 cuando esté lista).
- **Resultado:** Agente eliminado del listado.
- **Error path:** Si la eliminación falla, notifica al usuario y no modifica nada.

---

### 2.7 Páginas Placeholder para Módulos Pendientes

- **Trigger:** El usuario navega a Inbox, Pedidos, Historial o Métricas.
- **Comportamiento:** El sistema muestra una página con:
  - Título de la sección
  - Mensaje indicando que la funcionalidad está en desarrollo
  - Opcionalmente: un mock estático con datos de ejemplo (no funcional) para dar contexto visual de lo que vendrá
- **Resultado:** El usuario entiende que la sección existe pero aún no está operativa.
- **Error path:** N/A — es contenido estático.

---

## 3. Out of Scope

Esta solución **NO** cubre:

- **Autenticación y registro:** Responsabilidad de la solución 14.
- **Lógica de personalidad del agente:** Campos, validaciones, aplicación en caliente. Responsabilidad de su solución dedicada.
- **Conexión y gestión de canales WhatsApp:** Responsabilidad de la solución 5.
- **Carga, procesamiento e indexación de documentos:** Responsabilidad de la solución 6.
- **Lógica de escalamiento e inbox funcional:** Responsabilidad de la solución 8.
- **Cálculo y visualización de métricas:** Responsabilidad de la solución 12.
- **Gestión de pedidos y notificaciones:** Responsabilidad de las soluciones 3 y 10.
- **Definición de endpoints o estructuras de datos de otros módulos:** Cada solución define sus propios contratos cuando se diseñe.
- **Roles y permisos.**
- **Multi-canal.**
- **Notificaciones en tiempo real (WebSockets).**

---

## 4. Technical Context

### Tecnologías

| Componente | Tecnología | Notas |
|-----------|-----------|-------|
| Frontend | Next.js + React + Tailwind CSS | Ya existente en monorepo (`apps/web`) |
| Backend API | NestJS | Ya existente (`apps/services/api-multi-bots`) |
| Base de datos | MongoDB Atlas | Conexión via SST Secret |
| Infraestructura | AWS via SST | CloudFront + S3 en deploy, local en dev |
| Monorepo | Turborepo + pnpm workspaces | Estructura existente |

### Patrones de arquitectura

- **Next.js App Router:** Páginas con layout compartido (sidebar + header). Cada sección es una ruta independiente.
- **API REST:** El frontend consume la API NestJS. Solo se implementan los endpoints necesarios para el CRUD de agentes.
- **Modular por sección:** Cada página/sección del panel es un módulo frontend independiente. Cuando una solución se implemente, reemplaza el placeholder de su sección sin afectar el resto.
- **Preparado para integración progresiva:** La arquitectura de rutas y layout permite que otros equipos/soluciones agreguen funcionalidad sin modificar el shell.

### Modelo de datos (solo lo que esta solución gestiona)

```
Agente
├── id
├── empresaId (ref → Empresa, viene del contexto de sesión)
├── nombre: string
├── tipo: "rag" | "cotizador" | "agendamiento"
├── estado: "borrador" | "activo"
├── createdAt: Date
└── updatedAt: Date
```

**Nota:** No se definen modelos de Conversación, Pedido, Documento ni Métricas. Esas entidades pertenecen a sus soluciones respectivas y se definirán cuando se diseñen.

### Endpoints del panel (solo CRUD de agentes)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/agentes` | Listar agentes de la empresa |
| POST | `/api/agentes` | Crear agente |
| GET | `/api/agentes/:id` | Obtener detalle de un agente |
| PATCH | `/api/agentes/:id` | Actualizar nombre/tipo |
| DELETE | `/api/agentes/:id` | Eliminar agente |

---

## 5. Acceptance Criteria

### Shell y Navegación

- [ ] La aplicación muestra un layout con sidebar, header y área de contenido.
- [ ] El sidebar permite navegar entre: Dashboard, Agentes, Inbox, Pedidos, Historial, Métricas.
- [ ] El header muestra el nombre de la empresa y usuario actual.
- [ ] Las secciones sin implementación muestran página placeholder con mensaje informativo.

### Dashboard

- [ ] La aplicación muestra cantidad de agentes (total, activos, borradores).
- [ ] La aplicación permite navegar a "Crear agente" desde el dashboard.
- [ ] La aplicación muestra estado de error con opción de reintentar si la API no responde.

### CRUD de Agentes

- [ ] La aplicación permite crear un agente con nombre y tipo.
- [ ] La aplicación muestra el listado de agentes con nombre, tipo, estado y fecha de creación.
- [ ] La aplicación permite editar nombre y tipo de un agente existente.
- [ ] La aplicación permite eliminar un agente con confirmación.
- [ ] La aplicación muestra estado vacío cuando no hay agentes.

### Vista de Detalle del Agente

- [ ] La aplicación muestra tabs/secciones: General, Personalidad, Canal, Base de Conocimiento.
- [ ] La pestaña General permite editar nombre y tipo.
- [ ] Las pestañas de Personalidad, Canal y Base de Conocimiento muestran placeholder indicando que el módulo está pendiente.

---

## 6. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es incorrecto |
|---|----------|--------------------------|
| 1 | La solución 14 provee autenticación y contexto de empresa antes de que el panel sea accesible. | Se necesita un mock temporal de sesión para desarrollo. |
| 2 | La API NestJS existente se extiende con los endpoints de CRUD de agentes como parte de esta solución. | Si la API se maneja separada, hay dependencia de coordinación. |
| 3 | Las demás soluciones se integrarán progresivamente reemplazando los placeholders sin necesidad de reestructurar el panel. | Si la arquitectura de rutas no es compatible, habrá refactor. |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Las soluciones futuras requieran cambios en el layout o navegación del panel. | Media | Bajo | Diseñar el layout flexible (sidebar configurable, rutas dinámicas). Aceptar que habrá ajustes menores. |
| 2 | Los placeholders generen confusión en demos o pruebas con usuarios. | Media | Bajo | Usar mensajes claros de "en desarrollo" y opcionalmente mocks visuales estáticos. |
| 3 | La estructura de la entidad Agente cambie cuando se diseñen las soluciones de personalidad o canales. | Alta | Bajo | Mantener la entidad Agente mínima (solo nombre, tipo, estado). Los campos adicionales los agrega cada solución cuando se implemente. |
