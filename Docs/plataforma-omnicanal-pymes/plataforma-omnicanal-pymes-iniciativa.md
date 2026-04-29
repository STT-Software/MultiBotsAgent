---
taxonomy: initiative
key: POCP-001
initiative: plataforma-omnicanal-pymes
product: Plataforma Omnicanal IA para PYMES
author: Oscar
created: 2025-04-24
updated: 2025-04-24
version: 1.0.0
status: in-progress
language: es
changelog:
  - date: 2025-04-24
    author: Oscar
    description: "Migración de contexto desde conversación externa. Fases 1-3 validadas. Fase 4 en progreso."
  - date: 2025-04-24
    author: Kiro (BA Power)
    description: "Reescritura completa alineada al estilo y metodología del power de Business Analyst. Se incorporan observaciones críticas, tensiones, y narrativa analítica por fase."
  - date: 2025-04-24
    author: Kiro (BA Power)
    description: "Fase 4 completada. 5 dimensiones cerradas: canales (solo WhatsApp, abstracción multi-canal), integraciones (6 en MVP, fuentes de verdad vivas), agente (cotización calculada, solo español), interfaz (mínima, solo handoff), implementación (consultiva para setup, self-service para mantenimiento). Nuevas decisiones D4-D9. Nuevos riesgos R13-R16."
  - date: 2025-04-27
    author: Kiro (BA Power)
    description: "Fase 5 completada. Arquitectura a alto nivel conceptual: multi-agente con orquestador, transferencia inter-agente, base de conocimiento dual (integrada/conectada), retención permanente, MCP diferido a PoC. Decisiones DA1-DA7. Riesgos R17-R19."
  - date: 2025-04-27
    author: Kiro (BA Power)
    description: "Fase 6 completada. Stack definido: Python/FastAPI + React/Next.js + PostgreSQL. Infra MVP en Render/Fly/Railway, post-MVP AWS. Equipo fullstack pequeño, presupuesto limitado."
  - date: 2025-04-27
    author: Kiro (BA Power)
    description: "Fase 7 completada. Estrategia de incrementos funcionales: 6 incrementos secuenciales con dependencias. Piloto posible desde Incremento 2. MVP completo = Incrementos 1-5."
  - date: 2025-04-27
    author: Kiro (BA Power)
    description: "Fases 8 y 9 completadas. Criterios de éxito (KPIs de producto, negocio y viabilidad económica), criterios Go/No-Go, dependencias críticas, y Solution Map con 25 flujos asignados a incrementos. Documento v1.0.0 — todas las fases cerradas."
---

# Plataforma Omnicanal IA para PYMES — Documento de Iniciativa

## Resumen Ejecutivo

Las PYMES de 10-100 empleados en LATAM gestionan la comunicación con sus clientes de forma fragmentada: múltiples canales sin centralizar, respuestas dependientes de disponibilidad humana, y procesos transaccionales repetitivos que consumen horas de trabajo de bajo valor. No hay trazabilidad ni métricas sobre el embudo conversacional.

Esta iniciativa propone una plataforma omnicanal con agentes de IA que automaticen las conversaciones repetitivas, permitiendo a la PYME atender 24/7 sin ampliar su equipo. El modelo de negocio es consultivo: el equipo implementador configura la plataforma para cada cliente y cobra implementación + suscripción recurrente.

El eje estratégico primario es eficiencia operativa (reducir costos y carga humana). El crecimiento comercial es un efecto derivado: al liberar al equipo de tareas repetitivas, pueden enfocarse en cerrar ventas de mayor valor.

🚨 **Advertencia de contexto:** Este análisis se construyó sin datos cuantitativos. Todos los pain points son hipótesis basadas en conversaciones informales con PYMES. El costo de la inacción no está cuantificado. Esto significa que el ROI solo es defendible cualitativamente hasta que se realicen entrevistas formales o un piloto real.

---

## Fase 1: Problem Context ✅ VALIDADA

### Situación Actual (As-Is)

> **Base de evidencia:** Hipótesis derivadas de conversaciones informales con PYMES conocidas por el autor. No hay entrevistas estructuradas, encuestas ni datos cuantitativos. Todo lo que sigue debe leerse como "creemos que esto pasa", no como "sabemos que esto pasa".

Una PYME típica (10-100 empleados) en LATAM gestiona la comunicación con sus clientes así:

1. **Canales dispersos sin centralización.** WhatsApp Business en el celular de alguien, DMs de Instagram respondidos por marketing, correos en otra bandeja. Los leads se pierden porque no hay trazabilidad de quién habló, cuándo, ni qué se le dijo.
2. **Respuesta dependiente de disponibilidad humana.** Fuera de horario comercial, el cliente no recibe respuesta. Se va con la competencia que sí respondió. Esto es especialmente crítico en verticales donde la decisión de compra es impulsiva (estética, gastronomía, servicios).
3. **Agentes humanos resolviendo lo mismo 100 veces.** "¿Cuánto cuesta?", "¿Están abiertos?", "¿Tienen disponibilidad?" — consultas repetitivas de bajo valor que consumen horas de trabajo que no escalan.
4. **Cero visibilidad del embudo conversacional.** ¿Cuántos chats terminan en venta? ¿Dónde se cae el embudo? La PYME no lo sabe porque no tiene métricas de conversión sobre sus conversaciones.
5. **Transacciones repetibles que requieren intervención humana.** Reservar una cita, cotizar un servicio, confirmar un pedido — procesos que podrían automatizarse pero que hoy dependen de que alguien esté disponible para responder.

### Pain Points

Los pain points se dividen en dos perspectivas: la PYME (quien paga) y el cliente final (quien conversa).

**Lado PYME:**

| ID  | Pain Point | Severidad |
|-----|-----------|-----------|
| P1  | Conversaciones dispersas en múltiples canales sin trazabilidad → leads se pierden, no hay historial unificado | Alto |
| P2  | Respuesta lenta o inexistente fuera de horario → clientes se van con la competencia | Alto |
| P3  | Agentes humanos dedicando horas a consultas repetitivas → costo operativo que no escala | Medio-Alto |
| P4  | Sin visibilidad de métricas de conversión del embudo conversacional | Medio |
| P5  | Procesos transaccionales repetibles (reservar, cotizar, comprar) requieren intervención humana | Medio |

**Lado cliente final:**

| ID  | Pain Point | Severidad |
|-----|-----------|-----------|
| C1  | Respuestas lentas o inexistentes fuera de horario comercial | Alto |
| C2  | Respuestas genéricas/copy-paste que no resuelven la consulta específica | Medio |
| C3  | Tener que repetir su contexto cada vez que cambia de canal o de agente | Medio |

🚨 **Observación crítica:** El autor señaló que todos los pain points (P1-P5) son "la razón #1 de pérdida de clientes". Cuando todo es prioritario, nada lo es. La priorización real queda pendiente y debe forzarse en Fase 4 (Scope) al decidir qué se construye primero.

### Stakeholders

| Stakeholder | Rol | Estado |
|-------------|-----|--------|
| Dueño/gerente de PYME | Quien contrata el servicio y paga. Es el decisor de compra. | ✅ Identificado |
| Empleado que hoy gestiona conversaciones | Quien se ve directamente afectado por el cambio. ¿La IA lo reemplaza o lo complementa? Hay riesgo de resistencia al cambio si se percibe como amenaza laboral. | ⚠️ Zona gris |
| Cliente final de la PYME | Quien conversa con el agente de IA sin necesariamente saber que es IA. | ✅ Identificado |
| Equipo consultivo | Quien implementa, configura y mantiene la plataforma para cada cliente PYME. | ✅ Identificado |
| Proveedores de canales (Meta/WhatsApp Business API) | Dependencias técnicas, de política y de costos. Aprobaciones, plantillas, ventanas de 24h. | ⚠️ Zona gris — no se han evaluado costos ni fricciones operativas |

### Dimensionamiento del Problema

🚨 **GAP CRÍTICO:** No hay datos cuantitativos disponibles. El autor asume conscientemente este riesgo. Las implicaciones son:

- No se puede calcular el costo de la inacción para una PYME (¿cuánto dinero pierden al mes por estos problemas?).
- Sin línea base económica, el ROI del proyecto solo es defendible cualitativamente.
- Esto debilita el argumento de venta: "te ahorro dinero" sin poder decir cuánto.
- La validación real dependerá de un piloto con 1-2 PYMES donde se midan antes/después.

### Decisiones Tomadas en Fase 1

| Decisión | Detalle | Riesgo asociado |
|----------|---------|-----------------|
| Multi-vertical | No se elige un vertical de entrada (clínica, academia, e-commerce). La plataforma será genérica y configurable. | R02 — Una clínica, una academia y un e-commerce tienen flujos radicalmente distintos. Multi-vertical diluye la propuesta de valor y multiplica la complejidad. |
| Modelo consultivo | Servicio de implementación + plataforma con suscripción. No es SaaS self-service. | R04 — No escala linealmente. Cada cliente nuevo = horas de implementación. |
| Sin datos duros | Se trabaja con hipótesis. No hay entrevistas formales ni métricas. | R01, R05 — Riesgo de construir algo que resuelva un dolor percibido, no real. |

---

## Fase 2: Product Capability Vision ✅ VALIDADA

### Declaración de Visión

> "Permitir que las PYMES atiendan a sus clientes en todos sus canales de comunicación 24/7 sin ampliar su equipo humano, automatizando las conversaciones repetitivas mediante agentes de IA configurados específicamente para su negocio. Al liberar al equipo humano de tareas de bajo valor, la PYME reduce costos operativos y libera capacidad para enfocarse en cerrar oportunidades de venta de mayor valor."

### Beneficio Final Concreto

> Reducción del % de horas humanas dedicadas a responder consultas repetitivas.
> Meta hipotética: reducir 60% el tiempo del equipo en preguntas frecuentes.

⚠️ El 60% es una hipótesis sin línea base. Se validará en Fase 8 (Success Criteria) con datos de un piloto real o benchmarks de industria.

### Objetivos Estratégicos del Negocio

| ID  | Objetivo | Estado |
|-----|----------|--------|
| O2  | Generar flujo de ingresos recurrente vía suscripción + proyectos de implementación. | ✅ Validado |
| O1  | Construir una oferta diferenciable en el mercado de automatización conversacional para PYMES de LATAM. | ⚠️ No validado — punto ciego documentado |
| O3  | Crear una base de casos de éxito replicables que permita escalar el negocio consultivo a agencia. | ⚠️ No validado — punto ciego documentado |

