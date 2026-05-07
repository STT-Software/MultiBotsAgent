---
taxonomy: solution
key: panel-administracion-web
solution: Panel de Administración Web
initiative: ../../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Oscar Gomez
created: 2026-05-07
updated: 2026-05-07
version: "0.1.0"
status: drafting
language: es
changelog:
  - date: 2026-05-07
    author: Oscar Gomez
    change: "Creación inicial del documento de solución — Panel de Administración Web"
---

# Panel de Administración Web

## 1. Overview

El Panel de Administración Web es la interfaz principal donde las empresas gestionan sus agentes conversacionales. Es el punto de entrada a toda la plataforma — sin este panel, ninguna otra solución es accesible para el usuario de negocio.

Permite crear, configurar y monitorear agentes de IA sin conocimientos técnicos. Cubre las capacidades definidas en la iniciativa: gestión de agentes, configuración de personalidad, asociación a canal, gestión de pedidos, historial de conversaciones y métricas.

### Relación con otras soluciones

- **Solución 14 (Gestión de Empresas y Acceso):** El panel asume que el usuario ya está autenticado y pertenece a una empresa. La gestión de login, registro y multi-tenancy es responsabilidad de la solución 14.
- **Solución 5 (Conector WhatsApp):** El panel consume la lista de números disponibles y permite asociarlos a agentes, pero la conexión de números nuevos es responsabilidad de la solución 5.
- **Solución 6 (Base de Conocimiento):** El panel provee la interfaz de carga de archivos, pero el procesamiento e indexación es responsabilidad de la solución 6.
- **Solución 12 (Métricas):** El panel visualiza métricas, pero el cálculo y agregación es responsabilidad de la solución 12.

### Stack técnico

- **Frontend:** Next.js (ya existente en el monorepo como `@multibotagents/web`)
- **Backend:** API NestJS (`@multibotagents/api-multi-bots`)
- **Base de datos:** MongoDB Atlas
- **Infraestructura:** AWS via SST (CloudFront + Lambda@Edge + S3 en deploy)

---

## 2. Solution Narrative

### 2.1 Dashboard Principal de la Empresa

- **Trigger:** El usuario inicia sesión y accede al panel principal.
- **Comportamiento:** El sistema presenta una vista resumen del estado de la empresa en la plataforma. Muestra:
  - Listado de agentes con su estado (borrador, activo)
  - Tipo de cada agente (RAG, Cotizador, Agendamiento)
  - Canal asociado a cada agente (si tiene)
  - Métricas resumidas de actividad reciente: conversaciones del día, escalamientos pendientes
  
  El dashboard actúa como punto de navegación central — desde aquí el usuario accede a cualquier sección: agentes, inbox, pedidos, historial, métricas.
- **Resultado:** Vista consolidada del estado de la empresa. El usuario tiene visibilidad inmediata de qué está pasando y puede navegar a cualquier sección.
- **Error path:** Si no se pueden cargar los datos (API no disponible), el sistema muestra un estado de error con opción de reintentar. Si la empresa no tiene agentes creados, muestra un estado vacío con call-to-action para crear el primer agente.

---

### 2.2 Creación de un Agente

- **Trigger:** El usuario hace clic en "Crear agente" desde el dashboard o desde la sección de agentes.
- **Comportamiento:** El sistema presenta un formulario donde el usuario:
  1. Selecciona el tipo de agente (RAG, Cotizador, Agendamiento)
  2. Asigna un nombre al agente
  3. Opcionalmente configura la personalidad inicial: tono de comunicación, idioma, restricciones (qué no debe hacer/decir), y mensaje de bienvenida
  
  Al confirmar, el sistema crea el agente en estado "borrador" (no activo) asociado a la empresa del usuario. El agente no procesa mensajes hasta que se asocie a un canal y se active.
- **Resultado:** Agente creado en estado borrador, visible en el listado de agentes de la empresa. No está activo ni asociado a ningún canal.
- **Error path:** Si la creación falla (error de red, validación del servidor), el sistema muestra un mensaje de error descriptivo y no persiste nada. El formulario mantiene los datos ingresados para que el usuario pueda reintentar sin perder lo que escribió.

---

### 2.3 Configuración de Personalidad del Agente

