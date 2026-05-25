---
taxonomy: solution
key: escalamiento-humano
solution: Sistema de Escalamiento a Humano
initiative: ../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Oscar Gomez
created: 2026-05-20
updated: 2026-05-20
version: "1.0.0"
status: drafting
language: es
changelog:
  - date: 2026-05-20
    author: Oscar Gomez
    change: "Creación inicial — Diseño completo de la solución con narrativa, contexto técnico y acceptance criteria."
---

# Sistema de Escalamiento a Humano

## 1. Overview

El Sistema de Escalamiento a Humano es la **red de seguridad** de la plataforma. Cuando un agente (RAG, Cotizador o Agendamiento) detecta que no puede resolver una situación — ya sea por falta de información, complejidad del caso o solicitud explícita del usuario — transfiere el control de la conversación a un operador humano de la empresa.

Esta solución abarca:
- La lógica de **detección** de cuándo escalar
- El mecanismo de **transferencia** del control conversacional
- El **inbox** donde el humano gestiona las conversaciones escaladas
- La **respuesta** del humano desde la plataforma
- La **devolución** del control al agente cuando el humano termina

**Relación con otras soluciones:**
- Depende de **[5] Conector de WhatsApp** para enviar/recibir mensajes del humano
- Depende de **[7] Memoria Conversacional** para entregar contexto al humano
- Depende de **[10] Sistema de Notificaciones** para alertar a la empresa del escalamiento
- Es consumida por **[2] Motor RAG**, **[3] Cotizador** y **[4] Agendamiento** como mecanismo de fallback

---

## 2. Solution Narrative

### 2.1 Detección y Disparo del Escalamiento

- **Trigger:** El agente determina que no puede resolver la situación actual del usuario, o el usuario solicita explícitamente hablar con un humano.

- **Comportamiento:** El sistema evalúa condiciones de escalamiento en dos categorías:
  1. **Escalamiento explícito:** El usuario final escribe algo que indica que quiere hablar con una persona (ej: "quiero hablar con alguien", "pásame con un humano"). El agente reconoce la intención y dispara el escalamiento.
  2. **Escalamiento por incapacidad:** El agente detecta que no tiene información suficiente para responder, que la conversación está en un loop sin resolución, o que el tema está fuera de sus restricciones configuradas. El agente decide escalar.

  En ambos casos, el agente marca la conversación como "escalada", envía un mensaje al usuario indicando que será atendido por una persona, y deja de responder automáticamente.

- **Resultado:** La conversación queda en estado `escalated`. El agente deja de procesar mensajes entrantes de esa conversación. Se dispara la notificación a la empresa.

- **Error path:** Si el sistema de notificaciones no está disponible, la conversación se marca como escalada de todas formas y queda visible en el inbox. El agente informa al usuario que será atendido pronto. Si no hay operadores configurados, la conversación queda en cola en el inbox sin asignación.

- **Decisiones de diseño:** La detección de escalamiento es responsabilidad del agente (vía prompting), no de un sistema de reglas externo. Esto permite que cada tipo de agente tenga criterios de escalamiento adaptados a su dominio sin necesidad de configuración adicional. El usuario final siempre puede forzar el escalamiento con lenguaje natural.

- **Integraciones:** Consume [10] Sistema de Notificaciones para alertar a la empresa. Consume [7] Memoria Conversacional para preservar el contexto.

---

### 2.2 Inbox y Gestión de Conversaciones Escaladas

- **Trigger:** Una conversación es marcada como `escalated` y aparece en el inbox del panel de administración.

- **Comportamiento:** El inbox muestra todas las conversaciones escaladas de la empresa, ordenadas por tiempo de espera. Cada conversación muestra:
  - Identificador del usuario final (nombre/número de WhatsApp)
  - Agente que escaló y motivo resumido
  - Historial completo de la conversación (contexto previo con el agente)
  - Tiempo en espera

  El inbox se actualiza en tiempo real vía **WebSocket** cuando llega una nueva conversación escalada o un nuevo mensaje del usuario en una conversación ya escalada.

  El operador humano selecciona una conversación y comienza a responder. Los mensajes del operador se envían al usuario final por el mismo canal de WhatsApp a través del cual estaba interactuando con el agente. El operador puede ver todo el historial para no pedir al usuario que repita información.

- **Resultado:** El operador tiene visibilidad completa del contexto y puede responder directamente desde la plataforma.

