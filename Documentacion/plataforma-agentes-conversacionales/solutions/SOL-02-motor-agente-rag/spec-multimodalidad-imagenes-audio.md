---
taxonomy: solution-spec
key: spec-multimodalidad-imagenes-audio
solution: Especificación de Procesamiento Multimodal (Imágenes y Audio)
initiative: plataforma-agentes-conversacionales
product: MultiBotsAgent
author: AI Coding Assistant (Antigravity)
created: 2026-06-11
updated: 2026-06-11
version: 1.0.0
status: draft
language: es
---

# Especificación Técnica: Procesamiento Multimodal de Imágenes y Audio

Esta especificación describe el diseño de la capacidad multimodal integrada en el **Motor de Agente RAG** (Solución 02) para permitir la recepción, descarga, transcripción y análisis nativo de mensajes de audio e imágenes sobre canales conversacionales (como WhatsApp).

---

## 1. Arquitectura de Flujo de Datos

El motor de procesamiento RAG es agnóstico del canal de comunicación a nivel de transporte, pero colabora con los adaptadores de canal (ej. `incoming-processor.handler` de WhatsApp) para descargar el material multimedia de forma segura.

### 1.1 Diagrama de Secuencia de Procesamiento Multimodal

```mermaid
sequenceDiagram
    participant WA as WhatsApp API / Lambda
    participant RE as RAG Engine (NestJS)
    participant WH as Whisper API (Groq/OpenAI)
    participant BR as AWS Bedrock (Claude 3 Sonnet/Haiku)

    alt Mensaje es de Audio
        WA->>RE: Procesar consulta con mediaId, messageType: "audio"
        RE->>WA: Descargar buffer de audio (usando token del canal decriptado)
        RE->>WH: Transcribir audio (formato OGG/MP3)
        WH-->>RE: Retornar texto transcrito
        RE->>RE: Inyectar transcripción como prompt de usuario
    else Mensaje es de Imagen
        WA->>RE: Procesar consulta con mediaId, messageType: "image"
        RE->>WA: Descargar buffer de imagen
        RE->>RE: Convertir buffer a Base64 e inyectar en prompt multimodal
    end

    RE->>RE: Ejecutar búsqueda de Base de Conocimiento (RAG)
    RE->>BR: Invocar LLM con System Prompt + Contexto RAG + Historial + Input Multimodal
    BR-->>RE: Responder mensaje en texto estructurado
    RE-->>WA: Retornar respuesta final para el usuario
```

---

## 2. Contratos de Datos y DTOs

### 2.1 payload de Entrada al RAG (`RagProcessInput`)

La interfaz `RagProcessInput` se amplió para recibir opcionalmente campos de metadatos de medios:

```typescript
export interface RagProcessInput {
  agentId: string;
  conversationId: string;
  userMessage?: string;       // Opcional si solo se envía una imagen
  timestamp: Date;
  channelId?: string;         // Requerido para resolver credenciales de descarga de medios
  messageType?: 'text' | 'audio' | 'image' | 'document';
  mediaId?: string;           // Identificador único del recurso multimedia
  mimeType?: string;          // Tipo MIME (ej. image/jpeg, audio/ogg)
}
```

### 2.2 Estructura del Prompt Multimodal (`LlmPrompt`)

El proveedor de LLM (`BedrockLlmProvider`) recibe la interfaz `LlmPrompt` la cual contiene los fragmentos textuales y una estructura de imagen opcional:

```typescript
export interface LlmPrompt {
  systemPrompt: string;
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextFragments: string[];
  image?: {
    base64: string;           // Contenido de la imagen codificado en Base64
    mediaType: string;        // Tipo MIME exacto (ej. image/jpeg, image/png)
  };
}
```

---

## 3. Detalles de Implementación

### 3.1 Transcripción de Audio
- El RAG Engine obtiene el token de acceso del canal conversacional desencriptándolo mediante la clave maestra del entorno.
- Utiliza la API HTTP de WhatsApp Cloud para descargar el binario del audio en formato OGG/OPUS.
- Envía el audio a través de un cliente multipart/form-data a la API de Whisper (Groq/OpenAI) usando la clave de API configurada en el entorno (`GROQ_API_KEY`).
- El texto transcrito reemplaza o complementa al `userMessage`. Si el texto resultante es irrelevante (por ejemplo: "Necesito que me ayudes a hacer un avioncito de papel"), el motor lo detecta y rechaza escalarlo innecesariamente comparando contra las directivas del sistema y la base de conocimientos.

### 3.2 Inyección Multimodal en AWS Bedrock
Para procesar imágenes, los payloads enviados a Bedrock (`anthropic.claude-3-sonnet` o `anthropic.claude-3-haiku`) usan el formato estructurado por partes:

```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1000,
  "system": "System Prompt con instrucciones del Agente...",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "/9j/4AAQSkZJR..."
          }
        },
        {
          "type": "text",
          "text": "Mensaje opcional del usuario acompañando la imagen"
        }
      ]
    }
  ]
}
```

---

## 4. Criterios de Aceptación y Pruebas

- **Descarga Segura:** El token del canal debe ser desencriptado bajo demanda y no almacenarse expuesto en texto plano en memoria ni logs.
- **Resiliencia de Media:** Si la descarga de la imagen o del audio falla, el agente debe responder con un mensaje informando que no pudo procesar el archivo en ese momento, en lugar de generar un error 500.
- **No-Alucinación:** Si la imagen no está relacionada con la base de conocimientos del agente, el sistema debe denegar el escalamiento a humano, respondiendo cordialmente que el tema está fuera de su alcance.
- **Soporte de Formatos:** Debe soportar archivos de imagen `image/jpeg`, `image/png`, `image/webp` y formatos de audio `audio/ogg`, `audio/mp3`, `audio/wav`.