- **Trigger:** El usuario accede a la configuración de un agente existente desde el listado o inmediatamente tras crearlo.
- **Comportamiento:** El sistema presenta los campos editables de personalidad:
  - **Nombre del agente:** Cómo se presenta ante el cliente final
  - **Tono de comunicación:** Formal, casual, amigable, profesional, etc.
  - **Idioma:** Idioma principal de respuesta del agente
  - **Restricciones:** Qué temas no debe abordar, qué no debe decir, límites de comportamiento
  - **Mensaje de bienvenida:** Primer mensaje que envía el agente cuando un cliente nuevo inicia conversación
  
  El usuario modifica los campos y guarda. Los cambios se aplican inmediatamente al agente si está activo — las próximas conversaciones usan la nueva configuración sin necesidad de "redesplegar" nada.
- **Resultado:** Configuración de personalidad actualizada y aplicada en caliente.
- **Error path:** Si el guardado falla, el sistema notifica al usuario y mantiene la versión anterior sin cambios. El formulario conserva los datos editados para reintentar.
- **Decisiones de diseño:** La personalidad se aplica en caliente (sin necesidad de redesplegar el agente). Esto simplifica la experiencia para usuarios no técnicos — cambian algo, guardan, y el agente ya se comporta diferente.

---

### 2.4 Asociación de Agente a Canal/Número de WhatsApp

- **Trigger:** El usuario selecciona "Conectar canal" en la configuración del agente.
- **Comportamiento:** El sistema muestra los números de WhatsApp disponibles que la empresa tiene conectados a la plataforma. El usuario selecciona un número. El sistema valida que:
  1. El número no esté ya asociado a otro agente (regla: 1 agente = 1 número)
  2. El número esté en estado activo/conectado
  
  Si las validaciones pasan, asocia el agente al número y cambia el estado del agente de "borrador" a "activo". A partir de ese momento, los mensajes que lleguen a ese número de WhatsApp serán procesados por este agente.
- **Resultado:** Agente asociado al número de WhatsApp y activo. El ruteo de mensajes queda configurado.
- **Error path:** Si el número ya está en uso por otro agente, el sistema informa cuál agente lo tiene asignado y no permite la asociación. Si no hay números disponibles conectados, indica que debe conectar uno primero (flujo que pertenece a la solución 5).
- **Integraciones:** Depende de la solución 5 (Conector de WhatsApp) para:
  - Obtener la lista de números conectados y disponibles
  - Activar el ruteo de mensajes entrantes hacia el agente seleccionado

---

### 2.5 Listado y Gestión de Agentes

- **Trigger:** El usuario navega a la sección "Agentes" desde el dashboard o el menú lateral.
- **Comportamiento:** El sistema muestra una lista/grilla de todos los agentes de la empresa. Cada agente muestra:
  - Nombre
  - Tipo (RAG / Cotizador / Agendamiento) con indicador visual
  - Estado (borrador / activo)
  - Canal/número asociado (si tiene)
  - Fecha de última actividad
  
  El usuario puede filtrar por tipo o estado. Desde cada agente puede acceder a:
  - Configuración de personalidad
  - Configuración de base de conocimiento
  - Ver historial de conversaciones del agente
  - Eliminar el agente
- **Resultado:** Vista completa de todos los agentes con acceso rápido a sus configuraciones y acciones.
- **Error path:** Si un agente está activo y el usuario intenta eliminarlo, el sistema solicita confirmación explícita advirtiendo que se desconectará del canal y las conversaciones activas se cerrarán. Si el usuario confirma, el agente se elimina, se libera el número y se desactiva el ruteo.
- **Decisiones de diseño:** No hay paginación inicial — se asume un número manejable de agentes por empresa (< 50 en el corto plazo). Si escala, se agrega paginación después.

---

### 2.6 Gestión de Base de Conocimiento (Vista Panel)

- **Trigger:** El usuario accede a "Base de Conocimiento" desde la configuración de un agente o desde el menú.
- **Comportamiento:** El sistema muestra los documentos/contenidos asociados al agente. El usuario puede:
  1. **Subir archivos:** PDF, documentos Word, Excel, tablas. Drag & drop o selector de archivos.
  2. **Crear contenido directo:** Editor de texto enriquecido para escribir contenido manualmente.
  3. **Ver listado:** Documentos existentes con nombre, tipo, fecha de carga, tamaño y estado de procesamiento.
  4. **Eliminar documentos:** Con confirmación.
  
  Al subir un archivo, el sistema lo envía al backend para procesamiento en background (extracción de texto, chunking, indexación vectorial). La UI muestra el progreso: "subiendo" → "procesando" → "disponible". Cuando termina, el documento queda disponible para que el agente lo consulte en conversaciones.