🚨 **Puntos ciegos activos:**
- Sin O1 validado, no hay un norte sobre cómo diferenciarse de la competencia existente (ManyChat, Tidio, Kommo, Respond.io, Leadsales, Intercom, Zendesk, Chatwoot). Este es el punto ciego más grande del análisis.
- Sin O3 validado, el modelo se queda en "negocio de una persona/equipo pequeño". Está bien si es intencional, pero hay que saberlo.

---

## Fase 3: Product Capability Description ✅ VALIDADA

### Principio Rector

La decisión multi-vertical (Fase 1) implica que las capacidades deben describirse de forma genérica y configurable, no atadas a un vertical específico. Cada vertical (clínica, academia, e-commerce) se resuelve en la fase de implementación consultiva, configurando los agentes con el contexto del negocio. La plataforma en sí es una capa horizontal. Esto significa que muchas capacidades deben ser "motores configurables", no "funcionalidades fijas".

### Épicas del MVP

#### E1 — Integración y Gestión de Canales de Comunicación

La plataforma conecta los canales donde los clientes de la PYME hablan hoy, unificando todas las conversaciones en una sola vista.

- Conectar canal de WhatsApp Business API (MVP).
- Recibir, enviar y rastrear mensajes bidireccionales.
- Preservar el historial completo de cada conversación por canal.
- Abstracción de canales desde el diseño (D4): agregar canales futuros sin tocar el core.

#### E2 — Agentes de IA Conversacionales

El corazón de la propuesta. Agentes de IA que responden consultas, gestionan conversaciones y ejecutan acciones en nombre de la PYME.

- Responder consultas usando el contexto del negocio (base de conocimiento).
- Agendar citas en Google Calendar con slots configurables.
- Generar cotizaciones (alcance exacto pendiente — ¿catálogo o cálculos personalizados?).
- Detectar intención de compra y confirmarla.
- Notificar a humanos de la PYME cuando hay una acción que requiere intervención (compra a completar, pedido a enviar).

#### E3 — Base de Conocimiento del Negocio

Los agentes no pueden responder bien sin el contexto del negocio cargado. Esto es un componente de primer nivel.

- Carga manual de información estructurada (servicios, precios, horarios, políticas, FAQs).
- Carga de documentos no estructurados (PDFs, texto).
- Conexión a sistemas externos para ingerir información viva. Google Drive y Google Calendar priorizados en desarrollo; Notion, Confluence y APIs de terceros son parte de la visión del producto pero no son prioridad para el MVP — se integrarán posteriormente.

🚨 **Decisión crítica sobre integraciones:** El autor mencionó inicialmente Shopify, Drive, Notion, Confluence, APIs, bases de datos propias, calendarios. Esto son al menos 5-7 integraciones heterogéneas, cada una con autenticación, modelo de datos y mantenimiento distintos. Se resolvió que las integraciones son un proceso de trabajo conjunto entre el consultor y la PYME (decisión D2), no un feature self-service. El alcance exacto de integraciones en MVP se define en Fase 4.

#### E4 — Handoff Humano + Bandeja Operativa

Los agentes de IA no van a resolver el 100% de los casos. Tiene que existir una forma clara de que un humano tome el control.

- Detectar casos que requieren intervención humana (intención de queja, consulta compleja, petición explícita).
- El humano retoma la conversación por el mismo canal vía la plataforma (decisión D3).
- El humano puede ver el historial completo de la conversación con el agente.
- El cliente final recibe mensaje de aviso de que un humano lo contactará.

🚨 **Implicación operativa de D3:** Para que el humano de la PYME responda al cliente por WhatsApp/Instagram, necesita entrar a la plataforma para retomar la conversación. Esto obliga a que E4 incluya una bandeja de entrada operable para los humanos de la PYME. La plataforma pasa de ser una herramienta "en background" a una herramienta con UX operativa diaria. Esto cambia la carga de adopción en cada cliente.

#### E5 — Panel de Métricas y Trazabilidad

Si el valor prometido es "reducir horas humanas en tareas repetitivas", hay que poder demostrarlo con datos.

- Dashboard de conversaciones (volumen por canal, por día).
- Métrica de % de consultas resueltas por IA sin escalamiento.
- Tiempos de respuesta (IA y humano).
- Historial de conversaciones auditable.
- Exportación de datos para reportes ejecutivos.

#### E6 — Gestión Multi-Tenant

El modelo consultivo implica implementar la plataforma para múltiples PYMES. Debe haber aislamiento.

- Separación de datos y configuración entre clientes.
- Gestión de accesos y roles por PYME (dos roles en MVP: admin + operador).
- Vista operativa del consultor para administrar múltiples PYMES.

#### E7 — Motor de Integraciones Configurables

Separada como épica propia por su tamaño y riesgo. Alcance a definir en Fase 4.

- Conectores con sistemas definidos (Google Calendar, Google Drive como candidatos).
- Gestión de credenciales y autenticaciones (OAuth).
- Mapeo de datos externos a la estructura interna.

### Alcance Confirmado del Agente de IA

| Capacidad | MVP |
|-----------|-----|
| Responde consultas con base en contexto del negocio | ✅ |
| Agenda citas (Google Calendar) | ✅ |
| Genera cotizaciones | ✅ |
| Confirma intención de compra | ✅ |
| Notifica a humanos para completar compra / enviar pedido | ✅ |
| Procesa pagos | ❌ |
| Envía mensajes salientes / campañas | ❌ |
| Mantiene contexto cross-canal | ❌ |
| Personalidad/tono configurable por cliente | ❌ |
| Memoria de conversaciones previas con el mismo cliente | ❌ |
| Analiza archivos multimedia enviados por clientes | ❌ |

### Requisitos No Funcionales

| ID | Requisito | Descripción | Criticidad | Justificación |
|----|-----------|-------------|------------|---------------|
| RNF1 | Disponibilidad 24/7 | La plataforma debe operar sin interrupciones — la promesa de valor depende de esto | Crítico | Si se cae a las 2am, la PYME pierde exactamente lo que prometimos resolver |
| RNF2 | Latencia < 3s | Respuestas del agente en tiempo conversacional | Alto | Una respuesta de 10 segundos en WhatsApp se siente como un bot roto |
| RNF3 | Seguridad de datos | Aislamiento entre PYMES, cifrado en tránsito y reposo | Crítico | Una PYME no puede ver datos de otra. No negociable. |
| RNF4 | Privacidad / cumplimiento | Habeas data (LATAM), GDPR si aplica, políticas de Meta/WhatsApp Business API | Crítico | Regulatorio. Incumplimiento = cierre de cuentas de Meta o sanciones legales. |
| RNF5 | Escalabilidad | Soportar crecimiento sin re-arquitectar | Alto | La meta es tener múltiples clientes PYME en paralelo |
| RNF6 | Auditabilidad | Historial completo de conversaciones y decisiones del agente | Alto | Legal y operativo. Necesario para resolver disputas y mejorar el agente. |
| RNF7 | Costos operativos controlables | Cada conversación consume tokens de LLM → costo directo por uso | Crítico | Si no se controla, el costo por cliente puede superar lo que cobra la suscripción |

---

## Fase 4: Scope and Boundaries ✅ VALIDADA

> **Principio rector de esta fase:** Es mejor dejar cosas fuera y agregarlas después, que prometer de más y entregar tarde o mal. El scope creep es la causa #1 de proyectos que nunca llegan a producción.

### Dimensión 1 — Canales de Comunicación (E1)

**Decisión: MVP solo WhatsApp. Arquitectura multi-canal desde el diseño (Camino A).**

| Canal | MVP | Justificación |
|-------|-----|---------------|
| WhatsApp Business API | ✅ Sí | Canal #1 en LATAM, imprescindible. Implica fricción: aprobación de Meta, plantillas, costos por conversación, ventanas de 24h. |
| Instagram DM | ❌ Fuera MVP | Post-MVP. La abstracción de canales permite agregarlo como "enchufar un adaptador". |
| Messenger (Facebook) | ❌ Fuera MVP | Post-MVP. Mismo ecosistema Meta, bajo costo marginal cuando se agregue. |
| Webchat en sitio web | ❌ Fuera MVP | Post-MVP. |
| Telegram | ❌ Fuera MVP | Poco uso en LATAM hispanohablante. |
| Comentarios de redes sociales | ❌ Fuera MVP | Complejidad alta (thread público, moderación). |
| Correo electrónico | ❌ Fuera MVP | Cambia completamente el modelo conversacional. |

🚨 **Decisión arquitectónica D4 — Abstracción de canales (Camino A):** La arquitectura interna debe tener una capa de abstracción de canales desde el día 1. "Canal" es un concepto intercambiable: WhatsApp hoy, Instagram mañana, Telegram después. Agregar un canal nuevo debe ser enchufar un adaptador sin tocar el core del agente ni la lógica de negocio. Esto implica más inversión en diseño arquitectónico del MVP, pero elimina deuda técnica temprana y habilita crecimiento de canales sin refactorización.

**Justificación del Camino A:** El autor confirmó tres veces que la plataforma debe poder integrarse a cualquier canal. Si ya se sabe que vendrán más canales, diseñar la abstracción desde el inicio es más caro hoy pero significativamente más barato mañana. El costo adicional en MVP es moderado (es diseño, no implementación de múltiples canales).

### Dimensión 2 — Integraciones con Sistemas Externos (E3 + E7)

**Decisión: 6 integraciones en MVP. Arquitectura de abstracción desde el diseño. Integración asistida por consultor. Sincronización continua.**

| Integración | MVP | Tipo | Notas |
|-------------|-----|------|-------|
| Carga manual de archivos (PDF, Excel, TXT, CSV) | ✅ Sí | Nivel 1 — Mínimo viable | Funcional sin depender de nadie externo. Permite operar desde día 1. |
| Formulario estructurado de catálogo (servicios, precios, horarios, FAQs) | ✅ Sí | Nivel 1 — Mínimo viable | Permite operar incluso sin integraciones externas. |
| Google Calendar (agendamiento real) | ✅ Sí | Nivel 2 — Integración clave | Crítico: el agente agenda. Sin esto, el "agendamiento" es una promesa vacía. |
| Google Drive (ingesta de documentos) | ✅ Sí | Nivel 2 — Integración clave | Fuente de verdad viva: la PYME edita aquí y el sistema sincroniza automáticamente. |
| APIs de terceros / servicios expuestos (patrón MCP) | ✅ Sí | Nivel 3 — Por demanda | Integración asistida por consultor. MCP como patrón de integración a evaluar en Fase 5. |
| Notion | ✅ Sí | Nivel 3 — Por demanda | Fuente de verdad viva para documentación del negocio. |
| Confluence | ✅ Sí | Nivel 3 — Por demanda | Fuente de verdad viva para documentación del negocio. |

