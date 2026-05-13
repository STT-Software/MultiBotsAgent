export type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export type VerificationErrorType =
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'INTERNAL_ERROR';

export interface VerifyEmailResult {
  verified: boolean;
  message: string;
  hasActiveSession?: boolean;
}

export interface ResendVerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

export interface VerificationError {
  type: VerificationErrorType;
  message: string;
  retryAfter?: number;
  userId?: string;
}
