---
taxonomy: initiative
key: plataforma-agentes-conversacionales
initiative: Plataforma de Agentes Conversacionales
product: Por definir
author: Por definir
created: 2026-05-05
updated: 2026-06-11
version: 0.1.0
status: discovery
language: es
changelog:
  - date: 2026-05-05
    author: Por definir
    description: Creación inicial del documento con Fase 1 validada.
  - date: 2026-05-05
    author: Por definir
    description: Fase 2 - Capacidades del Producto y Alcance validada.
  - date: 2026-05-05
    author: Por definir
    description: Fase 3 - Solution Map Preliminar y Roadmap de Ejecución.
  - date: 2026-05-15
    author: Felipe Lamos
    description: "Refinamiento del Solution Map — Solución 5 (Conector de WhatsApp) diseñada. Status: drafting."
  - date: 2026-05-20
    author: Oscar Gomez
    description: "Refinamiento del Solution Map — Solución 8 (Sistema de Escalamiento a Humano) diseñada. Status: drafting."
  - date: 2026-06-01
    author: Oscar Gomez
    description: "Refinamiento del Solution Map — Solución 12 (Sistema de Métricas y Analíticas) diseñada. Status: drafting."
  - date: 2026-06-11
    author: Antigravity (IA)
    description: "Refinamiento del Solution Map — Adición de la Solución 15 (Procesamiento y Transcripción de Mensajes de Voz - STT). Status: drafting."
---

# Plataforma de Agentes Conversacionales

## Resumen Ejecutivo

Iniciativa para construir una plataforma plug & play que permita a empresas configurar, desplegar y gestionar agentes de inteligencia artificial especializados sobre canales de mensajería masiva (WhatsApp inicialmente), sin necesidad de desarrollo custom. Cada agente se despliega en un canal/número específico y maneja su propio flujo conversacional con las acciones que tenga configuradas.

---

## Fase 1: Contexto del Problema y Visión Objetivo

### Estado Actual (As-Is)

Las empresas que quieren ofrecer atención inteligente a sus clientes por canales de mensajería masiva (WhatsApp, Telegram, etc.) se enfrentan a:

- **Soluciones fragmentadas**: Si necesitan un agente que responda preguntas (RAG), otro que cotice y otro que agende, deben integrar herramientas distintas o desarrollar a medida cada capacidad.
- **Sin orquestación unificada**: No hay una capa que permita gestionar múltiples agentes de IA como un sistema coordinado. Cada agente vive aislado.
- **Configuración técnica compleja**: Activar o ajustar un agente requiere desarrollo, no es algo que el negocio pueda hacer de forma autónoma.
- **Acoplamiento al canal**: Las soluciones actuales se construyen para un canal específico. Migrar o agregar canales implica re-trabajo significativo.

### Problema Identificado

> No existe una plataforma unificada que permita a empresas configurar, orquestar y desplegar múltiples agentes de IA especializados sobre canales de mensajería masiva, de forma plug & play, sin desarrollo custom por cada agente ni por cada canal.

### ¿Por qué importa?

- La demanda de atención conversacional inteligente crece, pero las opciones son o muy limitadas (bots de FAQ) o muy costosas (desarrollo a medida).
- Las empresas necesitan combinar capacidades (informar + cotizar + agendar) en una sola experiencia conversacional coherente.
- El mercado pide una solución que abstraiga la complejidad técnica y permita a negocios activar agentes como si fueran "módulos" configurables.

### Estado Deseado (To-Be)

Una plataforma plug & play donde una empresa pueda:

1. **Conectar canales de mensajería** — WhatsApp como canal principal inicial, con arquitectura preparada para multi-canal.
2. **Activar agentes especializados como módulos** — RAG informativo, cotizador/validador de productos, agendamiento, y otros a futuro.
3. **Configurar cada agente con su información de negocio** — catálogo, servicios, disponibilidad, base de conocimiento, sin escribir código.
4. **Desplegar un agente por canal/número** — Cada agente se asocia a un canal específico y maneja su propio flujo conversacional con las acciones que tenga configuradas.
5. **Gestionar todo desde un solo lugar** — Panel de administración para la empresa que contrata.

### Decisiones Clave