🚨 **Riesgo R13 — Scope de integraciones ambicioso:** El MVP incluye 6 integraciones heterogéneas, cada una con autenticación, modelo de datos y mantenimiento distintos. El modelo consultivo (integración asistida) mitiga parcialmente la complejidad de UX, pero no la complejidad técnica de construir y mantener los conectores.

🚨 **Decisión arquitectónica D5 — Abstracción de integraciones (Camino A):** Igual que con canales, la arquitectura debe tener una capa de abstracción de integraciones desde el diseño. Agregar un conector nuevo debe ser enchufar un adaptador. MCP como posible patrón unificador — a evaluar en Fase 5 (Architecture Context).

🚨 **Decisión operativa D6 — Fuentes de verdad vivas:** Las integraciones con Google Drive, Notion y Confluence no son solo ingesta inicial — son fuentes de verdad vivas. La PYME edita en sus herramientas habituales y el sistema detecta cambios y reingesta automáticamente. Esto es sincronización continua, no carga única. Implicación técnica significativa a resolver en Fase 5.

### Dimensión 3 — Funcionalidades del Agente de IA (E2)

**Decisión: Cotización calculada con desglose (Opción B). Solo español LATAM.**

| Funcionalidad | MVP | Notas |
|---------------|-----|-------|
| Responder consultas con base de conocimiento | ✅ Sí | Core. |
| Detectar intención de compra / reserva | ✅ Sí | Core. |
| Agendar en Google Calendar | ✅ Sí | Con slots configurables por PYME. |
| Cotización calculada con desglose | ✅ Sí | Opción B: el agente calcula combinaciones de servicios, genera desglose con totales. Motor configurable por PYME (reglas de cálculo, descuentos, IVA). |
| Notificar a humano para completar compra/pedido | ✅ Sí | Info estructurada al humano de la PYME. |
| Escalamiento a humano | ✅ Sí | Mismo canal + vista web mínima (D3). |
| Idioma | Solo español LATAM | Multi-idioma post-MVP. |
| Personalidad/tono configurable | ❌ Fuera | Default base (D1). |
| Memoria de conversaciones previas | ❌ Fuera | Cada conversación empieza fresca. |
| Manejo de archivos multimedia del cliente | ❌ Fuera | Si envía foto → escalamiento a humano. |
| Procesamiento de pagos | ❌ Fuera | Patrón "AI captures intent, human fulfills". |
| Mensajes salientes / campañas | ❌ Fuera | Solo entrante. |

🚨 **Implicación de Opción B (cotización calculada):** El motor de cotización debe ser configurable por PYME porque cada vertical tiene reglas distintas. Una clínica cotiza tratamientos con sesiones, un e-commerce cotiza productos con envío, una academia cotiza cursos con matrícula. El consultor configura las reglas de cálculo durante la implementación inicial. Esto agrega complejidad a E2 y a la base de conocimiento (E3), que ahora debe incluir no solo información sino también reglas de negocio.

### Dimensión 4 — Interfaz Operativa

**Decisión: Interfaz operativa incluida en MVP con enfoque mínimo viable.**

| Componente | MVP | Notas |
|------------|-----|-------|
| Vista web de handoff (link → ver conversación → responder) | ✅ Sí | Lo mínimo para que D3 funcione. El humano recibe notificación con link, abre vista simple, ve historial, responde. Sin login complejo. |
| Panel del consultor (multi-PYME, configuración) | ✅ Sí  | La configuración se hace directamente por el consultor sin panel dedicado. |
| Dashboard de métricas | ✅ Sí  | Si se necesitan datos, se extraen manualmente o vía queries directas. |
| Roles granulares | ✅ Sí  | Sin sistema de permisos complejo. |


### Dimensión 5 — Alcance de la Implementación Consultiva

**Decisión: Implementación consultiva para setup inicial. Mantenimiento post-go-live por la PYME en sus propias herramientas.**

| Actividad | MVP | Responsable | Notas |
|-----------|-----|-------------|-------|
| Descubrimiento inicial (entender el negocio) | ✅ Sí | Consultor + PYME | Días, no semanas. |
| Carga del catálogo y base de conocimiento | ✅ Sí | Consultor + PYME | Setup inicial en las herramientas de la PYME (Drive, Notion, etc.). |
| Configuración del agente y reglas de cotización | ✅ Sí | Consultor | Incluye reglas de cálculo, descuentos, formato de respuesta. |
| Conexión de WhatsApp Business API | ✅ Sí | Consultor + PYME | Requiere cuenta Meta Business verificada. |
| Conexión de integraciones (Calendar, Drive, Notion, etc.) | ✅ Sí | Consultor + PYME | Integración asistida. |
| Capacitación del equipo en handoff | ✅ Sí | Consultor | Cómo recibir notificaciones, abrir el link, retomar conversación. |
| Testing Services | ✅ Sí | Consultor | Previo a la Go Live. |
| Go-live y ajustes iniciales | ✅ Sí | Consultor | Primeros días de operación con monitoreo. |
| Mantenimiento post-go-live (precios, servicios, FAQs) | ✅ Sí | PYME directamente | La PYME edita en sus herramientas (Google Sheets, Drive, Notion). La plataforma sincroniza automáticamente. |

🚨 **Ajuste a D2:** El modelo es consultivo para la implementación inicial, pero self-service para el mantenimiento vía herramientas externas que la PYME ya usa. D2 se redefine como "consultivo para setup, self-service para mantenimiento". Esto es coherente con la decisión D6 (fuentes de verdad vivas).

**Tiempo estimado de implementación por cliente:** Días (con equipo disponible).

### Decisiones Consolidadas de Fase 4

| ID | Decisión | Detalle | Implicación |
|----|----------|---------|-------------|
| D4 | Abstracción de canales (Camino A) | Capa de abstracción multi-canal desde el diseño. MVP solo WhatsApp. Agregar canal = enchufar adaptador. | Más inversión en diseño arquitectónico, menos deuda técnica. |
| D5 | Abstracción de integraciones (Camino A) | Capa de abstracción de conectores desde el diseño. MCP como posible patrón unificador. | Misma lógica que D4. A evaluar en Fase 5. |
| D6 | Fuentes de verdad vivas | Las integraciones (Drive, Notion, Confluence) son sincronización continua, no ingesta única. La PYME edita en sus herramientas y el sistema se actualiza solo. | Complejidad técnica de sincronización. Elimina necesidad de UI de edición de contenido. |
| D7 | Cotización calculada (Opción B) | El agente calcula cotizaciones con desglose, no solo informa precios. Motor configurable por PYME. | Agrega complejidad a E2 y E3. Reglas de negocio por cliente. |
| D8 | Interfaz operativa incluida en MVP | Vista web de handoff + panel del consultor (multi-PYME, configuración) + dashboard de métricas + roles básicos. Todo con enfoque mínimo viable, sin complejidad innecesaria. | E4, E5 y E6 se mantienen en MVP con alcance reducido. |
| D9 | Mantenimiento self-service vía herramientas externas | La PYME mantiene su contenido en Drive/Notion/Confluence. La plataforma sincroniza. | Ajusta D2: consultivo para setup, self-service para mantenimiento. |

### Out-of-Scope Declarado (NO se construye en MVP)

Todo lo siguiente queda explícitamente fuera. Si alguien lo pide, la respuesta es "post-MVP":

- Canales más allá de WhatsApp (Instagram DM, Messenger, Webchat, Telegram, email, comentarios de redes)
- Personalidad/tono configurable por cliente
- Contexto cross-canal
- Mensajes salientes, broadcast, campañas
- Procesamiento de pagos
- Multi-idioma (solo español LATAM)
- Memoria de conversaciones previas con el mismo cliente
- Análisis de archivos multimedia enviados por clientes
- App móvil nativa
- Interfaz de edición de contenido en la plataforma (la PYME edita en sus herramientas externas)

### Restricciones Identificadas

| ID | Restricción | Fuente | Impacto |
|----|-------------|--------|---------|
| C1 | Políticas de WhatsApp Business API (plantillas, ventanas 24h, aprobaciones) | Meta | Fricción operativa en el único canal del MVP. Costos por conversación que deben trasladarse al pricing. |
| C2 | Costo por token de LLM | OpenAI / Anthropic / otro | Costo operativo variable por uso. Cada conversación cuesta dinero real. Define pricing mínimo. Cotización calculada (D7) puede consumir más tokens por la complejidad del razonamiento. |
| C3 | Habeas data LATAM / GDPR si aplica | Regulatorio | Almacenamiento, cifrado, derecho al olvido. Aplica a datos de conversaciones y datos del negocio sincronizados. |
| C4 | Capacidad del equipo consultor | Operativo | Limita número de clientes en paralelo. Implementación en días mitiga parcialmente. |
| C5 | Límites de APIs de terceros (Google, Notion, Confluence) | Proveedores | Rate limits, cambios de API, costos de uso. Cada integración es una dependencia externa. |
| C6 | Sincronización continua requiere detección de cambios | Técnico | Las fuentes de verdad vivas (D6) necesitan mecanismos de polling o webhooks para detectar cambios en Drive/Notion/Confluence. No todos los proveedores ofrecen webhooks confiables. |

### Supuestos Declarados

> Si estos supuestos no se validan, se convierten en riesgos activos.

| ID | Supuesto | Cómo validar |
|----|----------|--------------|
| S1 | Las PYMES aceptarán que un agente de IA hable por ellas sin aprobación previa de cada respuesta | Piloto con 1-2 PYMES reales. |
| S2 | La vista web mínima de handoff es suficiente para que los empleados retomen conversaciones | Piloto + feedback de uso. |
| S3 | WhatsApp cubre el canal principal de la mayoría de PYMES target para el MVP | Entrevistas con primeros clientes. |
| S4 | Las PYMES target usan Google Drive, Notion o Confluence para gestionar su información de negocio | Preguntar en discovery con cada cliente. |
| S5 | El costo por conversación (token + WhatsApp) permite un modelo de precios rentable | Modelado financiero a construir. |
| S6 | La PYME será capaz de mantener su base de conocimiento actualizada en sus herramientas sin intervención del consultor | Piloto + métricas de actualización. |
| S7 | La sincronización continua con fuentes externas es técnicamente viable con latencia aceptable | Prueba técnica en Fase 5/6. |

