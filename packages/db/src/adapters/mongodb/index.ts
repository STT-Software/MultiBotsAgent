/**
 * Adaptador MongoDB — Implementaciones concretas de los repositorios.
 *
 * Cada repositorio recibe una instancia de `Db` (mongodb driver) en el constructor
 * y expone métodos de dominio con conversión automática entre documentos MongoDB
 * (ObjectId) y entidades de dominio (string ids).
 *
 * Las interfaces y DTOs se importan desde `../../interfaces/`.
 */

export { CompanyRepository } from "./company.repository";
export { UserRepository } from "./user.repository";
export { RefreshTokenRepository } from "./refresh-token.repository";
export { VerifyTokenRepository } from "./verify-token.repository";
export { EmailQueueRepository } from "./email-queue.repository";
export { RateLimitRepository } from "./rate-limit.repository";
export { ChannelRepository } from "./channel.repository";
export { KnowledgeSourceRepository } from "./knowledge-source.repository";
export type { IKnowledgeSourceRepository } from "./knowledge-source.repository";
export { KnowledgeFragmentRepository } from "./knowledge-fragment.repository";
export type { IKnowledgeFragmentRepository } from "./knowledge-fragment.repository";
export { EscalatedConversationRepository } from "./escalated-conversation.repository";
export type { IEscalatedConversationRepository, EscalatedConversation, EscalatedConversationMessage } from "./escalated-conversation.repository";
export { EscalationEventRepository } from "./escalation-event.repository";
export type { IEscalationEventRepository, EscalationEvent } from "./escalation-event.repository";
export { ProcessedMessageRepository } from "./processed-message.repository";
export { MessageLogRepository } from "./message-log.repository";
export { MongoDBChatMemoryRepository } from "./chat-memory.repository";
export { AgentRepository } from "./agent.repository";
export { MetricEventRepository } from "./metric-event.repository";
export { buildMetricEventDocument } from "./metric-event.repository";
export type { AgentFilter, AgentType } from "./metric-event.repository";
export { BookingRepository } from "./booking.repository";
export { AuditLogRepository } from "./audit-log.repository";
export { OrderRepository } from "./order.repository";
export { IntegrationRepository } from "./integration.repository";
export { OAuthStateRepository } from "./oauth-state.repository";

// Re-export interfaces desde la carpeta centralizada
export type {
  CreateCompanyData,
  UpdateCompanyProfileData,
  ICompanyRepository,
  CreateUserData,
  IUserRepository,
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  IVerifyTokenRepository,
  EnqueueEmailData,
  IEmailQueueRepository,
  IForgotPasswordEmailRepository,
  IForgotPasswordUserRepository,
  IForgotPasswordTokenRepository,
  IResetPasswordTokenRepository,
  IResetPasswordUserRepository,
  CreateChannelData,
  UpdateChannelData,
  UpdateCredentialsData,
  IChannelRepository,
  IProcessedMessageRepository,
  IMessageLogRepository,
  IAgentRepository,
  IMetricEventRepository,
  CreateBookingData,
  IBookingRepository,
  IAuditLogRepository,
  CreateOrderData,
  IOrderRepository,
  CreateIntegrationData,
  UpdateIntegrationData,
  IIntegrationRepository,
  CreateOAuthStateData,
  OAuthStateRecord,
  IOAuthStateRepository,
} from "../../interfaces";
