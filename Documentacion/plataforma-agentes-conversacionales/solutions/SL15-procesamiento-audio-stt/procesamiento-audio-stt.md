---
taxonomy: solution
key: procesamiento-audio-stt
solution: Procesamiento y Transcripción de Mensajes de Voz (STT)
initiative: ../plataforma-agentes-conversacionales-iniciativa.md
product: Plataforma de Agentes Conversacionales
author: Antigravity (IA)
created: 2026-06-11
updated: 2026-06-11
version: "1.0.0"
status: drafting
language: es
  - date: 2026-06-11
    author: Antigravity (IA)
    change: "Creación inicial — Diseño técnico de procesamiento y transcripción de notas de voz para WhatsApp y Telegram."
  - date: 2026-06-11
    author: Antigravity (IA)
    change: "Soporte híbrido/transparente para Groq como alternativa de transcripción sin costo."
---

# Procesamiento y Transcripción de Mensajes de Voz (STT)

## 1. Overview

La solución de **Procesamiento y Transcripción de Mensajes de Voz (STT)** permite a la plataforma recibir notas de voz enviadas por los usuarios finales en los canales conversacionales soportados (WhatsApp y Telegram), transcribirlas de manera asíncrona a texto plano, y enviarlas al motor RAG de los agentes correspondientes. 

Esto permite que cualquier agente de la plataforma (sea RAG, Cotizador o Agendamiento) procese mensajes de voz del cliente final, manteniendo la respuesta del agente siempre en formato de texto plano (sin generación de voz artificial / TTS), acotando así la latencia, costos y la complejidad operativa.

**Relación con otras soluciones:**
- Depende de **[5] Conector de WhatsApp** y de la API del canal para recibir los webhooks de audio/voz y obtener metadatos de archivos multimedia.
- Se integra en la ruta interna de procesamiento de **[2] Motor RAG**, **[3] Cotizador** y **[4] Agendamiento**, actuando como una capa de pre-procesamiento transparente que convierte el audio a texto.
- Utiliza la infraestructura de colas de **[5] Conector de WhatsApp** y las de Telegram para asegurar un procesamiento asíncrono que evite timeouts en los webhooks.

---

## 2. Solution Narrative

### 2.1 Captura de Webhooks de Audio (WhatsApp & Telegram)

- **Trigger:** Un usuario final envía un mensaje de voz en WhatsApp o Telegram.
  
- **Comportamiento:** 
  1. **WhatsApp (AWS Lambda `receive-webhook`):** La Lambda intercepta el evento. Si el tipo de mensaje es `audio`, extrae el `id` multimedia de Meta (`mediaId`) y el `mime_type`. Encola de inmediato el evento `IncomingMessageEvent` a la cola SQS `whatsapp-incoming` con los metadatos de audio y responde con un código `200 OK` en menos de 3 segundos para evitar reintentos de Meta.
  2. **Telegram (NestJS Controller `receiveWebhook`):** El controlador de canales de Telegram intercepta el webhook. Si detecta el objeto `message.voice`, extrae el `file_id` (como `mediaId`) y el `mime_type` (default `audio/ogg`). Encola el payload en la cola SQS `telegram-incoming` y responde con `200 OK` de inmediato.

- **Resultado:** El evento es almacenado en la cola SQS de entrada correspondiente, listo para su procesamiento asíncrono, con los metadatos de audio identificados.

---

### 2.2 Despacho Asíncrono por la Lambda de Procesamiento

- **Trigger:** Un registro con tipo de mensaje `audio` es consumido de la cola SQS por la Lambda `incoming-processor`.
  
- **Comportamiento:** La Lambda invoca al microservicio NestJS de la plataforma en la ruta `/internal/agents/:agentId/process`, propagando las siguientes propiedades en el cuerpo de la petición: `channelId`, `messageType: "audio"`, `mediaId` y `mimeType`.
  
- **Resultado:** La llamada es recibida por el servicio NestJS RAG Engine para iniciar la descarga y transcripción.

---

### 2.3 Descarga y Transcripción Unificada (STT)

- **Trigger:** NestJS RAG Engine recibe un payload de procesamiento con `messageType === "audio"`.

- **Comportamiento:**
  1. El servicio RAG recupera el canal activo (`channelId`) desde la base de datos MongoDB para identificar el proveedor (`whatsapp` o `telegram`) y el token del bot/canal cifrado.
  2. Desencripta el token de acceso usando la clave configurada.
  3. **Descarga desde WhatsApp:** Invoca `https://graph.facebook.com/v21.0/{mediaId}` para obtener la URL temporal de descarga del binario de audio de Meta, y luego descarga el archivo binario utilizando las cabeceras de autorización de Meta.
  4. **Descarga desde Telegram:** Invoca `https://api.telegram.org/bot{token}/getFile?file_id={mediaId}` para obtener la ruta relativa (`file_path`) y descarga el binario directamente desde `https://api.telegram.org/file/bot{token}/{file_path}`.
  5. Una vez descargado el binario de audio (formato `.ogg`/Opus en ambas plataformas), se envía a la API de **OpenAI Whisper** o a la API de **Groq Whisper** (`/v1/audio/transcriptions`), la cual retorna el texto limpio correspondiente.
     - *Detección automática:* El sistema analiza la clave `OPENAI_API_KEY`. Si comienza con el prefijo de Groq (`gsk_`), utiliza la API de Groq con el modelo `whisper-large-v3` de forma gratuita. De lo contrario, utiliza la API oficial de OpenAI con el modelo `whisper-1`.
  6. El texto transcrito se asigna a `userMessage` y se continúa con el flujo estándar de RAG de la misma manera que si se hubiese recibido un mensaje de texto.