- **Resultado:** Base de conocimiento del agente actualizada. Los nuevos documentos están disponibles para consulta del agente en las próximas conversaciones.
- **Error path:** Si un archivo no se puede procesar (formato no soportado, archivo corrupto, tamaño excesivo), el sistema notifica al usuario indicando el motivo específico y no lo agrega a la base de conocimiento. Si el procesamiento tarda más de lo esperado, muestra estado "procesando" con opción de cancelar.
- **Integraciones:** 
  - La carga y procesamiento de archivos depende de la solución 6 (Sistema de Base de Conocimiento) para la indexación y vectorización. El panel solo es la interfaz visual.
  - Las integraciones externas (Google Drive, Notion, Confluence, SharePoint, Dropbox) dependen de la solución 13 y se muestran aquí como opciones de conexión cuando estén disponibles.

---

### 2.7 Inbox / Escalamiento a Humano (Vista Panel)

- **Trigger:** El usuario navega a la sección "Inbox" desde el dashboard o recibe una notificación de escalamiento.
- **Comportamiento:** El sistema muestra una lista de conversaciones escaladas (donde el agente no pudo resolver y transfirió a humano). Cada conversación muestra:
  - Nombre/número del cliente
  - Agente que escaló
  - Motivo del escalamiento (si el agente lo proporcionó)
  - Tiempo de espera desde el escalamiento
  - Estado: pendiente / en atención / resuelto
  
  El usuario selecciona una conversación y ve el historial completo: mensajes del cliente + respuestas del agente antes del escalamiento. Desde ahí puede responder directamente al cliente — el mensaje se envía por el mismo canal (WhatsApp). La conversación se marca como "en atención" cuando el humano la abre.
  
  Cuando el humano marca la conversación como "resuelta", el agente puede retomar futuras interacciones con ese cliente normalmente.
- **Resultado:** El humano toma control de la conversación. Los mensajes enviados desde el inbox llegan al cliente por WhatsApp. La conversación queda documentada en el historial.
- **Error path:** Si el envío del mensaje falla (WhatsApp no disponible, número desconectado), el sistema muestra error y mantiene el mensaje como borrador para reintentar. Si no hay conversaciones escaladas, muestra estado vacío con mensaje informativo.
- **Integraciones:**
  - Depende de la solución 8 (Sistema de Escalamiento) para la lógica de cuándo y por qué escalar.
  - Depende de la solución 5 (Conector WhatsApp) para el envío de mensajes desde el inbox al cliente.

---

### 2.8 Historial de Conversaciones

- **Trigger:** El usuario navega a "Historial" desde un agente específico o desde la sección general.
- **Comportamiento:** El sistema muestra una lista cronológica de todas las conversaciones. Si accede desde un agente, muestra solo las de ese agente. Si accede desde la sección general, muestra todas las conversaciones de todos los agentes de la empresa.
  
  Cada entrada muestra:
  - Número/nombre del cliente
  - Agente que atendió
  - Fecha y hora de inicio
  - Duración de la conversación
  - Estado: completada / escalada / en curso
  - Preview del último mensaje
  
  El usuario puede filtrar por: agente, rango de fechas, y estado. Al seleccionar una conversación, ve el historial completo de mensajes con timestamps, incluyendo quién envió cada mensaje (cliente, agente, humano si fue escalada).
- **Resultado:** Visibilidad completa del historial conversacional para auditoría, seguimiento y mejora del servicio.
- **Error path:** Si el historial es muy extenso, se carga paginado (scroll infinito o paginación explícita). Si no hay conversaciones, muestra estado vacío indicando que el agente aún no ha recibido mensajes.

---

### 2.9 Métricas por Agente (Vista Panel)

- **Trigger:** El usuario navega a "Métricas" desde un agente específico o desde la sección general.
- **Comportamiento:** El sistema muestra métricas agregadas según el tipo de agente:
  
  **RAG:**
  - Preguntas sin respuesta (el agente no supo contestar)
  - Temas más consultados (top 10)
  - Tasa de éxito: preguntas respondidas vs no respondidas
  
  **Cotizador:**
  - Productos más solicitados
  - Pedidos confirmados vs abandonados
  - Tasa de conversión (consulta → pedido confirmado)
  
  **Agendamiento:**
  - Citas agendadas, canceladas, reprogramadas
  - Horarios pico (franjas con más demanda)
  
  **Generales (todos los tipos):**
  - Conversaciones totales
  - Escalamientos a humano (cantidad y porcentaje)
  - Tiempo promedio de conversación
  - Consultas más frecuentes
  
  Las métricas se muestran con filtro de rango de fechas: hoy, última semana, último mes, personalizado. Se presentan como números/contadores y listas ordenadas — sin gráficos complejos ni dashboards elaborados.