- **Error path:** Si el historial de la conversación no está disponible (fallo en memoria conversacional), el inbox muestra la conversación sin historial previo y el operador debe pedir contexto al usuario. La conversación sigue siendo gestionable.

---

### 2.3 Respuesta del Humano al Usuario Final

- **Trigger:** El operador escribe un mensaje en el inbox dirigido al usuario final.

- **Comportamiento:** El mensaje del operador se envía al usuario final a través del Conector de WhatsApp, usando el mismo número/canal del agente original. Desde la perspectiva del usuario final, la conversación continúa en el mismo hilo — no hay cambio de número ni de chat. El operador puede enviar texto, imágenes y archivos según lo soporte el canal.

- **Resultado:** El usuario final recibe el mensaje del operador en su chat de WhatsApp habitual. La conversación queda registrada en el historial.

- **Error path:** Si el envío del mensaje falla (canal no disponible, número desconectado), el inbox muestra el error al operador con opción de reintentar. El mensaje no se pierde — queda en estado `pending` hasta que se resuelva.

- **Integraciones:** Consume [5] Conector de WhatsApp para el envío de mensajes salientes.

---

### 2.4 Devolución del Control al Agente

- **Trigger:** El operador humano determina que la situación está resuelta y cierra la conversación escalada desde el inbox.

- **Comportamiento:** El operador marca la conversación como "resuelta" en el inbox. El sistema cambia el estado de la conversación de `escalated` a `active`. A partir de ese momento, los nuevos mensajes del usuario final vuelven a ser procesados por el agente original. El agente no tiene contexto de lo que el humano conversó (no se inyecta el historial humano en el prompt del agente), pero la memoria conversacional sí registra que hubo un escalamiento.

  Si la conversación escalada no tiene actividad por un tiempo configurable por empresa (timeout de auto-devolución), el sistema auto-devuelve el control al agente automáticamente.

- **Resultado:** La conversación vuelve al flujo automático. El usuario final puede seguir interactuando con el agente normalmente.

- **Error path:** Si el agente original no está disponible (desactivado, desconectado), la conversación queda en estado `unassigned` y se notifica a la empresa.

- **Decisiones de diseño:** El agente no recibe el historial de la conversación humana para evitar contaminación del contexto y mantener la simplicidad. El timeout de auto-devolución es configurable por empresa desde el panel de administración para adaptarse a distintos niveles de servicio.

---

## 3. Out of Scope

- Respuesta del humano desde WhatsApp directamente (solo desde el inbox de la plataforma)
- Asignación de conversaciones a operadores específicos (no hay roles ni asignación)
- Cola de prioridad o SLA de respuesta
- Chatbot de triaje antes del escalamiento
- Métricas de tiempo de resolución del humano (corresponde a Solución 12)
- Transferencia entre operadores humanos
- Respuestas predefinidas / templates para el operador
- Escalamiento entre agentes (orquestación inter-agente fuera de alcance de la iniciativa)

---

## 4. Technical Context

### Patrones de arquitectura

- El estado de la conversación (`active`, `escalated`, `unassigned`) es el mecanismo central de control de flujo. El Conector de WhatsApp consulta este estado para decidir si enruta al agente o al inbox.
- El inbox es una vista del Panel de Administración (Solución 1) que consume datos de conversaciones escaladas. No es un sistema independiente.
- **WebSocket** para notificación en tiempo real al inbox cuando llegan nuevas conversaciones escaladas o mensajes de usuarios en conversaciones escaladas.

### Modelo de datos conceptual

- **Conversation** — tiene un `status` (active, escalated, unassigned, resolved), un `agent_id`, un `company_id`, un `escalated_at` timestamp, y un `escalation_timeout` (heredado de la configuración de la empresa).
- **EscalationEvent** — registra cada escalamiento: motivo, timestamp, quién resolvió, duración.
- **InboxMessage** — mensajes enviados por el operador humano, vinculados a la conversación.
- **CompanySettings** — incluye `escalation_timeout_minutes` configurable por empresa.

### Integraciones

| Dirección | Solución | Interfaz esperada |
|-----------|----------|-------------------|
| Consume → | [5] Conector de WhatsApp | Envío de mensajes salientes del operador al usuario final |
| Consume → | [7] Memoria Conversacional | Obtener historial completo de una conversación dado su ID |
| Consume → | [10] Sistema de Notificaciones | Disparar notificación con payload: `{company_id, conversation_id, reason, channel}` |
| Consumida por ← | [2] Motor RAG, [3] Cotizador, [4] Agendamiento | Los agentes invocan escalamiento cuando detectan que no pueden resolver |