| Aspecto | Decisión |
|---------|----------|
| Cliente que paga | La empresa/negocio que contrata la plataforma |
| Usuario final | El cliente de esa empresa, que escribe por mensajería |
| Canal inicial | WhatsApp |
| Visión de canal | Multi-canal (diseño preparado, implementación futura) |
| Foco de valor | Plataforma plug & play de agentes inteligentes |
| Agentes iniciales | RAG informativo, Cotización/productos, Agendamiento |
| Modelo de despliegue | 1 agente → 1 canal/número |
| Orquestación entre agentes | Fuera de alcance inicial (futuro) |
| Flujo conversacional | Cada agente maneja el suyo con sus acciones disponibles |

---

## Fase 2: Capacidades del Producto y Alcance

### Capacidades de la Plataforma (Panel Web)

#### Gestión de Agentes

- Crear agentes y seleccionar tipo (RAG, Cotizador, Agendamiento)
- Configurar personalidad: tono, nombre, idioma, restricciones, mensaje de bienvenida
- Asociar agente a un canal/número de WhatsApp
- Múltiples agentes por empresa, cada uno en su canal/número
- Cada agente es mono-tipo (se especializa en una sola función)

#### Base de Conocimiento

- Cargar archivos: PDFs, documentos, Excel, tablas
- Integraciones: Google Drive, Notion, Confluence, SharePoint, Dropbox
- Crear/editar contenido directamente en la plataforma
- Conexión automática con credenciales simples (el sistema se encarga del resto)

#### Inbox / Escalamiento a Humano

- Inbox donde la persona de la empresa toma control de la conversación
- Respuesta desde la plataforma o desde WhatsApp directamente
- Se activa cuando el agente no puede resolver o la situación es difícil de gestionar

#### Historial y Métricas

- Historial completo de conversaciones por agente
- Métricas por tipo de agente:
  - **RAG**: preguntas sin respuesta, temas más consultados, tasa de éxito
  - **Cotizador**: productos más solicitados, pedidos confirmados vs abandonados, tasa de éxito
  - **Agendamiento**: citas agendadas, canceladas, reprogramadas, horarios pico, tasa de éxito
- Métricas generales: conversaciones totales, escalamientos a humano, consultas frecuentes

#### Gestión de Pedidos (Cotizador)

- Ver pedidos confirmados dentro de la plataforma
- Actualizar estado del pedido
- El agente notifica al cliente sobre cambios de estado por el mismo canal

#### Acceso y Roles

- Sin roles por ahora — cualquier persona con acceso a la empresa puede gestionar todo
- No hay planes, tiers ni facturación contemplados aún

---

### Agente RAG Informativo

| Capacidad | Detalle |
|-----------|---------|
| Responder preguntas | Basado en la base de conocimiento configurada |
| Soporte multimedia | Recibe imágenes, audio y texto (si el LLM lo soporta) |
| Memoria | Mantiene contexto por un período de tiempo, luego se reinicia |
| Personalidad | Configurable (tono, nombre, idioma, restricciones) |
| Mensajes proactivos | Puede recordar cosas y enviar mensajes según su gestión |
| Escalamiento | Transfiere a humano si no puede resolver |

---

### Agente Cotizador / Validador de Productos

| Capacidad | Detalle |
|-----------|---------|
| Consultar catálogo | Productos/servicios con precios y disponibilidad |
| Armar cotizaciones | Basado en lo que el cliente solicita |
| Confirmar pedido | Notifica a la empresa (plataforma + WhatsApp + correo) |
| Seguimiento de pedido | Informa al cliente del estado actualizado por el canal |
| Carga de catálogo | Archivos, integraciones, o creación directa en plataforma |
| Soporte multimedia | Imágenes, audio, texto |
| Memoria | Período de tiempo, luego reinicio |
| Escalamiento | Transfiere a humano |

**Fuera de alcance:** Pagos, confirmación de pagos, pasarelas de pago.

---

### Agente de Agendamiento

| Capacidad | Detalle |
|-----------|---------|
| Conectar calendario | Google Calendar (único para MVP) |
| Configurar disponibilidad | Horarios, espacios, días laborales |
| Duración por actividad | Configurable según tipo de evento/actividad |
| Verificar disponibilidad | Antes de agendar, valida que haya espacio |
| Agendar citas | Crea evento en el calendario |
| Confirmar cita | Notifica al cliente por chat |
| Recordatorios | Envía recordatorios proactivos antes de la cita |
| Cancelar/Reprogramar | El cliente puede hacerlo por el mismo canal |
| Soporte multimedia | Imágenes, audio, texto |
| Memoria | Período de tiempo, luego reinicio |
| Escalamiento | Transfiere a humano |

