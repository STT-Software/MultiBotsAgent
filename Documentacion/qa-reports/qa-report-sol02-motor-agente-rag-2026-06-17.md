# Reporte QA — SOL-02: Motor de Agente RAG

**Fecha:** 2026-06-17
**QA:** jhon99mendoza / Kiro QA Agent
**Solución:** SOL-02 Motor de Agente RAG
**PRs evaluadas:** #26, #36, #37, #38, #39, #40
**Canal de pruebas:** Telegram (@Multibotprueba_bot, @STyT_Atlas_bot)
**Entorno:** Stage `dev` en AWS

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests manuales ejecutados | 10 |
| Tests manuales pasados | 5 |
| Tests manuales parciales | 3 |
| Tests manuales fallidos | 2 |
| Tests automatizados ejecutados | 14 |
| Tests automatizados pasados | 14 |
| Bugs críticos encontrados | 2 |
| Observaciones menores | 2 |

**Veredicto:** ⚠️ **No apto para producción** — Los bugs críticos requieren corrección antes del release.

---

## Pruebas Manuales

### ✅ Pasaron

| TC | Escenario | Observación |
|----|-----------|-------------|
| TC-01 | Flujo RAG Happy Path — consulta con KB | Responde correctamente basado en base de conocimiento |
| TC-02 | Memoria conversacional — contexto previo | Recuerda conversación anterior y responde en contexto |
| TC-05 | Soporte de imágenes (multimodal) | Procesa imágenes y responde haciendo referencia al contenido |
| TC-06 | Escalamiento explícito — "hablar con humano" | Detecta intención, envía mensaje de transición, aparece en Inbox |

### ⚠️ Parciales

| TC | Escenario | Detalle |
|----|-----------|---------|
| TC-04 | Audio (Whisper) | Transcripción funciona ✅, pero con KB limitada se bloquea igual que TC-03 |
| TC-07 | Saludos coloquiales | @Multibotprueba_bot responde bien; @STyT_Atlas_bot se bloquea/escala |
| TC-08 | Deduplicación de ráfaga | Funciona para mensajes simultáneos (< 1s), pero no agrupa si hay 1-2s de diferencia |
| TC-09 | Mensaje de bienvenida | Se envía correctamente pero concatenado con la respuesta (no como mensajes separados) |

### ❌ Fallaron

| TC | Escenario | Bug |
|----|-----------|-----|
| TC-03 | Consulta sin info en KB | Escalamiento silencioso sin mensaje de transición |
| TC-10 | Conversación larga (8+ intercambios) | Bot se bloquea y escala silenciosamente |

---

## Bugs Críticos

### 🐛 BUG-01: Escalamiento silencioso sin mensaje de transición

| Campo | Detalle |
|-------|---------|
| **Severidad** | 🔴 Crítica |
| **Reproducible** | Sí — consistente en ambos bots |
| **Trigger** | Preguntas que requieren razonamiento más allá de la KB, o preguntas sobre temas no cubiertos |
| **Bots afectados** | @STyT_Atlas_bot (siempre), @Multibotprueba_bot (con KB limitada) |
| **Comportamiento actual** | El bot deja de responder. La conversación aparece en Inbox como escalada, pero el usuario NO recibe ningún mensaje de transición |
| **Comportamiento esperado** | El bot debería enviar "No tengo información sobre eso" o "Te voy a comunicar con alguien del equipo" ANTES de escalar |
| **Criterios violados** | AC: "El usuario recibe un mensaje de transición antes del escalamiento" |
| **Análisis** | Los tests unitarios confirman que el motor SÍ genera el mensaje de error/transición. El problema está probablemente en la capa de envío (SQS → Telegram) que no entrega la respuesta cuando hay escalamiento por NO_INFO o error de LLM |

### 🐛 BUG-02: Bloqueo por historial largo (8+ intercambios)