---

## Fase 5: Architecture Context ✅ VALIDADA

> **Nivel de profundidad:** Alto nivel conceptual. Componentes principales, cómo se conectan, patrones de diseño elegidos, y reglas de negocio. Sin tecnologías específicas ni código.

### Arquitectura a Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTES / INTERFACES                                           │
│  WhatsApp (Meta API) │ [Canales futuros] │ Vista web handoff     │
│  Panel consultor │ Dashboard métricas                            │
└──────────────┬───────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────────┐
│  CAPA DE CANALES (D4 — Abstracción)                              │
│  Adaptador WhatsApp │ [Adaptador IG] │ [Adaptador N]             │
│  Contrato genérico: recibir/enviar mensaje, estado, metadata     │
└──────────────┬───────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────────┐
│  BACKEND / API DEL SISTEMA                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Orquestador de Conversaciones                               │ │
│  │  Routing │ Estado de sesión │ Decisión: agente o humano      │ │
│  └──────────────┬──────────────────────────────────────────────┘ │
│                 │                                                  │
│  ┌──────────────▼──────────────────────────────────────────────┐ │
│  │  Orquestador de Agentes (multi-agente)                       │ │
│  │  Router de intenciones │ Agente ventas │ Agente soporte      │ │
│  │  Agente agendamiento │ Agente cotización │ [Agente N]        │ │
│  │  Transferencia inter-agente con contexto compartido          │ │
│  └──────────────┬──────────────────────────────────────────────┘ │
│                 │                                                  │
│  ┌──────────────▼──────────────────────────────────────────────┐ │
│  │  Motor de Cotización (D7)                                    │ │
│  │  Reglas de cálculo │ Descuentos │ IVA │ Desglose             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Módulo de Handoff                                           │ │
│  │  Detección de escalamiento │ Notificación │ Transferencia    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Gestión Multi-Tenant                                        │ │
│  │  Aislamiento │ Roles │ Configuración por PYME                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────┬───────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────────┐
│  CAPA DE INTEGRACIONES (D5 — Abstracción)                         │
│  Patrón a evaluar: MCP vs. conectores directos (PoC pendiente)   │
│  Google Calendar │ Google Drive │ Notion │ Confluence │ APIs      │
│  Sincronización continua (D6) │ Detección de cambios             │
└──────────────┬───────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────────┐
│  CAPA DE PERSISTENCIA                                             │
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │  Base de datos     │  │  Base de           │                   │
│  │  del sistema       │  │  conocimiento      │                   │
│  │                    │  │                    │                    │
│  │  • Conversaciones  │  │  • Modo integrado  │                   │
│  │  • Sesiones        │  │    (memoria local) │                   │
│  │  • Config por PYME │  │  • Modo conectado  │                   │
│  │  • Usuarios/roles  │  │    (fuente externa)│                   │
│  │  • Logs/auditoría  │  │  • Catálogo        │                   │
│  │  • Métricas        │  │  • Reglas negocio  │                   │
│  └───────────────────┘  └───────────────────┘                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Flujo Principal de un Mensaje Entrante

1. Mensaje llega por WhatsApp → Adaptador de canal lo normaliza al contrato genérico.
2. Orquestador de conversaciones recibe el mensaje → verifica si la conversación está en modo "humano activo" (post-escalamiento). Si sí, rutea directo al humano vía bandeja. Si no, pasa al orquestador de agentes.
3. Orquestador de agentes analiza la intención → rutea al agente especializado correspondiente (ventas, soporte, agendamiento, cotización).
4. El agente especializado procesa → puede:
   - Responder directamente (consulta resuelta).
   - Transferir a otro agente especializado con contexto (ej: de ventas a agendamiento).
   - Ejecutar una acción (agendar en Calendar, generar cotización).
   - Escalar a humano (queja, consulta compleja, petición explícita).
5. Respuesta sale por el mismo canal vía el adaptador.

### Decisiones Arquitectónicas

| ID | Decisión | Detalle | Implicación |
|----|----------|---------|-------------|
| DA1 | Flujo agente-first | Todo mensaje entrante pasa primero por el agente. El agente decide si responde, redirige a otro agente, o escala a humano. No hay bypass directo a humano excepto en conversaciones ya escaladas. | El agente es el punto de entrada único. Simplifica el routing pero requiere que el agente sea confiable en su decisión de escalamiento. |
| DA2 | Multi-agente con orquestador | No es un solo agente configurable — es un orquestador que rutea a agentes especializados. Cada PYME puede tener configuración distinta de agentes activos. | Significativamente más complejo que agente único. Requiere router de intenciones, gestión de contexto compartido, y configuración por PYME de agentes activos. |
| DA3 | MCP: evaluación diferida a PoC | No se toma decisión sobre MCP como patrón de integración hasta hacer prueba de concepto. La abstracción de integraciones (D5) se diseña agnóstica al patrón de implementación. | Flexibilidad para adoptar MCP si resulta viable, o usar conectores directos si no. No bloquea el desarrollo del MVP. |
| DA4 | Base de conocimiento dual | Dos modos: integrado (memoria local, el consultor carga la info) y conectado (fuente externa, sincronización continua con Drive/Notion/Confluence). Ambos pueden coexistir en una misma PYME. | La arquitectura debe soportar ambos modos simultáneamente. El modo conectado depende de D6 (sincronización continua). |
| DA5 | Transferencia inter-agente | Los agentes especializados pueden transferirse contexto entre sí. El flujo no es solo agente→humano, sino también agente→agente. El orquestador gestiona las transferencias preservando contexto. | Requiere un mecanismo de paso de contexto entre agentes. La conversación puede pasar por múltiples agentes antes de resolverse o escalarse. |
| DA6 | Retención permanente de conversaciones | Las conversaciones se almacenan indefinidamente para auditoría y mejora del agente. Mecanismo de eliminación bajo demanda para cumplimiento regulatorio (habeas data, derecho al olvido). | Almacenamiento crece indefinidamente. Necesita estrategia de archivado y mecanismo de purga selectiva por regulación. |
| DA7 | Guardrails del agente: diferidos | Las reglas de negocio específicas (qué puede/no puede decir, cuándo escalar obligatoriamente) se definen durante la implementación de la lógica del agente, no en arquitectura. La arquitectura soporta guardrails configurables por PYME. | El sistema debe tener un framework de reglas/guardrails que el consultor configure por cliente. El contenido de las reglas es variable. |
| DA8 | Prompt versioning + eval pipeline | Los prompts del agente deben ser versionados (cada cambio queda registrado con fecha y autor). Se debe implementar un pipeline de evaluación que permita testear la calidad de las respuestas antes de desplegar cambios a producción. | Requiere infraestructura de versionado de prompts y un conjunto de casos de prueba por PYME para evaluar regresiones. |

### Reglas de Negocio Identificadas (nivel arquitectónico)

Estas son reglas que la arquitectura debe soportar, aunque su contenido específico se define por PYME:

| Regla | Descripción | Componente afectado |
|-------|-------------|---------------------|
| RN1 | El agente nunca procesa pagos ni captura datos de tarjeta | Orquestador de agentes — guardrail global |
| RN2 | El agente solo responde en español LATAM | Motor de agente — configuración de idioma |
| RN3 | Cada PYME tiene datos completamente aislados de las demás | Multi-tenant — aislamiento en todas las capas |
| RN4 | Las conversaciones escaladas a humano no vuelven al agente automáticamente | Orquestador de conversaciones — estado de sesión |
| RN5 | La cotización siempre muestra desglose (no solo total) | Motor de cotización — formato de salida |
| RN6 | El cliente puede solicitar hablar con un humano en cualquier momento | Orquestador de agentes — detección de intención de escalamiento |
| RN7 | Los guardrails específicos (qué puede/no puede decir) son configurables por PYME | Framework de reglas — configurable por consultor |
| RN8 | La base de conocimiento conectada se sincroniza automáticamente cuando la fuente cambia | Capa de integraciones — sincronización continua (D6) |
| RN9 | Las conversaciones se cierran por inactividad (timeout configurable por PYME), por despedida explícita del cliente, o por cierre manual del humano post-handoff | Orquestador de conversaciones — gestión de estado de sesión. Impacta métricas (KP1, KP4) y costos (ventana 24h de WhatsApp). |

### Modelo de Datos Conceptual (alto nivel)

**Entidades principales:**

- **Tenant (PYME):** Configuración, agentes activos, integraciones conectadas, reglas de negocio.
- **Conversación:** Canal, mensajes, estado (activa/escalada/cerrada), agente(s) que participaron, timestamp.
- **Mensaje:** Contenido, dirección (entrante/saliente), autor (cliente/agente/humano), timestamp.
- **Agente:** Tipo (ventas/soporte/agendamiento/cotización/custom), configuración, guardrails.
- **Base de conocimiento:** Items de catálogo, documentos, FAQs, reglas de cotización. Fuente (local/externa).
- **Integración:** Tipo, credenciales, estado de sincronización, última actualización.
- **Usuario:** Rol (consultor/admin-pyme/operador-pyme), permisos, tenant asociado.

### Patrones de Diseño Elegidos

| Patrón | Aplicación | Justificación |
|--------|-----------|---------------|
| Adapter Pattern | Capa de canales (D4) y capa de integraciones (D5) | Permite agregar canales/integraciones sin modificar el core. Cada canal/integración implementa un contrato genérico. |
| Multi-tenant con aislamiento lógico | Toda la plataforma | Una instancia del sistema sirve a múltiples PYMES con datos aislados. Más eficiente que instancias separadas. |
| Event-driven (para sincronización) | Capa de integraciones → Base de conocimiento | Los cambios en fuentes externas disparan eventos de re-ingesta. Desacopla la detección de cambios del procesamiento. |
| Chain of Responsibility | Orquestador de agentes | El mensaje pasa por una cadena de agentes especializados hasta que uno lo resuelve o se escala. |
| Strategy Pattern | Motor de cotización | Las reglas de cálculo son intercambiables por PYME. Cada vertical tiene su estrategia de cotización. |

### Riesgos Arquitectónicos Identificados