---

### Restricciones Funcionales

| Restricción | Detalle |
|-------------|---------|
| Modelos de IA | Bajo costo / APIs económicas. No modelos de frontera |
| Sin entrenamiento custom | Solo RAG + prompting bien diseñado |
| Memoria básica | Ventana de tiempo configurable, luego reinicio (no memoria persistente) |
| Sin rate limiting | No aplica por ahora |
| Sin límite de base de conocimiento | Libre por ahora |
| Multimedia | Soportado si el LLM lo permite (imágenes, audio, texto) |
| UI para no técnicos | La configuración debe ser accesible para personas sin conocimientos técnicos |

---

### Out-of-Scope (Fuera del Alcance Inicial)

- Implementación multi-canal (solo WhatsApp, pero arquitectura preparada)
- Orquestación inteligente entre agentes (ruteo por contexto)
- Procesamiento de pagos / pasarelas de pago
- Planes, tiers, facturación, métodos de pago
- Roles y permisos dentro de la empresa
- Calendarios distintos a Google Calendar
- Entrenamiento de modelos custom / fine-tuning
- Analíticas avanzadas / dashboards complejos (solo métricas por agente)
- Rate limiting por empresa

---

## Fase 3: Solution Map Preliminar

### Soluciones Core

| # | Solución | Capacidades que cubre | Tipo | Prioridad | Notas |
|---|----------|----------------------|------|-----------|-------|
| 1 | **Panel de Administración Web** | Gestión de agentes, configuración de personalidad, asociación a canal, gestión de pedidos, historial, métricas | Core | Alta | UI orientada a usuarios no técnicos |
| 2 | **Motor de Agente RAG** | Responder preguntas, consulta a base de conocimiento, soporte multimedia, memoria temporal | Core | Alta | Basado en RAG + prompting, modelos económicos |
| 3 | **Motor de Agente Cotizador** | Consultar catálogo, armar cotizaciones, confirmar pedidos, seguimiento de estado | Core | Alta | Sin pagos. Notificación multi-canal (plataforma + WhatsApp + correo) |
| 4 | **Motor de Agente Agendamiento** | Verificar disponibilidad, agendar, confirmar, recordatorios, cancelar/reprogramar | Core | Alta | Integración con Google Calendar únicamente |
| 5 | **Conector de WhatsApp** | Envío/recepción de mensajes, asociación agente-número, multimedia | Core | Alta | API de WhatsApp Business (Cloud API directa). Embedded Signup para conexión. Lambda + SQS. Status: `drafting` |
| 6 | **Sistema de Base de Conocimiento** | Carga de archivos, integraciones externas, creación directa, indexación para RAG | Core | Alta | Soporta PDF, docs, Excel, tablas. Integraciones: Google Drive, Notion, Confluence, SharePoint, Dropbox |

### Soluciones Transversales

| # | Solución | Capacidades que cubre | Tipo | Prioridad | Notas |
|---|----------|----------------------|------|-----------|-------|
| 7 | **Gestión de Memoria Conversacional** | Contexto temporal por conversación, reinicio tras ventana de tiempo | Transversal | Alta | Aplica a todos los agentes. Memoria básica (no persistente) |
| 8 | **Sistema de Escalamiento a Humano** | Detección de incapacidad del agente, transferencia a inbox, notificación | Transversal | Alta | Inbox en plataforma. Status: `drafting` |
| 9 | **Motor de Mensajes Proactivos** | Recordatorios de citas, actualizaciones de pedido, mensajes según gestión del agente | Transversal | Media | Aplica a agendamiento y cotizador principalmente |
| 10 | **Sistema de Notificaciones** | Notificar a empresa (pedidos, escalamientos), notificar a cliente (estados, confirmaciones) | Transversal | Alta | Canales: plataforma, WhatsApp, correo |
| 11 | **Motor de Personalidad del Agente** | Tono, nombre, idioma, restricciones, mensaje de bienvenida | Transversal | Media | Configurable por agente, aplica a todos los tipos |
| 12 | **Sistema de Métricas y Analíticas** | Tasa de éxito, consultas frecuentes, métricas específicas por tipo de agente | Transversal | Media | Métricas básicas, sin dashboards complejos. Status: `drafting` |
| 13 | **Gestión de Integraciones Externas** | Conexión con Google Drive, Notion, Confluence, SharePoint, Dropbox, Google Calendar | Transversal | Alta | Credenciales simples, conexión automática |
| 14 | **Gestión de Empresas y Acceso** | Multi-empresa, acceso sin roles, múltiples agentes por empresa | Transversal | Alta | Sin planes/tiers por ahora |
| 15 | **Procesamiento y Transcripción de Mensajes de Voz (STT)** | Recepción y transcripción asíncrona de notas de voz de usuario para que el motor RAG de cualquier agente procese la consulta y responda en texto plano | Transversal | Alta | Soporte para WhatsApp y Telegram usando OpenAI Whisper. Status: drafting |