### Decisiones técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Detección de escalamiento | Vía prompting del agente | Flexible, adaptable por tipo de agente, sin reglas hardcodeadas |
| Notificación en tiempo real | WebSocket | Experiencia de inbox responsiva para el operador |
| Timeout de auto-devolución | Configurable por empresa | Cada empresa tiene distintos niveles de servicio y tiempos de respuesta |
| Historial humano al agente | No se inyecta | Evita contaminación del contexto del agente, mantiene simplicidad |

---

## 5. Acceptance Criteria

### Detección y Escalamiento

- [ ] El sistema escala la conversación cuando el usuario solicita explícitamente hablar con un humano en lenguaje natural
- [ ] El sistema escala la conversación cuando el agente detecta que no puede resolver la situación
- [ ] Al escalar, el agente envía un mensaje al usuario indicando que será atendido por una persona
- [ ] Al escalar, el agente deja de procesar mensajes entrantes de esa conversación
- [ ] La conversación queda en estado `escalated` y es visible en el inbox

### Inbox

- [ ] El inbox muestra todas las conversaciones escaladas de la empresa ordenadas por tiempo de espera
- [ ] Cada conversación escalada muestra: identificador del usuario, agente que escaló, motivo resumido, historial completo y tiempo en espera
- [ ] El inbox se actualiza en tiempo real vía WebSocket cuando llega una nueva conversación escalada o un nuevo mensaje del usuario
- [ ] El operador puede ver el historial completo de la conversación previa con el agente

### Respuesta del Operador

- [ ] El operador puede enviar mensajes de texto, imágenes y archivos al usuario final desde el inbox
- [ ] Los mensajes del operador se envían por el mismo canal/número de WhatsApp del agente original
- [ ] Si el envío falla, el inbox muestra el error con opción de reintentar
- [ ] Los mensajes del operador quedan registrados en el historial de la conversación

### Devolución del Control

- [ ] El operador puede marcar la conversación como resuelta desde el inbox
- [ ] Al resolver, los nuevos mensajes del usuario vuelven a ser procesados por el agente original
- [ ] Si la conversación escalada no tiene actividad por un tiempo configurable por empresa, el sistema auto-devuelve el control al agente
- [ ] El timeout de auto-devolución es configurable por empresa desde el panel de administración

### Notificaciones

- [ ] Al producirse un escalamiento, se dispara una notificación a la empresa vía el Sistema de Notificaciones [10]
- [ ] Si el Sistema de Notificaciones no está disponible, el escalamiento funciona igualmente (la conversación aparece en el inbox)

### Criterios Generales

- [ ] El sistema funciona correctamente con los tres tipos de agente (RAG, Cotizador, Agendamiento)
- [ ] Si el agente original está desactivado al momento de devolver el control, la conversación queda en estado `unassigned` y se notifica a la empresa
- [ ] El historial de la conversación humana no se inyecta en el contexto del agente al devolver el control

---

## 6. Risks & Assumptions

| Tipo | Descripción | Mitigación |
|------|-------------|------------|
| Supuesto | Los agentes pueden detectar confiablemente cuándo escalar vía prompting | Validar con pruebas de conversación. Si la detección es pobre, agregar heurísticas (ej: N mensajes sin resolución) |
| Supuesto | El operador humano responde en un tiempo razonable | Timeout configurable por empresa + mensaje al usuario de "te atenderemos pronto" |
| Supuesto | La interfaz de [10] Notificaciones ya existe cuando se implemente esta solución | Si no, el escalamiento funciona sin notificación push — solo inbox |
| Riesgo | El usuario envía mensajes mientras está escalado y nadie responde | El inbox muestra mensajes nuevos en tiempo real vía WebSocket. Timeout auto-devuelve al agente |
| Riesgo | El agente escala demasiado (falsos positivos) | Ajuste de prompting + posible configuración de "sensibilidad de escalamiento" por empresa |
| Interfaz asumida con [10] | Se espera un endpoint/evento que dispare notificación con payload: `{company_id, conversation_id, reason, channel}` | Validar cuando se diseñe Solución 10 |
| Interfaz asumida con [7] | Se espera poder obtener historial completo de una conversación dado su ID | Validar cuando se diseñe Solución 7 |
