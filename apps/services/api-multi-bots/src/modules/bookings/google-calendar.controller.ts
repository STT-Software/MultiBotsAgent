import {
  Controller,
  Get,
  Delete,
  Query,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  HttpCode,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { google } from "googleapis";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IAgentRepository } from "@multibotagents/db";
import { encryptToken } from "@multibotagents/core";

@ApiTags("Google Calendar Integration")
@Controller("bookings/google-calendar")
export class GoogleCalendarController {
  constructor(
    @Inject("AGENT_REPO")
    private readonly agentRepository: IAgentRepository,
  ) { }

  private getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        "Las credenciales globales de Google OAuth no están configuradas en el servidor.",
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("auth-url")
  @ApiOperation({
    summary: "Obtener la URL de consentimiento de Google OAuth2",
    description:
      "Genera la URL a la que debe redirigirse al usuario para autorizar el acceso a su Google Calendar en el modelo SaaS Multi-Tenant.",
  })
  @ApiQuery({ name: "agentId", description: "ID del agente a vincular" })
  async getAuthUrl(
    @Req() req: Request,
    @Query("agentId") agentId: string,
  ) {
    const { companyId } = (req as any).user;

    // Validar que el agente exista y pertenezca a la misma empresa
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${agentId}`);
    }
    if (agent.companyId !== companyId) {
      throw new ForbiddenException("No tienes permisos sobre este agente.");
    }
    if (agent.tipo !== "agendamiento") {
      throw new BadRequestException("El agente debe ser de tipo agendamiento.");
    }

    const oauth2Client = this.getOAuthClient();

    // Guardamos agentId y companyId en el state de OAuth
    const state = Buffer.from(
      JSON.stringify({ agentId, companyId }),
    ).toString("base64");

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: state,
    });

    return { url };
  }

  @Get("callback")
  @ApiOperation({
    summary: "Callback de Google OAuth2",
    description:
      "Recibe el código de autorización de Google, lo intercambia por tokens de acceso/refresco y los guarda cifrados en el agente.",
  })
  async callback(
    @Query("code") code: string,
    @Query("state") stateBase64: string,
    @Res() res: Response,
  ) {
    let agentId = "";
    const frontendUrl = process.env.FRONTEND_URL;

    try {
      if (!code || !stateBase64) {
        throw new BadRequestException("Código o estado inválido en el callback de Google.");
      }

      // Decodificar el state
      const { agentId: decodedAgentId } = JSON.parse(
        Buffer.from(stateBase64, "base64").toString("utf-8"),
      );
      agentId = decodedAgentId;

      const oauth2Client = this.getOAuthClient();

      // Intercambiar el código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      if (!tokens.refresh_token) {
        throw new Error(
          "No se obtuvo refresh_token. Es posible que ya hayas vinculado esta cuenta. Por favor revoca el acceso en la configuración de Google y vuelve a intentar.",
        );
      }

      // Obtener el email del usuario conectado
      const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || "conectado@calendar.com";

      // Cifrar el refresh_token antes de guardarlo en MongoDB
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error("ENCRYPTION_KEY no está configurada en el servidor.");
      }

      const encryptedToken = encryptToken(tokens.refresh_token, encryptionKey);

      // Guardar credenciales en el agente
      await this.agentRepository.update(agentId, {
        googleCalendarEmail: email,
        googleCalendarRefreshToken: encryptedToken,
      } as any);

      // Redirigir de vuelta al frontend con estado de éxito
      return res.redirect(
        `${frontendUrl}/dashboard/agentes/${agentId}?status=calendar_success&email=${encodeURIComponent(
          email,
        )}`,
      );
    } catch (error) {
      console.error("Error en Google Calendar callback:", error);
      const redirectTarget = agentId
        ? `${frontendUrl}/dashboard/agentes/${agentId}?status=calendar_error`
        : `${frontendUrl}/dashboard/agentes?status=calendar_error`;
      return res.redirect(redirectTarget);
    }
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Delete("disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Desvincular Google Calendar",
    description: "Elimina las credenciales de Google Calendar asociadas al agente.",
  })
  @ApiQuery({ name: "agentId", description: "ID del agente a desvincular" })
  async disconnect(
    @Req() req: Request,
    @Query("agentId") agentId: string,
  ) {
    const { companyId } = (req as any).user;

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${agentId}`);
    }
    if (agent.companyId !== companyId) {
      throw new ForbiddenException("No tienes permisos sobre este agente.");
    }

    // Actualizar el agente quitando las credenciales (estableciendo a null/undefined)
    await this.agentRepository.update(agentId, {
      googleCalendarEmail: null,
      googleCalendarRefreshToken: null,
    } as any);

    return { success: true };
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtener el estado de conexión con Google Calendar",
    description:
      "Devuelve si el agente tiene una cuenta de Google Calendar vinculada y el correo electrónico correspondiente.",
  })
  @ApiQuery({ name: "agentId", description: "ID del agente" })
  async getStatus(
    @Req() req: Request,
    @Query("agentId") agentId: string,
  ) {
    const { companyId } = (req as any).user;

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${agentId}`);
    }
    if (agent.companyId !== companyId) {
      throw new ForbiddenException("No tienes permisos sobre este agente.");
    }

    const isConnected = !!agent.googleCalendarRefreshToken;

    return {
      connected: isConnected,
      email: agent.googleCalendarEmail || null,
    };
  }
}