### Flujos Transversales Implícitos

| Flujo | Descripción | Soluciones involucradas |
|-------|-------------|------------------------|
| Recepción de mensaje | WhatsApp/Telegram recibe mensaje (texto o audio) → identifica agente → (si es audio, descarga y transcribe) → enruta al motor correspondiente | 5, 7, 15, 2/3/4 |
| Configuración de agente | Usuario crea agente → selecciona tipo → configura personalidad → asocia canal → carga conocimiento | 1, 11, 6, 5 |
| Escalamiento | Agente detecta que no puede resolver → notifica → inbox toma control → humano responde | 8, 10, 1 |
| Ciclo de pedido | Cliente solicita → agente cotiza → cliente confirma → empresa recibe notificación → actualiza estado → agente informa al cliente | 3, 10, 9 |
| Ciclo de agendamiento | Cliente solicita cita → agente verifica disponibilidad → agenda → confirma → envía recordatorio | 4, 13, 9 |

---

### Roadmap de Ejecución

#### Mapa de dependencias y paralelismo

```
FASE 0 ─────────────────────────────────────────────────────────────
│  [14] Gestión de Empresas + [1] Panel Web (estructura base)
│
├── FASE 1 ─────────────────────────────────────────────────────────
│   │  [11] Personalidad + [6] Base de Conocimiento + [2] Motor RAG
│   │  + [7] Memoria Conversacional + [5] Conector WhatsApp
│   │
│   │  ► Entregable: Primer agente RAG funcional end-to-end
│   │
│   ├── FASE 2 (secuencial tras Fase 1) ────────────────────────────
│   │   │  [8] Escalamiento a Humano + [10] Notificaciones
│   │   │
│   │   │  ► Entregable: Red de seguridad para todos los agentes
│   │   │
│   │   ├── FASE 4 ─────────────────────────┐
│   │   │   [4] Agente Agendamiento          │  ◄── PUEDEN IR
│   │   │   + [9] Mensajes Proactivos        │      EN PARALELO
│   │   │                                    │
│   │   ├── FASE 5 ─────────────────────────┘
│   │   │   [3] Agente Cotizador
│   │   │
│   │   └── FASE 6 (tras Fases 4 y 5) ─────────────────────────────
│   │       [12] Métricas y Analíticas
│   │
│   └── FASE 3 (puede ir EN PARALELO con Fase 2) ──────────────────
│       [13] Integraciones Externas (Google Drive, Calendar, etc.)
│       ► Requerida antes de Fase 4 (agendamiento necesita Calendar)
```

#### Resumen por fase

| Fase | Soluciones | Entregable | Depende de | Paralelismo |
|------|-----------|------------|------------|-------------|
| 0 | 14, 1 | Panel base + estructura de empresas | — | — |
| 1 | 11, 6, 2, 7, 5 | Agente RAG funcional en WhatsApp | Fase 0 | — |
| 2 | 8, 10 | Escalamiento a humano + notificaciones | Fase 1 | Paralelo con Fase 3 |
| 3 | 13 | Integraciones externas | Fase 0 | Paralelo con Fase 2 |
| 4 | 4, 9 | Agente de agendamiento completo | Fases 2 y 3 | Paralelo con Fase 5 |
| 5 | 3 | Agente cotizador completo | Fase 2 | Paralelo con Fase 4 |
| 6 | 12 | Métricas y analíticas | Fases 4 y 5 | — |

#### Ejecución paralela posible

- **Fase 2 + Fase 3** → pueden ejecutarse simultáneamente (no dependen entre sí)
- **Fase 4 + Fase 5** → pueden ejecutarse simultáneamente (no dependen entre sí, pero Fase 4 requiere Fase 3 completada)