- **Resultado:** La transcripción se genera con éxito, y la consulta del usuario en texto plano ingresa al flujo de ejecución del agente.

---

## 3. Out of Scope

- Generación de respuestas en formato de audio (Text-to-Speech / TTS). Los agentes siempre responden en texto.
- Almacenamiento persistente o indexación de archivos de audio de usuario en buckets S3 propios (se descargan en memoria temporal/buffer y se desechan tras la transcripción).
- Transcodificación de audio en servidor (se confía en el soporte nativo de Whisper para el formato de entrada OGG/Opus).
- Transcripción en tiempo real de audios de más de 30 segundos (se limitará el procesamiento a audios estándar de mensajería).

---

## 4. Technical Context

### Patrones de arquitectura

- **Procesamiento Asíncrono en Colas:** Uso de colas SQS intermedias para separar la validación de webhook de la descarga y transcripción del archivo de audio, evitando timeouts de webhook (límite de 3 segundos para WhatsApp).
- **Abstracción del Proveedor de Mensajería:** Centralización de la descarga en el backend de NestJS mediante patrón adaptador según el proveedor configurado en el canal.

### Integraciones

| Dirección | Solución | Interfaz esperada |
|-----------|----------|-------------------|
| Consume → | [5] Conector de WhatsApp | Recepción y transmisión de payloads de mensajes de tipo audio |
| Consumida por ← | [2] Motor RAG, [3] Cotizador, [4] Agendamiento | Pre-procesamiento de transcripción en el endpoint `/internal/agents/:agentId/process` |
| Consume → | OpenAI / Groq Whisper API | Envío de buffer de audio para transcripción a texto a través de SDK oficial o HTTP REST (admite Groq con keys `gsk_`) |

### Decisiones técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Formato de audio | OGG/Opus nativo | Es el formato nativo enviado por clientes móviles de WhatsApp y Telegram, y Whisper lo soporta directamente sin transcodificación intermedio. |
| Lugar de transcripción | NestJS RAG Engine | Centraliza el acceso a bases de datos de configuración de canales, decodificación de secretos y llamadas a LLMs sin recargar las Lambdas ligeras. |
| Almacenamiento | Descarga en Buffer temporal | Optimiza costos de infraestructura de almacenamiento y reduce riesgos relacionados con la privacidad de datos (PII). |
| Proveedor de STT | OpenAI o Groq Whisper | Selección automática basada en el formato de la clave API (las que empiezan con `gsk_` se enrutan a Groq de forma gratuita y con modelo `whisper-large-v3`). |

---

## 5. Acceptance Criteria

### Recepción y Encolado
- [ ] La Lambda de WhatsApp (`receive-webhook`) acepta mensajes de tipo `audio`, extrae `id` y `mime_type`, y los inserta en SQS sin superar los 3 segundos de respuesta.
- [ ] El controlador de Telegram en NestJS acepta webhooks con el campo `message.voice`, extrae `file_id` y `mime_type`, y los encola de forma asíncrona.
- [ ] El formato de los mensajes de audio insertados en SQS de WhatsApp y Telegram contiene los campos `messageType: "audio"`, `mediaId` y `mimeType`.

### Invocación al Motor RAG
- [ ] La Lambda `incoming-processor` de WhatsApp y de Telegram propaga las propiedades `channelId`, `messageType`, `mediaId` y `mimeType` a la API de NestJS.

### Descarga y Transcripción
- [ ] El motor RAG lee los datos de configuración del canal usando el `channelId` y descifra su token con éxito.
- [ ] Si es WhatsApp, descarga correctamente el binario de audio desde la API de Meta utilizando el token descifrado.
- [ ] Si es Telegram, consulta `getFile` para resolver la ruta y descarga el binario del servidor de archivos de Telegram utilizando el token descifrado.
- [ ] Se invoca a la API de OpenAI Whisper o Groq Whisper enviando el buffer del audio, retornando el texto plano correspondiente.
- [ ] Si la descarga o la transcripción fallan, el flujo maneja el error notificando al usuario en texto que el audio no pudo ser procesado.

### Flujo Completo
- [ ] El texto transcrito es procesado por el motor RAG del agente, y este responde de manera satisfactoria en formato de texto plano.

---

## 6. Risks & Assumptions

| Tipo | Descripción | Mitigación |
|------|-------------|------------|
| Supuesto | El formato enviado por Telegram y WhatsApp es soportado directamente por OpenAI Whisper. | Confirmado ( Whisper acepta archivos de tipo `.ogg` codificados con Opus directamente). |
| Riesgo | Latencia de la API de Whisper prolonga el procesamiento conversacional. | El procesamiento asíncrono desacopla al webhook, impidiendo duplicidad por reintentos. Se alertará al usuario si hay demoras de red. |
| Riesgo | Consumo excesivo de cuota o tokens de Whisper por audios muy extensos o vacíos. | Se establecerán límites máximos de tamaño de archivo (ej: 10MB) antes de iniciar la descarga. |
