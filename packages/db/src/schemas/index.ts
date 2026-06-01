/**
 * Barrel export para todos los esquemas MongoDB.
 *
 * Cada esquema exporta:
 * - Interfaz del documento MongoDB (con ObjectId)
 * - Constante con el nombre de la colección
 * - Definiciones de índices (para creación vía migración)
 * - JSON Schema de validación (para createCollection)
 */

export {
  COMPANIES_COLLECTION,
  COMPANIES_INDEXES,
  COMPANIES_VALIDATION,
  type CompanyDocument,
} from "./company.schema";

export {
  USERS_COLLECTION,
  USERS_INDEXES,
  USERS_VALIDATION,
  type UserDocument,
} from "./user.schema";

export {
  REFRESH_TOKENS_COLLECTION,
  REFRESH_TOKENS_INDEXES,
  REFRESH_TOKENS_VALIDATION,
  type RefreshTokenDocument,
} from "./refresh-token.schema";

export {
  VERIFY_TOKENS_COLLECTION,
  VERIFY_TOKENS_INDEXES,
  VERIFY_TOKENS_VALIDATION,
  type VerifyTokenDocument,
} from "./verify-token.schema";

export {
  EMAIL_QUEUE_COLLECTION,
  EMAIL_QUEUE_INDEXES,
  EMAIL_QUEUE_VALIDATION,
  type EmailQueueDocument,
} from "./email-queue.schema";

export {
  ESCALATED_CONVERSATIONS_COLLECTION,
  ESCALATED_CONVERSATIONS_INDEXES,
  ESCALATED_CONVERSATIONS_VALIDATION,
  type EscalatedConversationDocument,
  type EscalatedConversationMessageDocument,
} from "./escalated-conversation.schema";

export {
  ESCALATION_EVENTS_COLLECTION,
  ESCALATION_EVENTS_INDEXES,
  ESCALATION_EVENTS_VALIDATION,
  type EscalationEventDocument,
} from "./escalation-event.schema";

export {
  RATE_LIMITS_COLLECTION,
  RATE_LIMITS_INDEXES,
  RATE_LIMITS_VALIDATION,
  type RateLimitDocument,
} from "./rate-limit.schema";

export {
  CHANNELS_COLLECTION,
  CHANNELS_INDEXES,
  CHANNELS_VALIDATION,
  type ChannelDocument,
} from "./channel.schema";

export {
  PROCESSED_MESSAGES_COLLECTION,
  PROCESSED_MESSAGES_INDEXES,
  PROCESSED_MESSAGES_VALIDATION,
  type ProcessedMessageDocument,
} from "./processed-message.schema";

export {
  MESSAGE_LOGS_COLLECTION,
  MESSAGE_LOGS_INDEXES,
  MESSAGE_LOGS_VALIDATION,
  type MessageLogDocument,
} from "./message-log.schema";

export {
  CHAT_MEMORIES_COLLECTION,
  CHAT_MEMORIES_INDEXES,
  CHAT_MEMORIES_VALIDATION,
  type ChatMemoryDocument,
} from "./chat-memory.schema";

export {
  AGENTS_COLLECTION,
  AGENTS_INDEXES,
  AGENTS_VALIDATION,
  type AgentDocument,
} from "./agent.schema";


