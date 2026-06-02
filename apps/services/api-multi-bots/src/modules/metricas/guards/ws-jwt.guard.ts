import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { TokenService } from '@multibotagents/core';
import type { CompanyRepository } from '@multibotagents/db';
import { CompanyStatus } from '@multibotagents/types';
import type { Socket } from 'socket.io';

/**
 * Guard de autenticación JWT para conexiones WebSocket.
 *
 * Flujo de validación en el handshake inicial:
 * 1. Extrae token del query param: client.handshake.query.token
 * 2. Verifica con TokenService (mismo mecanismo que JwtAuthGuard HTTP)
 * 3. Verifica que la empresa existe y tiene status === 'active'
 * 4. Si todo válido: adjunta payload al socket (client.data.user)
 *
 * Rechazos: emite error con código 4001 y desconecta.
 * Los códigos 4000-4999 están reservados para uso de la aplicación
 * en el protocolo WebSocket.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly tokenService: TokenService;

  constructor(
    @Inject('COMPANY_REPO') private readonly companyRepo: CompanyRepository,
  ) {
    const secrets = (process.env.JWT_SECRETS || '').split(',').filter(Boolean);
    this.tokenService = new TokenService({ secrets });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    // 1. Extraer token del query param del handshake WebSocket
    const token = client.handshake.query?.token as string | undefined;
    if (!token) {
      client.emit('error', { code: 4001, message: 'Token no proporcionado' });
      client.disconnect(true);
      return false;
    }

    // 2. Verificar JWT con el mismo TokenService del guard HTTP
    let payload: { userId: string; companyId: string };
    try {
      payload = this.tokenService.verifyAccessToken(token) as { userId: string; companyId: string };
    } catch {
      client.emit('error', { code: 4001, message: 'Token inválido o expirado' });
      client.disconnect(true);
      return false;
    }

    // 3. Verificar que la empresa existe y está activa
    const company = await this.companyRepo.findById(payload.companyId);
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      client.emit('error', { code: 4001, message: 'Empresa no activa' });
      client.disconnect(true);
      return false;
    }

    // 4. Adjuntar payload al socket para uso en handlers posteriores
    client.data.user = payload;
    return true;
  }
}