- **Resultado:** El usuario tiene visibilidad del rendimiento de sus agentes para tomar decisiones de negocio (ajustar base de conocimiento, cambiar personalidad, revisar catálogo, etc.).
- **Error path:** Si no hay datos suficientes para calcular métricas (agente recién creado), muestra "datos insuficientes" con indicación de que se necesitan más conversaciones para generar estadísticas.
- **Integraciones:** Depende de la solución 12 (Sistema de Métricas y Analíticas) para el cálculo y agregación de datos. El panel solo visualiza lo que la solución 12 produce.

---

### 2.10 Gestión de Pedidos (Vista Panel — Solo Cotizador)

- **Trigger:** El usuario navega a "Pedidos" desde el dashboard o desde un agente de tipo Cotizador.
- **Comportamiento:** El sistema muestra una lista de pedidos confirmados por clientes a través del agente cotizador. Cada pedido muestra:
  - Cliente (nombre/número de WhatsApp)
  - Productos solicitados con cantidades
  - Monto total de la cotización
  - Fecha de confirmación
  - Estado actual: confirmado / en preparación / enviado / entregado
  
  El usuario puede cambiar el estado del pedido seleccionando el nuevo estado. Al hacerlo, el sistema notifica automáticamente al cliente por WhatsApp sobre el cambio de estado con un mensaje contextual (ej: "Tu pedido está en camino").
  
  El usuario puede filtrar pedidos por estado y rango de fechas.
- **Resultado:** La empresa tiene visibilidad y control sobre los pedidos generados por el agente. El cliente recibe actualizaciones automáticas de estado por WhatsApp.
- **Error path:** Si la notificación al cliente falla al cambiar estado (WhatsApp no disponible), el estado del pedido se actualiza de todas formas en la plataforma, pero se marca que la notificación está pendiente de envío. El sistema reintenta automáticamente. El usuario ve un indicador de "notificación pendiente" en el pedido.
- **Integraciones:**
  - Depende de la solución 3 (Motor de Agente Cotizador) para la generación y persistencia de pedidos.
  - Depende de la solución 10 (Sistema de Notificaciones) para informar al cliente sobre cambios de estado.
  - Depende de la solución 5 (Conector WhatsApp) para el envío del mensaje de actualización.

---

## 3. Out of Scope

Esta solución **NO** cubre:

- **Autenticación y registro:** Login, registro de empresas, recuperación de contraseña. Responsabilidad de la solución 14.
- **Conexión de números de WhatsApp:** El flujo de conectar un número nuevo a la plataforma es responsabilidad de la solución 5. El panel solo muestra los ya conectados.
- **Procesamiento de archivos:** La indexación, vectorización y chunking de documentos es responsabilidad de la solución 6. El panel solo sube y muestra estado.
- **Lógica de escalamiento:** Cuándo y por qué un agente escala es responsabilidad de la solución 8. El panel solo muestra las conversaciones ya escaladas.
- **Cálculo de métricas:** La agregación y cálculo de métricas es responsabilidad de la solución 12. El panel solo visualiza.
- **Procesamiento de pagos:** No hay pasarelas de pago ni confirmación de pagos.
- **Roles y permisos:** Cualquier persona con acceso a la empresa puede hacer todo. Sin restricciones por rol.
- **Pausar/desactivar agente:** Funcionalidad alcanzable a futuro. No se implementa en esta versión.
- **Analíticas avanzadas:** No hay gráficos complejos, dashboards interactivos ni exportación de datos.
- **Integraciones externas (Google Drive, Notion, etc.):** La UI mostrará placeholders para cuando estén disponibles, pero la conexión real es responsabilidad de la solución 13.
- **Multi-canal:** Solo WhatsApp. La arquitectura está preparada pero no se implementan otros canales.
- **Notificaciones en tiempo real (WebSockets):** Las actualizaciones del panel se obtienen por polling o al navegar. Push notifications en tiempo real es mejora futura.

---

## 4. Technical Context

### Tecnologías

| Componente | Tecnología | Notas |
|-----------|-----------|-------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 | Ya existente en monorepo (`apps/web`) |
| Backend API | NestJS 10 | Ya existente (`apps/services/api-multi-bots`) |
| Base de datos | MongoDB Atlas | Conexión via SST Secret |
| Infraestructura | AWS via SST | CloudFront + S3 en deploy, local en dev |
| Monorepo | Turborepo + pnpm workspaces | Estructura existente |