| ID | Riesgo | Prob. | Impacto | Plan de Mitigación |
|----|--------|-------|---------|-------------------|
| R17 | **Complejidad del multi-agente.** Un orquestador de múltiples agentes con transferencia inter-agente es significativamente más complejo que un agente único. El router de intenciones puede fallar en la clasificación. | Alta | Alto | Empezar con 2-3 agentes especializados bien definidos. Fallback: si el router no sabe, escala a humano. |
| R18 | **Contexto compartido entre agentes.** La transferencia de contexto entre agentes puede perder información o generar respuestas incoherentes si el paso de contexto no es robusto. | Media | Alto | Diseñar un formato de contexto estandarizado. Testing exhaustivo de transferencias. |
| R19 | **Almacenamiento indefinido.** La retención permanente de conversaciones implica crecimiento continuo de almacenamiento. Sin estrategia de archivado, los costos crecen linealmente con el uso. | Media | Medio | Estrategia de archivado (hot/cold storage). Monitoreo de costos. |

---

## Fase 6: Development Context ✅ VALIDADA

> **Contexto del equipo:** Equipo fullstack pequeño con experiencia previa en LLMs y WhatsApp Business API. Presupuesto de infraestructura limitado.

### Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Backend | Python + FastAPI | Ecosistema maduro para IA/LLM. FastAPI es async-native, ideal para manejar webhooks de WhatsApp y llamadas a LLMs sin bloquear. |
| Frontend | React + Next.js | Para la vista web de handoff, panel del consultor y dashboard. Next.js permite SSR y API routes si se necesitan. |
| Base de datos | PostgreSQL | Relacional, maduro, soporta JSON nativo (útil para almacenar conversaciones y configuraciones flexibles por PYME). Multi-tenant con aislamiento lógico (schema por tenant o row-level security). |
| Infraestructura MVP | Render / Fly.io / Railway | Bajo costo inicial, deploy simple, sin overhead de DevOps. Suficiente para MVP y primeros clientes. |
| Infraestructura post-MVP | AWS | Migración cuando el volumen lo justifique. La arquitectura debe ser cloud-agnostic para facilitar la transición. |
| Proveedor LLM | OpenAI / Anthropic (a definir) | Experiencia previa del equipo. Evaluar costo por token vs. calidad de respuesta para el caso de uso conversacional. |

### Decisiones de Desarrollo

| ID | Decisión | Detalle |
|----|----------|---------|
| DD1 | Monorepo o repos separados | A definir por el equipo. Recomendación: monorepo para MVP (simplifica deploys y coordinación en equipo pequeño). |
| DD2 | API-first | El backend expone APIs REST que el frontend consume. La vista web de handoff, el panel del consultor y el dashboard son clientes del mismo backend. |
| DD3 | Webhooks para WhatsApp | Meta envía mensajes vía webhooks. FastAPI los recibe, valida, y enruta al orquestador de conversaciones. |
| DD4 | Async para LLM calls | Las llamadas al LLM son async (no bloquean el event loop). Importante para mantener latencia < 3s (RNF2) bajo carga. |
| DD5 | PostgreSQL para multi-tenant | Aislamiento lógico vía row-level security o schema por tenant. Decisión exacta a tomar durante implementación. |
| DD6 | Cloud-agnostic | No usar servicios propietarios de un cloud provider en MVP. Facilita la migración de Render/Fly/Railway a AWS cuando sea necesario. |
| DD7 | Presupuesto limitado | Priorizar servicios con tier gratuito o bajo costo. Evitar over-engineering de infraestructura. El MVP debe poder correr con costos mínimos hasta tener clientes pagando. |

### Estrategia de Testing

| Tipo | Alcance | Prioridad |
|------|---------|-----------|
| Tests unitarios | Lógica de negocio: motor de cotización, router de intenciones, reglas de guardrails | Alta |
| Tests de integración | Flujo completo: mensaje entrante → agente → respuesta. Conexión con APIs externas (Calendar, Drive, WhatsApp). | Alta |
| Tests end-to-end | Flujo completo desde WhatsApp hasta respuesta del agente. Simulación de conversaciones reales. | Media |
| Tests de carga | Validar que el sistema soporta múltiples conversaciones simultáneas sin degradar latencia. | Media (pre-producción) |

### Entorno de Desarrollo

- **Local:** Docker Compose para levantar PostgreSQL + backend + frontend.
- **Staging:** Instancia en Render/Fly/Railway para testing con WhatsApp sandbox de Meta.
- **Producción:** Misma plataforma que staging inicialmente. Migración a AWS cuando el volumen lo justifique.

### Dependencias Externas Críticas

| Dependencia | Propósito | Riesgo |
|-------------|-----------|--------|
| Meta WhatsApp Business API | Canal único del MVP | Si Meta cambia políticas o revoca acceso, el producto queda inoperante (R16). |
| Proveedor LLM (OpenAI/Anthropic) | Motor de agente | Costo variable por uso. Cambios de pricing o API pueden impactar. |
| Google APIs (Calendar, Drive) | Integraciones clave | Rate limits, cambios de API, OAuth. |
| Notion API | Integración de conocimiento | Rate limits, API relativamente nueva, cambios frecuentes. |
| Confluence API (Atlassian) | Integración de conocimiento | Requiere autenticación Atlassian, API compleja. |

---

## Fase 7: Implementation Strategy ✅ VALIDADA

> **Estrategia de entrega:** Incrementos funcionales. Cada incremento entrega valor demostrable y es potencialmente desplegable. No hay timeline fijo — el ritmo lo marca la capacidad del equipo.

### Secuencia de Incrementos

La secuencia se ordena por dependencias técnicas (lo que se necesita antes para que lo siguiente funcione) y por valor de negocio (lo que permite demostrar el producto lo antes posible).

#### Incremento 1 — Fundación + Agente básico respondiendo por WhatsApp

**Objetivo:** Un agente de IA que recibe mensajes por WhatsApp y responde consultas usando una base de conocimiento cargada manualmente. Es la prueba de concepto mínima del producto.

**Incluye:**
- Estructura del proyecto (monorepo, CI/CD básico, entorno local con Docker).
- Capa de canales con adaptador de WhatsApp (D4 — abstracción desde el diseño, pero solo WhatsApp implementado).
- Conexión con WhatsApp Business API (webhooks, envío/recepción de mensajes).
- Motor de agente básico: un solo agente que responde consultas con base de conocimiento local.
- Base de conocimiento modo integrado (carga manual de archivos + formulario estructurado).
- PostgreSQL con modelo de datos inicial (tenants, conversaciones, mensajes, config).
- Multi-tenant básico (aislamiento lógico).

**Valor demostrable:** "Le escribo por WhatsApp y el agente me responde con información del negocio."

**Criterio de completitud:** Un mensaje de WhatsApp llega, el agente responde correctamente usando la base de conocimiento, la conversación se almacena.

---

#### Incremento 2 — Multi-agente + Agendamiento

**Objetivo:** El orquestador de agentes rutea a agentes especializados. El agente de agendamiento puede consultar disponibilidad y crear citas en Google Calendar.

**Incluye:**
- Orquestador de agentes (DA2) con router de intenciones.
- Agente de agendamiento conectado a Google Calendar (OAuth, consulta de slots, creación de eventos).
- Transferencia inter-agente con contexto (DA5).
- Capa de integraciones con adaptador de Google Calendar (D5 — abstracción desde el diseño).

**Valor demostrable:** "Le escribo por WhatsApp pidiendo una cita, el agente me muestra disponibilidad y agenda en el calendario del negocio."

**Criterio de completitud:** El cliente pide cita → agente muestra slots disponibles → cliente elige → evento creado en Google Calendar → confirmación enviada al cliente.

---

#### Incremento 3 — Cotización calculada

**Objetivo:** El agente de cotización genera cotizaciones con desglose basadas en reglas configurables por PYME.

**Incluye:**
- Motor de cotización (D7) con reglas de cálculo, descuentos, IVA.
- Agente de cotización como agente especializado en el orquestador.
- Configuración de reglas de cotización por tenant.

**Valor demostrable:** "Le pido una cotización por WhatsApp, el agente calcula el total con desglose y me lo envía."

**Criterio de completitud:** Cliente pide cotización de múltiples servicios → agente calcula con reglas del negocio → envía desglose con totales → notifica al humano si hay intención de compra.

---

#### Incremento 4 — Handoff humano + Vista web

**Objetivo:** El agente puede escalar a un humano. El humano recibe notificación, abre un link, ve la conversación, y responde por el mismo canal.

**Incluye:**
- Módulo de handoff (detección de escalamiento, notificación).
- Vista web mínima de handoff (link → historial → responder).
- Orquestador de conversaciones: gestión de estado (activa/escalada/humano-activo).
- Flujo de retorno: cuando el humano termina, la conversación puede cerrarse o volver al agente.

**Valor demostrable:** "El agente no puede resolver mi consulta, me dice que un humano me contactará. El empleado de la PYME recibe notificación, abre el link, y me responde por WhatsApp."

**Criterio de completitud:** Escalamiento detectado → humano notificado → humano abre vista web → humano responde → cliente recibe respuesta por WhatsApp.

---

#### Incremento 5 — Fuentes de verdad vivas (sincronización)

**Objetivo:** La base de conocimiento se sincroniza automáticamente con fuentes externas (Google Drive, Notion, Confluence). La PYME edita en sus herramientas y el agente se actualiza solo.

**Incluye:**
- Adaptadores de integración para Google Drive, Notion, Confluence (D5).
- Mecanismo de sincronización continua (D6): polling o webhooks según proveedor.
- Base de conocimiento modo conectado (fuente externa).
- Detección de cambios y re-ingesta automática.

**Valor demostrable:** "La PYME actualiza un precio en su Google Sheet, y el agente responde con el precio nuevo sin intervención del consultor."

**Criterio de completitud:** Cambio en fuente externa → sistema detecta cambio → re-ingesta → agente responde con información actualizada.

---

#### Incremento 6 — Panel del consultor + Dashboard + APIs de terceros

**Objetivo:** El consultor tiene una vista para gestionar múltiples PYMES. Dashboard de métricas básicas. Conexión con APIs de terceros/MCP.

**Incluye:**
- Panel del consultor (Next.js): vista multi-PYME, configuración de agentes, gestión de integraciones.
- Dashboard de métricas básicas (volumen, % resolución IA, tiempos, escalamientos).
- Roles básicos (consultor, admin-pyme, operador-pyme).
- Integración con APIs de terceros / patrón MCP (resultado del PoC de DA3).

**Valor demostrable:** "El consultor ve todas sus PYMES en un panel, configura agentes, y revisa métricas de rendimiento."

**Criterio de completitud:** Panel funcional con gestión multi-PYME + dashboard con métricas reales + al menos una integración con API de terceros funcionando.

---

### Dependencias entre Incrementos

