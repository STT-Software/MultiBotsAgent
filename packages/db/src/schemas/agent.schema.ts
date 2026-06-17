import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const AGENTS_COLLECTION = "agents";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `agents`.
 * Representa la configuración completa y los parámetros cognitivos de un agente.
 */
export interface AgentDocument {
  _id: ObjectId;
  companyId: ObjectId;
  nombre: string;
  tipo: "rag" | "cotizador" | "agendamiento";
  estado: "activo" | "borrador";
  instrucciones?: string; // Fallback antiguo para compatibilidad
  relevanceThreshold: number;
  topK: number;
  maxResponseLength: number;
  memoryWindow: number;
  welcomeMessage?: string;
  timezone?: string;
  noInfoMessage: string;
  errorMessage: string;
  language: string;
  failedAttemptsBeforeEscalation?: number;
  personality: {
    name: string;
    tone: string;
    restrictions: string[];
    instructions: string;
  };
  googleCalendarEmail?: string;
  googleCalendarRefreshToken?: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `agents`.
 * - companyId: Búsqueda y listado rápido de agentes por empresa.
 */
export const AGENTS_INDEXES = [
  {
    key: { companyId: 1 },
    name: "companyId",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const AGENTS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "nombre",
      "tipo",
      "estado",
      "relevanceThreshold",
      "topK",
      "maxResponseLength",
      "memoryWindow",
      "noInfoMessage",
      "errorMessage",
      "language",
      "personality",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa propietaria del agente — requerido",
      },
      nombre: {
        bsonType: "string",
        minLength: 1,
        description: "Nombre interno del agente — requerido",
      },
      tipo: {
        bsonType: "string",
        enum: ["rag", "cotizador", "agendamiento"],
        description: "Tipo de comportamiento del agente — requerido",
      },
      estado: {
        bsonType: "string",
        enum: ["activo", "borrador"],
        description: "Estado del agente — requerido",
      },
      instrucciones: {
        bsonType: "string",
        description: "Fallback de instrucciones generales — opcional",
      },
      relevanceThreshold: {
        bsonType: "double",
        minimum: 0.0,
        maximum: 1.0,
        description: "Umbral de relevancia para fragmentos RAG — requerido",
      },
      topK: {
        bsonType: "int",
        minimum: 1,
        maximum: 20,
        description: "Cantidad de fragmentos a recuperar en búsqueda vectorial — requerido",
      },
      maxResponseLength: {
        bsonType: "int",
        minimum: 50,
        maximum: 2000,
        description: "Límite máximo de caracteres para las respuestas — requerido",
      },
      memoryWindow: {
        bsonType: "int",
        minimum: 1,
        maximum: 50,
        description: "Cantidad de mensajes en el historial de la conversación — requerido",
      },
      welcomeMessage: {
        bsonType: "string",
        description: "Mensaje de saludo inicial proactivo — opcional",
      },
      timezone: {
        bsonType: "string",
        description: "Huso horario configurado para el agente (ej. 'America/Bogota') — opcional",
      },
      noInfoMessage: {
        bsonType: "string",
        description: "Mensaje cuando no se encuentra información en el RAG — requerido",
      },
      errorMessage: {
        bsonType: "string",
        description: "Mensaje cuando ocurre un error de procesamiento o timeout — requerido",
      },
      language: {
        bsonType: "string",
        description: "Idioma en el que debe responder el agente (ej. 'es', 'en') — requerido",
      },
      failedAttemptsBeforeEscalation: {
        bsonType: "int",
        description: "Intentos fallidos de RAG antes de escalar a humano — opcional",
      },
      personality: {
        bsonType: "object",
        required: ["name", "tone", "restrictions", "instructions"],
        properties: {
          name: {
            bsonType: "string",
            minLength: 1,
            description: "Nombre público del agente en el chat — requerido",
          },
          tone: {
            bsonType: "string",
            description: "Tono de voz de las respuestas (ej. 'profesional', 'amigable') — requerido",
          },
          restrictions: {
            bsonType: "array",
            items: {
              bsonType: "string",
            },
            description: "Reglas de negocio restrictivas de comportamiento — requerido",
          },
          instructions: {
            bsonType: "string",
            description: "Instrucciones de comportamiento cognitivo — requerido",
          },
        },
        description: "Configuración de personalidad del agente — requerido",
      },
      googleCalendarEmail: {
        bsonType: "string",
        description: "Email de la cuenta vinculada de Google Calendar — opcional",
      },
      googleCalendarRefreshToken: {
        bsonType: "object",
        required: ["ciphertext", "iv", "tag"],
        properties: {
          ciphertext: {
            bsonType: "string",
            description: "Token de refresco cifrado",
          },
          iv: {
            bsonType: "string",
            description: "Vector de inicialización",
          },
          tag: {
            bsonType: "string",
            description: "Auth tag",
          },
        },
        description: "Token de refresco de Google OAuth cifrado — opcional",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp de última actualización — requerido",
      },
    },
  },
};
