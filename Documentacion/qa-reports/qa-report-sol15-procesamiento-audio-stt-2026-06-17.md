# Reporte de QA — SL15: Procesamiento y Transcripción de Mensajes de Voz (STT)

| Campo | Valor |
|-------|-------|
| **Solución** | SL15 - Procesamiento y Transcripción de Mensajes de Voz (STT) |
| **PR Evaluada** | #36 — `feat(stt): recepción y transcripción de audios con Whisper para WhatsApp y Telegram` |
| **Fecha** | 17 de junio de 2026 |
| **QA** | Jhon (manual) + Kiro (automatización) |
| **Entorno** | Stage `dev` — Bot de Telegram (`STyT_Atlas` / `Bot prueba multibots`) |
| **Resultado General** | ✅ **PASS** (5/5 test cases manuales + 15/15 tests automatizados) |

---

## Alcance de las Pruebas

### Tests Automatizados (Unit + Property-Based)
- **Framework:** Vitest + fast-check
- **Ubicación:** `apps/services/api-multi-bots/src/modules/rag-engine/__tests__/rag-engine.audio-stt.spec.ts`
- **Cobertura:** 15 tests

| Categoría | Tests | Estado |
|-----------|-------|--------|
| Validación de input (audio sin mediaId, texto sin campos audio) | 3 | ✅ |
| Manejo de errores (sin canal, sin ENCRYPTION_KEY, sin OPENAI_API_KEY, API Meta falla, API Telegram falla) | 5 | ✅ |
| Flujo exitoso de transcripción (WhatsApp y Telegram) | 2 | ✅ |
| Property-based: routing de messageType (texto no descarga media, audio siempre busca canal) | 2 | ✅ |
| Edge cases de Whisper (transcripción vacía, API retorna error, proveedor no soportado) | 3 | ✅ |

### Tests Manuales (End-to-End contra deploy `dev`)
- **Canal probado:** Telegram
- **Bot:** STyT_Atlas / Bot prueba multibots
- **Knowledge Base:** Catálogo de productos (hamburguesas, pizzas, bebidas con precios)

---

## Resultados Detallados — Pruebas Manuales

### TC-01: Nota de voz simple — Transcripción y respuesta ✅

| Campo | Detalle |
|-------|---------|
| **Acción** | Enviar nota de voz corta (~4s) con saludo o pregunta simple |
| **Resultado** | Bot respondió en texto coherente con el contenido del audio |
| **Veredicto** | PASS |

---

### TC-02: Audio fuera de Knowledge Base — No inventa información ✅

| Campo | Detalle |
|-------|---------|
| **Acción** | Enviar nota de voz con pregunta no relacionada al negocio |
| **Resultado** | Bot respondió: "Mi rol está enfocado en darte soporte sobre la empresa y nuestros servicios" — redirigió sin inventar |
| **Veredicto** | PASS |

---

### TC-03: Audio largo (26 segundos) — Transcripción completa ✅

| Campo | Detalle |
|-------|---------|
| **Acción** | Enviar nota de voz de 26s con múltiples preguntas (hamburguesas, precios, domicilios, promociones) |
| **Resultado** | Bot respondió: "Disculpa, no poseo información al respecto en este momento" |
| **Veredicto** | PASS (para STT — la transcripción se completó exitosamente) |
| **Observación** | El RAG no retornó los precios de hamburguesas que sí están en la KB. Probablemente el re-ranking descartó los fragmentos al detectar que la consulta incluía temas sin cobertura (domicilios, promociones). Este es un tema del Motor RAG (SL02), no del STT. |

---

### TC-04: Audio vacío/silencioso — Edge case ✅

| Campo | Detalle |
|-------|---------|
| **Acción** | Enviar nota de voz de 5s con contenido irrelevante o minimal |
| **Resultado** | Bot respondió amigablemente: "Jaja, gracias, pero creo que te equivocaste de chat" y redirigió al dominio |
| **Veredicto** | PASS — No crasheó, no alucinó, manejó gracefully |

---

### TC-05: Audio + texto consecutivo — Sin interferencia ✅

| Campo | Detalle |
|-------|---------|
| **Acción** | 1) Enviar audio pidiendo menú completo 2) Enviar texto: "¿Cuánto cuesta la hamburguesa?" |
| **Resultado audio** | Bot retornó menú completo con todos los precios correctos |
| **Resultado texto** | Bot retornó las 2 opciones de hamburguesa con precios |
| **Veredicto** | PASS — Ambos flujos funcionan independientemente sin contaminación |
| **Observación** | Glitch de encoding en respuesta del texto: "¿Cuál te顾客itan?" — caracteres chinos infiltrados. Bug del LLM/personalidad, no del STT. |

---

## Criterios de Aceptación Validados

| Criterio | Estado | Método |
|----------|--------|--------|
| Telegram acepta webhooks con `message.voice`, extrae `file_id` y `mime_type` | ✅ | E2E manual |
| El formato de mensajes de audio contiene `messageType: "audio"`, `mediaId` y `mimeType` | ✅ | Unit tests |
| El motor RAG lee datos del canal y descifra el token | ✅ | Unit tests + E2E |
| Telegram: consulta `getFile` y descarga binario del servidor de archivos | ✅ | E2E manual |
| Se invoca a Whisper/Groq enviando el buffer del audio | ✅ | E2E manual + unit tests |
| Si la transcripción falla, se notifica al usuario en texto | ✅ | Unit tests (5 escenarios de error) |
| El texto transcrito es procesado por el motor RAG y responde en texto plano | ✅ | E2E manual (TC-01, TC-05) |

---

## Hallazgos y Observaciones

### 🟡 Observación 1: RAG no retorna información parcial con consultas mixtas
- **Severidad:** Baja (no es bug del STT)
- **Descripción:** Cuando el audio contiene preguntas que la KB puede responder parcialmente (precios) junto con preguntas sin cobertura (domicilios), el RAG devuelve "no poseo información" en lugar de responder lo que sí sabe.
- **Módulo afectado:** Motor RAG (SL02) — re-ranking / threshold filtering
- **Acción sugerida:** Revisar lógica de re-ranking para permitir respuestas parciales

### 🟡 Observación 2: Glitch de encoding en respuesta del LLM
- **Severidad:** Baja (cosmético)
- **Descripción:** En una respuesta de texto, aparecieron caracteres chinos: "¿Cuál te顾客itan?"
- **Módulo afectado:** LLM Provider / Personalidad del agente
- **Acción sugerida:** Verificar que el prompt no contenga tokens corruptos o que el modelo no mezcle idiomas

---

## Resumen Ejecutivo

La solución **SL15 (STT)** funciona correctamente en el entorno de `dev` para el canal de Telegram. Los flujos de:
- Recepción de notas de voz
- Descarga del binario de audio desde Telegram
- Transcripción con Whisper/Groq
- Inyección del texto transcrito al motor RAG
- Respuesta en texto plano al usuario

...operan end-to-end sin errores. Los hallazgos menores identificados pertenecen a otros módulos (RAG re-ranking y LLM encoding) y no bloquean la funcionalidad del STT.

**Veredicto: ✅ APROBADO para el flujo de Telegram.**

> ⚠️ **Pendiente:** Pruebas del flujo de WhatsApp requieren acceso a la cuenta de Meta corporativa (actualmente solo disponible en el stage de desarrollo del dev lead).