```
Incremento 1 (Fundación + Agente básico)
    │
    ├── Incremento 2 (Multi-agente + Agendamiento)
    │       │
    │       └── Incremento 3 (Cotización calculada)
    │
    ├── Incremento 4 (Handoff humano)
    │
    └── Incremento 5 (Fuentes de verdad vivas)
            │
            └── Incremento 6 (Panel + Dashboard + APIs)
```

**Nota:** Los incrementos 2, 4 y 5 pueden desarrollarse en paralelo después del Incremento 1 si el equipo tiene capacidad. El Incremento 3 depende del 2 (necesita el orquestador multi-agente). El Incremento 6 depende del 5 (necesita las integraciones funcionando).

### Estrategia de Piloto

- **Primer cliente piloto:** Se puede incorporar a partir del Incremento 2 (agente que responde + agenda). No es necesario esperar a que todo esté completo.
- **Feedback loop:** Cada incremento se valida con el cliente piloto antes de avanzar al siguiente.
- **Go/No-Go por incremento:** Si un incremento no funciona bien con el piloto, se itera antes de avanzar.

### Criterios de Release (MVP completo)

El MVP se considera completo cuando los incrementos 1-5 están funcionando en producción con al menos un cliente piloto. El Incremento 6 (panel + dashboard) puede llegar después sin bloquear la operación — el consultor puede operar sin panel dedicado inicialmente.

### Estructura de Soluciones (organización del equipo)

> **Principio:** Primero se construye una base compartida que establece los contratos, la persistencia y la comunicación entre componentes. Luego cada desarrollador toma una solución independiente sin pisarse con los demás.

#### Capa 0 — Fundación (se construye primero, en equipo)

El esqueleto del sistema. Nadie puede trabajar en una solución específica hasta que esto exista.

**Incluye:**
- Estructura del proyecto (monorepo, configuración de entorno, Docker Compose).
- Modelo de datos en PostgreSQL (tablas de tenants, conversaciones, mensajes, sesiones, configuración, usuarios).
- Multi-tenant con aislamiento lógico.
- Contrato genérico de canal (interfaz que todo adaptador de canal debe implementar).
- Contrato genérico de integración (interfaz que todo conector debe implementar).
- Contrato del orquestador de agentes (cómo se registra un agente, cómo recibe un mensaje, cómo responde, cómo transfiere contexto).
- Bus de eventos interno (mensaje_recibido, respuesta_generada, escalamiento_detectado, cita_creada, cotización_generada, conocimiento_actualizado).
- API base de FastAPI (endpoints de health, autenticación básica, estructura de routers).
- Cifrado y configuración de seguridad base.

**Resultado:** Un sistema que arranca, recibe un mensaje por un canal genérico, lo pasa a un orquestador que no hace nada todavía, y lo persiste. Los contratos están definidos pero las implementaciones son stubs.

**Tiempo estimado:** El primer sprint del equipo completo.

#### Capa 1 — Soluciones independientes (cada dev toma una)

Una vez que la Capa 0 existe, cada desarrollador trabaja en una solución sin depender de los demás. Cada solución implementa un contrato definido en la Capa 0.

| Solución | Qué implementa | Contrato que cumple | Puede trabajarse en paralelo con |
|----------|----------------|--------------------|---------------------------------|
| **S1 — Adaptador WhatsApp** | Conexión con Meta API, webhooks, envío/recepción, manejo de plantillas y ventanas 24h. | Contrato genérico de canal | S2, S3, S4, S5 |
| **S2 — Agente de consultas (base)** | Agente que recibe un mensaje, consulta la base de conocimiento, y genera una respuesta. Es el agente "default". | Contrato del orquestador de agentes | S1, S3, S4, S5 |
| **S3 — Agente de agendamiento** | Agente especializado que consulta Google Calendar, muestra slots, crea eventos, confirma. Implementa el adaptador de Google Calendar. | Contrato del orquestador + contrato de integración | S1, S2, S4, S5 |
| **S4 — Agente de cotización** | Motor de reglas de cálculo, descuentos, IVA. Genera desglose. Detecta intención de compra y notifica. | Contrato del orquestador | S1, S2, S3, S5 |
| **S5 — Módulo de handoff** | Detección de escalamiento, cambio de estado de sesión, notificación al humano, vista web mínima para retomar. | Bus de eventos (evento: escalamiento_detectado) | S1, S2, S3, S4 |
| **S6 — Sincronización de conocimiento** | Adaptadores de Drive/Notion/Confluence, detección de cambios, re-ingesta automática. | Contrato de integración + bus de eventos (evento: conocimiento_actualizado) | S1-S5 (después de Capa 0) |
| **S7 — Panel del consultor + Dashboard** | Frontend Next.js: vista multi-PYME, configuración, métricas, roles. | API base de FastAPI (consume endpoints) | S1-S6 (después de que haya datos) |

#### Diagrama de integración

```
                    ┌─────────────────────────┐
                    │      CAPA 0             │
                    │  Contratos + Bus +      │
                    │  Persistencia + Multi-  │
                    │  tenant + API base      │
                    └────────┬────────────────┘
                             │
        ┌────────┬───────────┼───────────┬────────────┐
        │        │           │           │            │
   ┌────▼──┐ ┌──▼───┐ ┌────▼────┐ ┌───▼────┐ ┌────▼────┐
   │  S1   │ │  S2  │ │   S3    │ │  S4    │ │   S5    │
   │WhatsApp│ │Agente│ │Agenda-  │ │Cotiza- │ │Handoff  │
   │Adapter│ │ Base │ │miento   │ │ción    │ │         │
   └───────┘ └──────┘ └─────────┘ └────────┘ └─────────┘
                             │
                    ┌────────▼────────────────┐
                    │  S6 — Sincronización    │
                    │  S7 — Panel + Dashboard │
                    └─────────────────────────┘
```

#### Reglas de trabajo

1. **Nadie modifica la Capa 0 sin consenso del equipo.** Los contratos son sagrados — si alguien necesita cambiar un contrato, se discute primero.
2. **Cada solución tiene tests contra el contrato.** Si tu adaptador de WhatsApp cumple el contrato de canal, funciona con el sistema. No necesitas que S2 esté lista para probar S1.
3. **Mocks para dependencias.** Mientras S1 no esté lista, S2 puede trabajar con un mock de canal que simula mensajes entrantes. Mientras S2 no esté lista, S5 puede trabajar con un mock de agente que simula escalamientos.
4. **Integración continua.** Cada PR debe pasar los tests de contrato. Cuando dos soluciones se conectan por primera vez, se hace un test de integración.

---

## Fase 8: Success Criteria ✅ VALIDADA

> **Contexto:** No hay datos cuantitativos de línea base (R05). Los criterios de éxito se definen como hipótesis a validar con el piloto. Se priorizan métricas que el sistema puede medir automáticamente.

### KPIs del MVP

#### KPIs de Producto (el sistema funciona)

| ID | KPI | Meta hipotética | Cómo se mide | Cuándo se valida |
|----|-----|-----------------|--------------|------------------|
| KP1 | % de consultas resueltas por IA sin escalamiento | ≥ 70% | Conversaciones cerradas por agente / total de conversaciones | Piloto (Incremento 2+) |
| KP2 | Tiempo de respuesta del agente | < 3 segundos (RNF2) | Timestamp de mensaje entrante vs. timestamp de respuesta | Desde Incremento 1 |
| KP3 | Disponibilidad del sistema | ≥ 99% uptime | Monitoreo de infraestructura | Desde Incremento 1 |
| KP4 | Tasa de escalamiento a humano | ≤ 30% | Conversaciones escaladas / total | Piloto (Incremento 4+) |
| KP5 | Precisión del agendamiento | 100% (citas creadas correctamente en Calendar) | Eventos creados vs. solicitudes de agendamiento | Piloto (Incremento 2+) |
| KP6 | Precisión de cotización | 100% (cálculos correctos según reglas configuradas) | Cotizaciones generadas vs. reglas de negocio | Piloto (Incremento 3+) |

#### KPIs de Negocio (el producto genera valor)

| ID | KPI | Meta hipotética | Cómo se mide | Cuándo se valida |
|----|-----|-----------------|--------------|------------------|
| KN1 | Reducción de horas humanas en consultas repetitivas | ≥ 60% (hipótesis de Fase 2) | Horas antes del agente vs. horas después (medición manual con PYME piloto) | Post go-live con piloto |
| KN2 | Tiempo de implementación por cliente | ≤ 5 días hábiles | Días desde kickoff hasta go-live | Desde primer cliente |
| KN3 | Satisfacción del cliente final (PYME) | NPS ≥ 7 | Encuesta post-implementación | Post go-live con piloto |
| KN4 | Retención del cliente (PYME sigue pagando) | ≥ 3 meses continuos | Meses de suscripción activa | 3 meses post go-live |
| KN5 | Adopción del handoff por empleados | ≥ 80% de escalamientos atendidos en < 1 hora | Tiempo entre notificación y respuesta del humano | Piloto (Incremento 4+) |

#### KPIs de Viabilidad Económica

| ID | KPI | Meta hipotética | Cómo se mide | Cuándo se valida |
|----|-----|-----------------|--------------|------------------|
| KE1 | Costo por conversación (tokens + WhatsApp) | ≤ 20% del ingreso por suscripción mensual | (Costo tokens + costo WhatsApp) / ingreso mensual por cliente | Piloto con volumen real |
| KE2 | Margen bruto por cliente | ≥ 50% | (Ingreso mensual - costos operativos) / ingreso mensual | 3 meses post go-live |
| KE3 | Tiempo de recuperación de inversión de implementación | ≤ 3 meses de suscripción | Costo de implementación / ingreso mensual recurrente | Post go-live |

### Criterios de Go/No-Go

#### Go para escalar (buscar más clientes)

Se cumplen TODOS:
- KP1 ≥ 70% (el agente resuelve la mayoría sin humano).
- KP2 < 3s (la experiencia es conversacional, no se siente como bot lento).
- KN1 ≥ 40% (aunque la meta es 60%, con 40% ya hay valor demostrable).
- KE1 ≤ 20% (el modelo de precios es sostenible).
- KN4: al menos 1 cliente piloto retenido 3 meses.

#### No-Go (pivotar o iterar)

Si alguno de estos ocurre:
- KP1 < 50% (el agente escala más de la mitad de las conversaciones — no está resolviendo el problema).
- KN1 < 20% (la PYME no percibe reducción significativa de carga).
- KE1 > 40% (el costo operativo se come el margen — modelo de precios inviable).
- KN4: cliente piloto cancela antes de 2 meses.

