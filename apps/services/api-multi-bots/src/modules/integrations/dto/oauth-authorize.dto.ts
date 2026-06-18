import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { IntegrationProvider } from "@multibotagents/types";

/**
 * Query del endpoint `GET /integrations/oauth/authorize`.
 * Indica qué proveedor se desea conectar.
 */
export class OAuthAuthorizeQueryDto {
  @ApiProperty({
    description: "Proveedor externo a conectar.",
    enum: IntegrationProvider,
    example: IntegrationProvider.GOOGLE_DRIVE,
  })
  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @ApiPropertyOptional({
    description: "ID del agente asociado al flujo, si aplica.",
    example: "683da2f1e4b0a1c2d3e4f5a6",
  })
  @IsOptional()
  @IsString()
  agentId?: string;
}

/** Respuesta del endpoint de autorización. */
export class OAuthAuthorizeResponseDto {
  @ApiProperty({
    description: "URL de autorización del proveedor a la que redirigir al usuario.",
  })
  authorizationUrl!: string;
}
