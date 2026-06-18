/**
 * Servicio de dominio puro para el `state` OAuth (SL13).
 *
 * Firma y valida el `state` que protege el flujo OAuth contra CSRF y reuso del
 * `code`. El `state` es un JWT firmado con HS256 y vida corta (10 min); su `jti`
 * se persiste vía el puerto `IOAuthStateStore` para garantizar un único uso
 * (bandera `used`). Lógica pura: sin dependencias de AWS ni de NestJS; el
 * secreto y el almacén entran por constructor.
 *
 * Decisión de diseño (#3): el `state` se firma, no se cifra. El cifrado
 * (`encryptToken`/`decryptToken`) se reserva para los tokens del proveedor.
 */
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import type { IntegrationProvider } from "@multibotagents/types";
import type {
  IOAuthStateStore,
  OAuthStateConsumeResult,
} from "./ports/oauth-state-store.interface";
import { InvalidOAuthStateError } from "./errors";

/** TTL por defecto del `state` (10 minutos, en segundos). */
const DEFAULT_STATE_TTL_SECONDS = 10 * 60;

/** Configuración del servicio. */
export interface OAuthStateServiceConfig {
  /** Secreto HS256 para firmar/verificar el `state`. */
  secret: string;
  /** TTL del `state` en segundos (por defecto 600). */
  ttlSeconds?: number;
}

/** Contexto del flujo que viaja dentro del `state`. */
export interface OAuthStateContext {
  companyId: string;
  provider: IntegrationProvider;
  agentId?: string;
}

/** Claims decodificados del `state` JWT. */
interface OAuthStateClaims extends OAuthStateContext {
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface OAuthStateServiceDeps {
  config: OAuthStateServiceConfig;
  store: IOAuthStateStore;
}

export class OAuthStateService {
  private readonly secret: string;
  private readonly ttlSeconds: number;
  private readonly store: IOAuthStateStore;

  constructor(deps: OAuthStateServiceDeps) {
    if (!deps.config.secret) {
      throw new Error("OAuthStateService requiere un secret para firmar el state");
    }
    this.secret = deps.config.secret;
    this.ttlSeconds = deps.config.ttlSeconds ?? DEFAULT_STATE_TTL_SECONDS;
    this.store = deps.store;
  }

  /**
   * Firma un `state` JWT (HS256, TTL) con el contexto del flujo y lo persiste
   * para el control anti-replay. Retorna el JWT para incluirlo en la URL de
   * autorización del proveedor (R1.1).
   */
  async issue(context: OAuthStateContext): Promise<string> {
    const jti = randomUUID();

    const token = jwt.sign(
      {
        companyId: context.companyId,
        provider: context.provider,
        ...(context.agentId ? { agentId: context.agentId } : {}),
      },
      this.secret,
      { algorithm: "HS256", expiresIn: this.ttlSeconds, jwtid: jti },
    );

    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    await this.store.persist({
      jti,
      companyId: context.companyId,
      agentId: context.agentId,
      provider: context.provider,
      expiresAt,
    });

    return token;
  }

  /**
   * Valida el `state` (firma + TTL) y lo marca como usado de forma atómica.
   * Retorna el contexto del flujo si es válido; lanza `InvalidOAuthStateError`
   * si la firma es incorrecta, el TTL expiró o el `state` ya fue usado (R1.6, R1.10).
   */
  async validateAndConsume(state: string): Promise<OAuthStateConsumeResult> {
    let claims: OAuthStateClaims;
    try {
      claims = jwt.verify(state, this.secret, {
        algorithms: ["HS256"],
      }) as OAuthStateClaims;
    } catch {
      // Firma inválida o token expirado.
      throw new InvalidOAuthStateError();
    }

    if (!claims.jti) {
      throw new InvalidOAuthStateError();
    }

    // El consumo atómico en el almacén garantiza un único uso (anti-replay).
    const consumed = await this.store.consume(claims.jti);
    if (!consumed) {
      throw new InvalidOAuthStateError();
    }

    return consumed;
  }
}
