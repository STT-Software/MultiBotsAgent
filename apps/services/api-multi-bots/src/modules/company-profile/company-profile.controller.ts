import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyProfileNestService } from './company-profile-nest.service';
import { CompanyProfileExceptionFilter } from './filters/company-profile-exception.filter';
import {
  UpdateCompanyProfileDto,
  CompanyProfileResponseDto,
  LogoUploadUrlRequestDto,
  LogoUploadUrlResponseDto,
} from './dto';

/**
 * Controlador REST para la gestión del perfil de empresa.
 * Todos los endpoints requieren autenticación JWT.
 * El companyId se extrae exclusivamente del token (nunca de URL o body).
 */
@ApiTags('Company Profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@UseFilters(CompanyProfileExceptionFilter)
@Controller('company-profile')
export class CompanyProfileController {
  constructor(
    private readonly companyProfileService: CompanyProfileNestService,
  ) {}

  // ─── GET /company-profile ────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Obtener perfil de empresa',
    description: 'Retorna los datos del perfil de la empresa asociada al usuario autenticado, incluyendo el email como campo de solo lectura.',
  })
  @ApiResponse({ status: 200, description: 'Perfil de empresa obtenido exitosamente.', type: CompanyProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Token no proporcionado o inválido.' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getProfile(@Req() req: Request) {
    const { companyId } = (req as any).user;
    return this.companyProfileService.getProfile(companyId);
  }

  // ─── PATCH /company-profile ──────────────────────────────────────────────

  @Patch()
  @ApiOperation({
    summary: 'Actualizar perfil de empresa',
    description: 'Actualiza parcialmente los datos del perfil de la empresa. Solo se modifican los campos enviados en el body.',
  })
  @ApiBody({
    type: UpdateCompanyProfileDto,
    description: 'Campos a actualizar (todos opcionales).',
    examples: {
      'actualizar-nombre': {
        summary: 'Actualizar solo el nombre',
        value: { name: 'Mi Empresa Actualizada' },
      },
      'actualizar-varios': {
        summary: 'Actualizar múltiples campos',
        value: {
          name: 'Tech Solutions',
          country: 'CO',
          category: 'sales',
          size: '6-10',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente.', type: CompanyProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de perfil inválidos.' })
  @ApiResponse({ status: 401, description: 'Token no proporcionado o inválido.' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    const { companyId } = (req as any).user;
    await this.companyProfileService.updateProfile(companyId, dto);
    return this.companyProfileService.getProfile(companyId);
  }

  // ─── POST /company-profile/logo/upload-url ───────────────────────────────

  @Post('logo/upload-url')
  @ApiOperation({
    summary: 'Generar presigned URL para subir logo',
    description: 'Genera una presigned URL de S3 para subir el logo de la empresa directamente desde el frontend. Solo acepta image/png e image/jpeg.',
  })
  @ApiBody({
    type: LogoUploadUrlRequestDto,
    description: 'Tipo de contenido y nombre del archivo.',
    examples: {
      'logo-png': {
        summary: 'Logo en formato PNG',
        value: { contentType: 'image/png', fileName: 'logo-empresa.png' },
      },
      'logo-jpeg': {
        summary: 'Logo en formato JPEG',
        value: { contentType: 'image/jpeg', fileName: 'logo.jpg' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Presigned URL generada exitosamente.', type: LogoUploadUrlResponseDto })
  @ApiResponse({ status: 400, description: 'Tipo de contenido no permitido.' })
  @ApiResponse({ status: 401, description: 'Token no proporcionado o inválido.' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error al generar URL de carga.' })
  async generateLogoUploadUrl(
    @Req() req: Request,
    @Body() dto: LogoUploadUrlRequestDto,
  ) {
    const { companyId } = (req as any).user;
    return this.companyProfileService.generateLogoUploadUrl(
      companyId,
      dto.contentType,
      dto.fileName,
    );
  }

  // ─── DELETE /company-profile/logo ────────────────────────────────────────

  @Delete('logo')
  @ApiOperation({
    summary: 'Eliminar logo de la empresa',
    description: 'Elimina el logo actual de la empresa de S3 y establece el campo logo como null en la base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Logo eliminado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Token no proporcionado o inválido.' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async deleteLogo(@Req() req: Request) {
    const { companyId } = (req as any).user;
    await this.companyProfileService.deleteLogo(companyId);
    return { message: 'Logo eliminado' };
  }
}
