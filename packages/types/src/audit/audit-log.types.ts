export type AuditActionType =
  | "agent.create"
  | "agent.update"
  | "agent.delete"
  | "channel.connect"
  | "channel.disconnect"
  | "channel.update"
  | "company.update"
  | "knowledge.upload"
  | "knowledge.delete"
  | "user.login"
  | "user.update";

export interface AuditLogPayload {
  companyId: string;
  userId: string;
  userEmail: string;
  action: AuditActionType;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
