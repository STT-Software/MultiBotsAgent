import { ObjectId } from "mongodb";
import type { AuditActionType } from "@multibotagents/types";

export const AUDIT_LOGS_COLLECTION = "audit_logs";

export interface AuditLogDocument {
  _id?: ObjectId;
  companyId: ObjectId;
  userId: ObjectId;
  userEmail: string;
  action: AuditActionType;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  createdAt?: Date;
}

export const AUDIT_LOGS_INDEXES = [
  {
    key: { companyId: 1, timestamp: -1 },
    name: "idx_company_timestamp",
  },
  {
    key: { companyId: 1, action: 1 },
    name: "idx_company_action",
  },
];