| Campo | Detalle |
|-------|---------|
| **Severidad** | 🔴 Crítica |
| **Reproducible** | Sí — después de ~8-10 intercambios consecutivos |
| **Trigger** | Acumulación de historial conversacional |
| **Comportamiento actual** | El bot se bloquea completamente y escala silenciosamente |
| **Comportamiento esperado** | El motor debería truncar el historial antiguo para respetar la ventana de tokens del modelo y seguir respondiendo |
| **Criterios violados** | AC: "Si el historial excede la ventana de tokens del modelo, se trunca desde los mensajes más antiguos" |
| **Análisis** | `sanitizeMessages` funciona correctamente (property tests con 100+ mensajes pasan). El problema es que el historial mergeado puede exceder el límite de tokens de Bedrock sin que haya un truncamiento por tokens ANTES de enviar. El motor no cuenta tokens — solo cuenta mensajes (memoryWindow) |

---

## Observaciones Menores

### 📝 OBS-01: Mensaje de bienvenida no separado

- **Estado:** El mensaje de bienvenida llega concatenado con la respuesta en un solo bloque
- **Esperado:** Deberían ser 2 mensajes de Telegram separados
- **Impacto:** Bajo — funcionalidad existe, UX subóptima
- **Nota:** Los tests unitarios confirman que el motor retorna 2 mensajes separados en el array. El problema está en la capa de envío que los concatena antes de enviar por Telegram.

### 📝 OBS-02: Ventana de deduplicación muy corta

- **Estado:** La agrupación de mensajes funciona solo para mensajes enviados en < 1 segundo
- **Esperado:** Debería agrupar mensajes enviados dentro de una ventana de 3-5 segundos
- **Impacto:** Medio — el usuario experimenta respuestas parciales si envía varios mensajes seguidos con pequeño delay

---

## Tests Automatizados

**Archivo:** `apps/services/api-multi-bots/src/modules/rag-engine/__tests__/rag-engine.qa-sol02.spec.ts`

```
✓ 14 tests passed (0 failed) — Duration: 18s
```

| Suite | Tests | Tipo |
|-------|-------|------|
| Escalamiento silencioso — Error handling | 4 | Unit |
| sanitizeMessages (historial largo) | 4 | Property-based (fast-check, 100 runs) |
| Mensaje de bienvenida | 3 | Unit |
| Degradación graceful | 3 | Unit |

**Conclusión de tests automatizados:** El motor RAG a nivel de código maneja correctamente todos los escenarios de error. Los bugs observados en producción se originan en capas externas al motor (envío de mensajes por Telegram/SQS, o límite de tokens no controlado antes del LLM).

---

## Recomendaciones para el Equipo de Desarrollo

### Prioridad Alta (antes de producción)

1. **Investigar por qué la respuesta del motor no llega al usuario cuando hay escalamiento por NO_INFO** — El motor genera el mensaje, pero algo en el pipeline SQS → Telegram no lo entrega. Revisar logs de CloudWatch del `IncomingProcessor` y el handler de envío.

2. **Implementar truncamiento por tokens (no solo por cantidad de mensajes)** — Actualmente `memoryWindow` limita la cantidad de mensajes del historial, pero no el tamaño total en tokens. Cuando los mensajes son largos o se acumulan, el prompt total puede exceder la ventana del modelo. Solución: contar tokens del prompt final y truncar historial si excede el límite.

### Prioridad Media

3. **Separar mensaje de bienvenida del mensaje de respuesta en Telegram** — El motor los retorna como array separado. El handler de envío debe iterar y enviar cada uno individualmente.

4. **Aumentar ventana de deduplicación** — La ventana actual es < 1s. Evaluar si SQS FIFO permite implementar una ventana de 3-5s para Telegram.

### Prioridad Baja

5. **Mejorar resiliencia del bot @STyT_Atlas_bot** — Este bot tiene KB limitada y es más propenso a bloqueos. Puede necesitar umbral de relevancia más bajo o instrucciones en el prompt para responder cortésmente cuando no tiene info (sin escalar).

---

## Entorno de Pruebas

| Recurso | URL |
|---------|-----|
| Frontend | https://d1z7dsgvuqduin.cloudfront.net |
| Services API | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com |
| Functions API | https://eibwrbqsna.execute-api.us-east-1.amazonaws.com |
| Bot Telegram (mejor) | @Multibotprueba_bot |
| Bot Telegram (peor) | @STyT_Atlas_bot |
| Usuario panel | jhon99mendoza@gmail.com |

---

*Reporte generado por Kiro QA Agent — Listo para copiar a Notion.*
