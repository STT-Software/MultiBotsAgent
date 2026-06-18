import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IntegrationsService } from "./integrations.service";
import {
  OAuthAuthorizeQueryDto,
  OAuthAuthorizeResponseDto,
  OAuthCallbackQueryDto,
} from "./dto";

/** Ruta del panel donde se muestra el resultado de la conexión. */
const PANEL_INTEGRATIONS_PATH = "/integraciones";

@ApiTags("Integraciones")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("oauth/authorize")
  @ApiOperation({
    summary: "Iniciar la conexión OAuth de un proveedor",
    description:
      "Genera el `state` firmado y devuelve la URL de autorización del proveedor a la que el panel debe redirigir.",
  })
  @ApiOkResponse({ type: OAuthAuthorizeResponseDto })
  async authorize(
    @Req() req: Request,
    @Query() query: OAuthAuthorizeQueryDto,
  ): Promise<OAuthAuthorizeResponseDto> {
    const { companyId } = (req as unknown as { user: { companyId: string } })
      .user;
    return this.integrationsService.buildAuthorizationUrl(
      companyId,
      query.provider,
      query.agentId,
    );
  }

  @Get("oauth/callback")
  @ApiOperation({
    summary: "Callback OAuth (único para todos los proveedores)",
    description:
      "Procesado server-side: valida el `state`, intercambia el `code` por tokens, persiste la integración cifrada y redirige al panel con el resultado. El proveedor se resuelve desde el `state`.",
  })
  async callback(
    @Query() query: OAuthCallbackQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.integrationsService.handleCallback(query);

    const frontendUrl = process.env.FRONTEND_URL ?? "";
    res.redirect(
      `${frontendUrl}${PANEL_INTEGRATIONS_PATH}?status=${encodeURIComponent(result)}`,
    );
  }
}