### Patrones de arquitectura

- **Server-Side Rendering (SSR) + Client Components:** Next.js App Router. Las páginas cargan datos en el servidor cuando es posible, los componentes interactivos (formularios, filtros) son client components.
- **API REST:** El frontend consume la API NestJS via HTTP. Endpoints RESTful con JSON.
- **Modular por dominio:** Cada sección del panel (agentes, inbox, pedidos, historial, métricas) es un módulo independiente tanto en frontend como en backend.
- **Optimistic UI:** Para acciones simples (cambiar estado de pedido, guardar configuración), el UI actualiza inmediatamente y revierte si el servidor falla.

### Modelo de datos conceptual (entidades principales)

```
Empresa
├── id
├── nombre
├── createdAt
└── tiene muchos → Agente

Agente
├── id
├── empresaId (ref → Empresa)
├── nombre
├── tipo: RAG | Cotizador | Agendamiento
├── estado: borrador | activo
├── personalidad
│   ├── tono
│   ├── idioma
│   ├── restricciones
│   └── mensajeBienvenida
├── canalAsociado (ref → número WhatsApp, nullable)
└── createdAt / updatedAt

Documento (Base de Conocimiento)
├── id
├── agenteId (ref → Agente)
├── nombre
├── tipo: pdf | doc | excel | texto-directo
├── estado: procesando | disponible | error
├── tamaño
└── createdAt

Conversación
├── id
├── agenteId (ref → Agente)
├── clienteNumero
├── estado: en-curso | completada | escalada
├── mensajes[]
│   ├── contenido
│   ├── emisor: cliente | agente | humano
│   └── timestamp
├── motivoEscalamiento (nullable)
└── createdAt / updatedAt

Pedido (solo Cotizador)
├── id
├── agenteId (ref → Agente)
├── clienteNumero
├── productos[]
│   ├── nombre
│   ├── cantidad
│   └── precio
├── montoTotal
├── estado: confirmado | en-preparacion | enviado | entregado
├── notificacionPendiente: boolean
└── createdAt / updatedAt
```

### Contratos de integración con otras soluciones

| Solución | Interfaz esperada (input/output) |
|----------|----------------------------------|
| 5 — Conector WhatsApp | Input: `getAvailableNumbers(empresaId)` → Output: lista de números conectados con estado. Input: `sendMessage(numero, mensaje)` → Output: confirmación de envío. |
| 6 — Base de Conocimiento | Input: `uploadDocument(agenteId, file)` → Output: documentId + estado de procesamiento. Input: `getDocuments(agenteId)` → Output: lista de documentos con estado. |
| 8 — Escalamiento | Input: `getEscalatedConversations(empresaId)` → Output: lista de conversaciones escaladas con historial. |
| 10 — Notificaciones | Input: `notifyClient(clienteNumero, mensaje, canal)` → Output: confirmación o estado pendiente. |
| 12 — Métricas | Input: `getMetrics(agenteId, tipoAgente, rangoFechas)` → Output: objeto con métricas calculadas según tipo. |
| 14 — Empresas y Acceso | Input: sesión autenticada con `empresaId` y `userId`. El panel asume que esta información ya existe en el contexto de la request. |

---

## 5. Acceptance Criteria

### Gestión de Agentes

- [ ] La aplicación permite crear un agente seleccionando tipo (RAG, Cotizador, Agendamiento), asignando nombre y configurando personalidad.
- [ ] La aplicación muestra el listado de agentes de la empresa con nombre, tipo, estado y canal asociado.
- [ ] La aplicación permite editar la personalidad de un agente existente y los cambios se aplican sin necesidad de redespliegue.
- [ ] La aplicación permite asociar un agente a un número de WhatsApp disponible, validando que el número no esté en uso por otro agente.
- [ ] La aplicación permite eliminar un agente con confirmación explícita si está activo.
- [ ] La aplicación muestra estados vacíos informativos cuando no hay agentes creados.

### Base de Conocimiento

- [ ] La aplicación permite subir archivos (PDF, docs, Excel) y muestra el progreso de procesamiento.
- [ ] La aplicación permite crear contenido directo mediante editor de texto.
- [ ] La aplicación muestra el listado de documentos con nombre, tipo, fecha, tamaño y estado.
- [ ] La aplicación permite eliminar documentos con confirmación.
- [ ] La aplicación informa al usuario cuando un archivo no se puede procesar, indicando el motivo.