### Supuestos de Medición

⚠️ **KN1 (reducción de horas) requiere medición manual.** No hay forma automática de saber cuántas horas dedicaba la PYME antes del agente. Se necesita:
- Estimación pre-implementación con la PYME ("¿cuántas horas al día dedican a responder consultas?").
- Medición post-implementación ("¿cuántas horas dedican ahora?").
- Esto es subjetivo y propenso a sesgo. Es el mejor proxy disponible sin datos duros.

⚠️ **Las metas son hipótesis.** Todas las metas numéricas (70%, 60%, 3s, etc.) son hipótesis sin línea base. Se ajustarán con datos reales del piloto. Lo importante es tener las métricas definidas para poder medir, no que los números sean exactos.

---

## Fase 9: Risks and Dependencies ✅ VALIDADA

> **Consolidación final.** Esta fase integra todos los riesgos identificados en fases anteriores (R01-R19) más dependencias críticas del proyecto.

### Dependencias Críticas del Proyecto

| ID | Dependencia | Tipo | Impacto si falla | Plan B |
|----|-------------|------|-------------------|--------|
| DEP1 | WhatsApp Business API (Meta) | Externa — Proveedor | El producto queda inoperante. Es el único canal del MVP. | D4 (abstracción) permite migrar a otro canal, pero no hay alternativa inmediata para WhatsApp en LATAM. |
| DEP2 | Proveedor LLM (OpenAI/Anthropic) | Externa — Proveedor | El agente no puede responder. Core del producto muerto. | Diseñar para ser LLM-agnostic. Si un proveedor falla o sube precios, migrar a otro. |
| DEP3 | Google APIs (Calendar, Drive) | Externa — Proveedor | Agendamiento y sincronización de conocimiento dejan de funcionar. | Degradación graceful: el agente informa que no puede agendar y escala a humano. |
| DEP4 | Notion API / Confluence API | Externa — Proveedor | Sincronización de conocimiento desde esas fuentes se detiene. | Fallback a base de conocimiento local (modo integrado). |
| DEP5 | Cuenta Meta Business verificada (por cada PYME) | Externa — Cliente | Sin cuenta verificada, no se puede conectar WhatsApp para esa PYME. | Incluir en el proceso de onboarding consultivo. Asistir a la PYME en la verificación. |
| DEP6 | Capacidad del equipo | Interna — Recurso | Velocidad de desarrollo limitada. Incrementos se retrasan. | Priorizar incrementos por valor. No comprometer fechas sin capacidad real. |
| DEP7 | Cliente piloto disponible | Externa — Mercado | Sin piloto, no se pueden validar KPIs ni iterar con feedback real. | Identificar 2-3 candidatos a piloto antes de empezar Incremento 1. |

### Resumen de Riesgos por Severidad

**Críticos (Prob. Alta × Impacto Alto):**
- R01 — Validación insuficiente del problema.
- R03 — Mercado altamente competido.
- R07 — Diferenciación no definida.
- R09/R13 — Scope de integraciones ambicioso.
- R17 — Complejidad del multi-agente.

**Altos (Prob. Media × Impacto Alto):**
- R02 — Multi-vertical prematura.
- R11/R12 — Adopción operativa en la PYME.
- R14 — Sincronización continua con fuentes externas.
- R15 — Motor de cotización multi-vertical.
- R18 — Contexto compartido entre agentes.

**Medios:**
- R04, R05, R06, R08, R16, R19.

### Estrategia de Mitigación Global

1. **Piloto temprano (Incremento 2).** La mayoría de riesgos críticos se mitigan con un piloto real. No esperar a tener todo completo para validar.
2. **Abstracciones desde el diseño (D4, D5).** Reducen el impacto de dependencias externas a mediano plazo.
3. **Incrementos funcionales.** Si un incremento falla, se itera sin haber invertido en todo el MVP.
4. **Fallbacks definidos.** Cada dependencia externa tiene un plan B documentado.
5. **Go/No-Go por incremento.** Decisiones de continuar o pivotar basadas en datos del piloto, no en suposiciones.

---

## Matriz de Riesgos (consolidada hasta Fase 5)

| ID | Riesgo | Prob. | Impacto | Fase origen | Plan de Mitigación |
|----|--------|-------|---------|-------------|-------------------|
| R01 | **Validación insuficiente del problema.** No hay datos duros ni entrevistas formales. Se podría estar construyendo algo que resuelve un dolor percibido, no real. | Alta | Alto | F1 | Piloto con 1-2 PYMES reales antes de escalar. Medir antes/después. |
| R02 | **Decisión multi-vertical prematura.** Una clínica, una academia y un e-commerce tienen flujos radicalmente distintos. Multi-vertical diluye la propuesta de valor y multiplica la complejidad del producto. | Media | Alto | F1 | Elegir un vertical de entrada internamente aunque la plataforma sea técnicamente genérica. |
| R03 | **Mercado altamente competido.** ManyChat, Tidio, Kommo, Respond.io, Intercom, Zendesk, Leadsales, Chatwoot ya existen y tienen tracción. | Alta | Alto | F1 | Definir diferenciación clara. Depende de resolver R07. |
| R04 | **Modelo consultivo no escala linealmente.** Cada cliente nuevo = horas de implementación. El crecimiento depende de capacidad humana. | Media | Medio | F1 | Documentar procesos, crear plantillas replicables, estandarizar el onboarding consultivo. Mitigado parcialmente: implementación en días, no semanas. |
| R05 | **Costo de la inacción no cuantificado.** Sin línea base económica, no se puede defender el ROI numéricamente. | Alta | Medio | F1 | Riesgo asumido conscientemente. ROI defendible solo cualitativamente hasta piloto real. |
| R06 | **Resistencia al cambio en empleados de la PYME.** Automatizar conversaciones puede percibirse como amenaza de reemplazo laboral. | Media | Medio | F1 | Posicionar la IA como complemento, no como reemplazo. Capacitación en implementación consultiva. |
| R07 | **Diferenciación no definida.** O1 no fue validado. No hay un norte sobre por qué una PYME elegiría esta plataforma y no una existente. | Alta | Alto | F2 | Atender antes de ir a mercado. Punto ciego más grande del análisis. |
| R08 | **Métrica de valor hipotética.** La promesa "reducción del 60% en horas humanas" no tiene línea base real. | Media | Medio | F2 | Validar con al menos una PYME piloto. Medir horas antes/después. |
| R09 | **Scope de integraciones descontrolado.** 6 integraciones heterogéneas en MVP, cada una con autenticación, modelo de datos y mantenimiento distintos. | Alta | Alto | F3/F4 | Abstracción de integraciones (D5). Modelo consultivo mitiga complejidad de UX pero no la técnica. |
| R11 | **Handoff depende de adopción de herramienta nueva.** El humano de la PYME debe abrir un link web para retomar conversaciones escaladas. | Media | Medio | F3/F4 | Mitigado parcialmente por D8 (interfaz mínima = menor fricción). Vista web simple sin login complejo. |
| R12 | **Adopción operativa en la PYME.** La PYME debe mantener su base de conocimiento actualizada en sus herramientas externas para que el agente funcione bien. | Media | Alto | F3/F4 | D6 (fuentes de verdad vivas) reduce fricción: la PYME edita donde ya sabe editar. Validar en piloto. |
| R13 | **Scope de integraciones ambicioso para MVP.** 6 integraciones heterogéneas (carga manual, Google Calendar, Google Drive, APIs/MCP, Notion, Confluence) multiplican esfuerzo de desarrollo y testing. | Alta | Alto | F4 | Abstracción desde el diseño (D5). Priorizar integraciones por cliente piloto. Aceptar que algunas pueden llegar incompletas al MVP. |
| R14 | **Sincronización continua con fuentes externas.** Las fuentes de verdad vivas (D6) requieren detección de cambios en tiempo real o near-real-time. No todos los proveedores ofrecen webhooks confiables (Google Drive tiene limitaciones, Notion API tiene rate limits). | Media | Alto | F4 | Evaluar viabilidad técnica en Fase 5. Fallback: polling periódico con latencia aceptable. |
| R15 | **Motor de cotización calculada multi-vertical.** La Opción B (cotización con desglose) requiere reglas de cálculo configurables que varían por vertical y por cliente. Complejidad de E2 aumenta significativamente. | Media | Alto | F4 | Diseñar motor de reglas genérico. Validar con 2-3 verticales distintos en Fase 5. |
| R16 | **Dependencia de un solo canal (WhatsApp).** El MVP depende 100% de WhatsApp Business API. Si Meta cambia políticas, sube precios, o revoca acceso, el producto queda inoperante. | Baja | Crítico | F4 | D4 (abstracción de canales) mitiga a mediano plazo. A corto plazo, es riesgo aceptado. |
| R17 | **Complejidad del multi-agente.** Un orquestador de múltiples agentes con transferencia inter-agente es significativamente más complejo que un agente único. El router de intenciones puede fallar en la clasificación. | Alta | Alto | F5 | Empezar con 2-3 agentes especializados bien definidos. Fallback: si el router no sabe, escala a humano. |
| R18 | **Contexto compartido entre agentes.** La transferencia de contexto entre agentes puede perder información o generar respuestas incoherentes. | Media | Alto | F5 | Formato de contexto estandarizado. Testing exhaustivo de transferencias. |
| R19 | **Almacenamiento indefinido.** La retención permanente de conversaciones implica crecimiento continuo de almacenamiento sin estrategia de archivado. | Media | Medio | F5 | Estrategia de archivado (hot/cold storage). Monitoreo de costos. |

---

## Solution Map Preliminar

> Organizado según la estructura de soluciones definida en Fase 7: Capa 0 (fundación compartida) + Soluciones independientes (S1-S7). Cada solución entrega valor E2E demostrable y puede ser asignada a un desarrollador. Los flujos E2E emergen de la combinación de soluciones.

### Capa 0 — Fundación

