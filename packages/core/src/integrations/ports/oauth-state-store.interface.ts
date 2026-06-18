/**
 * Puerto `IOAuthStateStore`.
 *
 * Define el almacenamiento del `state` OAuth para el control anti-replay
 * (bandera `used`) y su limpieza por TTL. Lo implementa un adaptador de la
 * capa de infraestructura (repositorio MongoDB de `oauthStates`); el servicio
 * de dominio lo recibe por constructor y nunca conoce el motor de BD.
 */

import type { IntegrationProvider } from "@multibotagents/types";

/** Datos para persistir un `state` al iniciar el flujo OAuth. */
export interface OAuthStatePersistInput {
  /** Identificador único del state (`jti` del JWT). */
  jti: string;
  companyId: string;
  agentId?: string;
  provider: IntegrationProvider;
  /** Momento de expiración (ventana anti-CSRF, ~10 min). */
  expiresAt: Date;
}

/** Contexto recuperado al consumir un `state` válido. */
export interface OAuthStateConsumeResult {
  jti: string;
  companyId: string;
  agentId?: string;
  provider: IntegrationProvider;
}

export interface IOAuthStateStore {
  /** Persiste un nuevo `state`. */
  persist(input: OAuthStatePersistInput): Promise<void>;

  /**
   * Marca el `state` como usado de forma atómica e indivisible.
   * Retorna el contexto si era válido (existe, no usado, no expirado); null si no.
   */
  consume(jti: string): Promise<OAuthStateConsumeResult | null>;
}