### Inbox

- [ ] La aplicación muestra la lista de conversaciones escaladas con cliente, agente, motivo, tiempo de espera y estado.
- [ ] La aplicación permite ver el historial completo de una conversación escalada.
- [ ] La aplicación permite responder al cliente desde el inbox y el mensaje se envía por WhatsApp.
- [ ] La aplicación permite marcar una conversación como resuelta.

### Historial

- [ ] La aplicación muestra el historial de conversaciones con filtros por agente, fecha y estado.
- [ ] La aplicación permite ver el detalle completo de una conversación con todos los mensajes y timestamps.
- [ ] La aplicación pagina el historial cuando hay muchas conversaciones.

### Métricas

- [ ] La aplicación muestra métricas específicas según el tipo de agente (RAG, Cotizador, Agendamiento).
- [ ] La aplicación muestra métricas generales: conversaciones totales, escalamientos, tiempo promedio.
- [ ] La aplicación permite filtrar métricas por rango de fechas.
- [ ] La aplicación muestra "datos insuficientes" cuando no hay suficientes conversaciones.

### Pedidos

- [ ] La aplicación muestra la lista de pedidos con cliente, productos, monto, fecha y estado.
- [ ] La aplicación permite cambiar el estado de un pedido y notifica automáticamente al cliente.
- [ ] La aplicación indica cuando una notificación de cambio de estado está pendiente de envío.
- [ ] La aplicación permite filtrar pedidos por estado y rango de fechas.

### Dashboard

- [ ] La aplicación muestra un resumen con agentes, estados y métricas de actividad reciente.
- [ ] La aplicación permite navegar a cualquier sección desde el dashboard.
- [ ] La aplicación muestra estados de error con opción de reintentar cuando la API no está disponible.

---

## 6. Risks & Assumptions

### Supuestos

| # | Supuesto | Impacto si es incorrecto |
|---|----------|--------------------------|
| 1 | La solución 14 (Gestión de Empresas y Acceso) provee autenticación y contexto de empresa antes de que el panel sea accesible. | El panel no puede funcionar sin saber a qué empresa pertenece el usuario. Si 14 no está lista, se necesita un mock temporal. |
| 2 | La API NestJS existente se extiende con los endpoints necesarios como parte de esta misma solución. | Si la API se maneja como solución separada, hay dependencia de coordinación. |
| 3 | MongoDB Atlas es suficiente para las consultas de listado, filtrado y paginación del panel. | Si el volumen de datos crece mucho, podría necesitarse indexación adicional o caché. |
| 4 | Los números de WhatsApp ya conectados están disponibles via API (solución 5). | Si la solución 5 no está implementada, el flujo de asociar canal no funciona. Se puede mockear con datos estáticos temporalmente. |
| 5 | El procesamiento de archivos (solución 6) expone un endpoint de estado para que el panel muestre progreso. | Si no hay endpoint de estado, el panel no puede mostrar progreso y solo muestra "procesando" genérico. |

### Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Las soluciones dependientes (5, 6, 8, 10, 12) no están listas cuando el panel se implemente. | Alta (son fases posteriores) | Medio | Diseñar el panel con interfaces desacopladas. Usar mocks/stubs para las integraciones no disponibles. Mostrar secciones como "próximamente" cuando la integración no existe. |
| 2 | El volumen de conversaciones en historial crece rápido y afecta rendimiento. | Media | Medio | Implementar paginación desde el inicio en el backend. Índices en MongoDB por empresaId + agenteId + fecha. |
| 3 | La UI para usuarios no técnicos no es lo suficientemente intuitiva. | Media | Alto | Iterar con feedback de usuarios reales. Priorizar simplicidad sobre funcionalidad. Usar patrones de UI conocidos (cards, listas, formularios simples). |
| 4 | Next.js 16 + React 19 tienen breaking changes o inestabilidades por ser versiones recientes. | Baja | Medio | Monitorear issues del framework. Tener plan de rollback a versiones estables si hay problemas críticos. |

### Dependencias externas

- **MongoDB Atlas:** Disponibilidad del cluster para desarrollo y producción.
- **AWS (via SST):** Disponibilidad de CloudFront, S3, y servicios asociados para el deploy.
- **Meta Cloud API (WhatsApp):** Para los flujos que involucran envío de mensajes desde el inbox (dependencia indirecta via solución 5).
