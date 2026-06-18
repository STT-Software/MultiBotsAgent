import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * Query del endpoint `GET /integrations/oauth/callback`.
 *
 * Todos los campos son opcionales: el proveedor puede devolver `code`+`state`
 * (camino feliz) o `error`+`state` (cancelación / fallo). La validación de
 * negocio (state presente y válido) se realiza en el servicio para que el
 * callback siempre redirija al panel en lugar de responder 400.
 */
export class OAuthCallbackQueryDto {
  @ApiPropertyOptional({ description: "Código de autorización a intercambiar por tokens." })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: "State JWT firmado emitido al iniciar el flujo." })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: "Código de error del proveedor (ej. access_denied)." })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: "Descripción del error del proveedor." })
  @IsOptional()
  @IsString()
  error_description?: string;

  @ApiPropertyOptional({ description: "Scopes concedidos, separados por espacios." })
  @IsOptional()
  @IsString()
  scope?: string;
}
