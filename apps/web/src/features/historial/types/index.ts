export interface AuditLog {
  _id: string;
  companyId: string;
  userId: string;
  userEmail: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}
