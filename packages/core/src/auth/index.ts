/**
 * Auth module barrel export.
 * Re-exports all auth-related services, validators, and interfaces.
 */
export * from "./register.validator";
export * from "./password.validator";
export * from "./password.service";
export * from "./token.service";
export * from "./captcha.service";
export * from "./register.service";
export * from "./rate-limit.service";
export * from "./login.service";
export * from "./refresh.service";
export * from "./logout.service";
export * from "./change-password.service";
export * from "./interfaces/change-password.interfaces";
export * from "./forgot-password.service";
export {
  ResetPasswordService,
  PasswordValidationError as ResetPasswordValidationError,
} from "./reset-password.service";
export {
  TokenInvalidError as ResetTokenInvalidError,
  TokenExpiredError as ResetTokenExpiredError,
  TokenAlreadyUsedError as ResetTokenAlreadyUsedError,
} from "./reset-password.service";
export * from "./interfaces/password-recovery.interfaces";
