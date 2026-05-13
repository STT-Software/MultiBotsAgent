export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface LoginTouchedFields {
  email: boolean;
  password: boolean;
}

export type LoginErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'COMPANY_PENDING_DELETION'
  | 'SESSION_REPLACED';

export interface ServerErrorState {
  code: LoginErrorCode;
  message: string;
  deletionDate?: string;
}