| # | Componente | Descripción E2E | Soluciones que habilita | Complejidad | Prioridad |
|---|-----------|-----------------|------------------------|-------------|-----------|
| C0.1 | Modelo de datos + PostgreSQL + Multi-tenant | Tablas de tenants, conversaciones, mensajes, sesiones, configuración, usuarios. Aislamiento lógico entre PYMES. Cifrado en reposo. | Todas (S1-S7) | Alta | P0 |
| C0.2 | Contrato genérico de canal (D4) | Interfaz que todo adaptador de canal debe implementar: recibir mensaje, enviar mensaje, estado, metadata. Stub de canal para testing. | S1 | Media | P0 |
| C0.3 | Contrato del orquestador de agentes | Cómo se registra un agente, cómo recibe un mensaje, cómo responde, cómo transfiere contexto a otro agente. Stub de agente para testing. | S2, S3, S4 | Alta | P0 |
| C0.4 | Contrato genérico de integración (D5) | Interfaz que todo conector externo debe implementar: autenticación, ingesta, sincronización, estado. Stub de integración para testing. | S3, S6 | Media | P0 |
| C0.5 | Bus de eventos interno | Eventos: mensaje_recibido, respuesta_generada, escalamiento_detectado, cita_creada, cotización_generada, conocimiento_actualizado, conversación_cerrada. | S1-S7 | Media | P0 |
| C0.6 | API base FastAPI + autenticación | Estructura de routers, endpoints de health, autenticación básica, middleware de tenant. | S5, S7 | Media | P0 |
| C0.7 | Estructura del proyecto | Monorepo, Docker Compose, CI/CD básico, entorno local. | Todas | Baja | P0 |

**Resultado de Capa 0:** Un sistema que arranca, recibe un mensaje por un canal genérico (stub), lo pasa a un orquestador (stub), lo persiste en PostgreSQL con aislamiento multi-tenant, y emite eventos. Los contratos están definidos, las implementaciones son stubs. Cada desarrollador puede tomar una solución y trabajar contra los contratos.

---

### Soluciones Independientes

#### S1 — Adaptador WhatsApp

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S1.1 | Recepción de mensajes vía webhook | Meta envía mensaje → FastAPI recibe → valida firma → normaliza al contrato genérico de canal → emite evento mensaje_recibido → persiste. | C0.2, C0.5 | Alta | P0 |
| S1.2 | Envío de respuestas al cliente | Respuesta del agente → adaptador la convierte al formato WhatsApp → envía vía Meta API → confirma entrega → persiste estado. | C0.2 | Alta | P0 |
| S1.3 | Gestión de plantillas y ventanas 24h | Manejo de la ventana de 24h de WhatsApp, envío de plantillas aprobadas cuando la ventana expira, gestión de estados de conversación según políticas de Meta. | S1.1, S1.2 | Media | P0 |

**Flujo E2E demostrable:** Un mensaje llega por WhatsApp, el sistema lo recibe, lo persiste, y puede enviar una respuesta de vuelta.

---

#### S2 — Agente de Consultas (base)

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S2.1 | Respuesta a consultas con base de conocimiento | Mensaje entrante → agente consulta base de conocimiento local → genera respuesta contextualizada → emite evento respuesta_generada. | C0.3, C0.5 | Alta | P0 |
| S2.2 | Base de conocimiento modo integrado | Carga manual de archivos (PDF, Excel, TXT) + formulario estructurado (servicios, precios, horarios, FAQs). Indexación para consulta rápida. | C0.1 | Media | P0 |
| S2.3 | Orquestador de agentes + router de intenciones | Analiza intención del mensaje → rutea al agente especializado correspondiente → gestiona transferencia inter-agente con contexto compartido. | C0.3 | Muy Alta | P0 |
| S2.4 | Prompt versioning + eval pipeline (DA8) | Versionado de prompts por PYME. Pipeline de evaluación con casos de prueba para testear calidad de respuestas antes de desplegar cambios. | S2.1 | Media | P1 |

**Flujo E2E demostrable (S1 + S2):** Cliente escribe por WhatsApp → agente responde con información del negocio → conversación almacenada con historial.

---

#### S3 — Agente de Agendamiento

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S3.1 | Consulta de disponibilidad en Google Calendar | Agente conecta con Calendar vía OAuth → consulta slots disponibles según configuración de la PYME → presenta opciones al cliente. | C0.4, Google Calendar API | Alta | P0 |
| S3.2 | Creación de cita + confirmación | Cliente elige slot → agente crea evento en Calendar → confirma al cliente → emite evento cita_creada → notifica al humano de la PYME. | S3.1, C0.5 | Alta | P0 |
| S3.3 | Transferencia desde otro agente | El cliente empieza preguntando precios (S2) y luego quiere agendar → el orquestador transfiere contexto al agente de agendamiento sin perder el hilo. | S2.3 (orquestador) | Media | P0 |

**Flujo E2E demostrable (S1 + S2 + S3):** Cliente pide cita por WhatsApp → agente muestra disponibilidad → cliente elige → cita creada en Calendar → confirmación enviada.

---

#### S4 — Agente de Cotización

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S4.1 | Motor de cotización calculada (D7) | Reglas de cálculo configurables por PYME: precios unitarios, descuentos por volumen, IVA, combinaciones de servicios. Genera desglose con totales. | C0.1 (reglas por tenant) | Alta | P1 |
| S4.2 | Cotización conversacional | Cliente pide cotización → agente identifica items → aplica reglas → genera desglose → envía por WhatsApp → emite evento cotización_generada. | S4.1, S2.3 (orquestador) | Alta | P1 |
| S4.3 | Detección de intención de compra + notificación | Agente detecta que el cliente quiere comprar → emite evento → notifica al humano de la PYME con resumen estructurado (items, totales, datos del cliente). | S4.2, C0.5 | Media | P1 |

**Flujo E2E demostrable (S1 + S2 + S4):** Cliente pide cotización por WhatsApp → agente calcula con reglas del negocio → envía desglose → detecta intención de compra → notifica al humano.

---

#### S5 — Módulo de Handoff

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S5.1 | Detección de escalamiento | Agente detecta que no puede resolver (queja, consulta compleja, petición explícita) → cambia estado de sesión a "escalada" → emite evento escalamiento_detectado → informa al cliente. | C0.3, C0.5 | Media | P0 |
| S5.2 | Notificación al humano + vista web mínima | Humano recibe notificación con link → abre vista web → ve historial completo de la conversación con el agente → puede responder al cliente por el mismo canal (WhatsApp). | S5.1, C0.6 | Alta | P0 |
| S5.3 | Gestión de estado de sesión | Estados: agente-activo → escalada → humano-activo → cerrada. Cuando el humano está activo, los mensajes del cliente van directo al humano, no al agente. Cierre por inactividad (timeout configurable), despedida explícita, o cierre manual (RN9). | S5.2, C0.1 | Media | P0 |

**Flujo E2E demostrable (S1 + S2 + S5):** Agente no puede resolver → escala → humano recibe link → abre vista web → responde al cliente por WhatsApp → conversación continúa sin ruptura.

---

#### S6 — Sincronización de Conocimiento

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S6.1 | Adaptador Google Drive | Conexión OAuth → ingesta de documentos desde carpeta configurada → detección de cambios (polling) → re-ingesta automática → emite evento conocimiento_actualizado. | C0.4, Google Drive API | Media | P1 |
| S6.2 | Adaptador Notion | Conexión OAuth → ingesta de páginas/bases de datos → detección de cambios → re-ingesta automática. | C0.4, Notion API | Media | P2 |
| S6.3 | Adaptador Confluence | Conexión Atlassian Auth → ingesta de páginas/espacios → detección de cambios → re-ingesta automática. | C0.4, Confluence API | Media | P2 |
| S6.4 | Base de conocimiento modo conectado | Gestión de fuentes externas por tenant: qué fuentes están conectadas, estado de sincronización, última actualización, errores. Coexiste con modo integrado (S2.2). | S6.1/S6.2/S6.3, C0.1 | Media | P1 |

**Flujo E2E demostrable (S1 + S2 + S6):** PYME actualiza precio en Google Sheet → sistema detecta cambio → reingesta → agente responde con precio nuevo sin intervención del consultor.

**Nota:** Google Drive (S6.1) es prioridad de desarrollo. Notion (S6.2) y Confluence (S6.3) son parte de la visión del producto pero no son prioridad para el MVP — se integrarán posteriormente.

---

#### S7 — Panel del Consultor + Dashboard

| # | Capacidad E2E | Descripción | Dependencias | Complejidad | Prioridad |
|---|--------------|-------------|--------------|-------------|-----------|
| S7.1 | Panel multi-PYME | Vista de todas las PYMES administradas. Configuración de agentes activos, guardrails, reglas de cotización por PYME. Gestión de integraciones conectadas. | C0.6, C0.1 | Alta | P2 |
| S7.2 | Dashboard de métricas | Volumen de conversaciones, % resolución por IA, tiempos de respuesta, tasa de escalamiento, métricas por canal y por período. | C0.1 (datos de conversaciones) | Media | P2 |
| S7.3 | Roles y autenticación | Consultor, admin-pyme, operador-pyme. Cada rol ve y puede hacer cosas distintas. Sin granularidad compleja. | C0.6, C0.1 | Media | P2 |

**Flujo E2E demostrable (S7):** Consultor se loguea → ve sus PYMES → configura un agente → revisa métricas del último mes → ajusta guardrails.

---

### Flujo de Servicio

| # | Flujo | Descripción | Soluciones involucradas | Prioridad |
|---|-------|-------------|------------------------|-----------|
| F7 | **Onboarding de nueva PYME** | Discovery → carga de conocimiento (S2.2 o S6) → configuración de agentes y reglas (S2.3, S4.1) → conexión WhatsApp (S1) → conexión integraciones (S3.1, S6) → capacitación en handoff (S5) → testing → go-live → monitoreo → PYME operando con mantenimiento self-service vía sus herramientas. | S1 + S2 + al menos S3 o S5 | P0 |

---

### Mapa de Combinaciones: Soluciones → Flujos E2E

| Flujo E2E | Soluciones requeridas | Valor demostrable |
|-----------|----------------------|-------------------|
| Conversación básica | Capa 0 + S1 + S2 | "Le escribo por WhatsApp y me responde con info del negocio" |
| Agendamiento completo | Capa 0 + S1 + S2 + S3 | "Pido cita por WhatsApp y queda agendada en Calendar" |
| Cotización calculada | Capa 0 + S1 + S2 + S4 | "Pido cotización y me da desglose con totales" |
| Escalamiento a humano | Capa 0 + S1 + S2 + S5 | "El agente no puede resolver, un humano me responde por WhatsApp" |
| Conocimiento vivo | Capa 0 + S1 + S2 + S6 | "La PYME actualiza precios y el agente responde con lo nuevo" |
| Gestión operativa | Capa 0 + S7 | "El consultor ve y configura todas sus PYMES desde un panel" |
| Onboarding PYME | Capa 0 + S1 + S2 + (S3 o S5) | "Nueva PYME operando en días" |
