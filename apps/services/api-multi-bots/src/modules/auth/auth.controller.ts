import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RegisterDto } from '@multibotagents/types';
import {
  ValidationError,
  CaptchaError,
  DuplicateEmailError,
  ConcurrencyConflictError,
} from '@multibotagents/types';
import { RegisterNestService } from './register.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly registerService: RegisterNestService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.registerService.register(dto);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: 604800000, // 7 days in ms
      });

      res.status(HttpStatus.CREATED);

      return {
        accessToken: result.accessToken,
        user: result.user,
        company: result.company,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(HttpStatus.BAD_REQUEST);
        return { error: error.message, fields: error.fields };
      }

      if (error instanceof CaptchaError) {
        res.status(HttpStatus.FORBIDDEN);
        return { error: error.message };
      }

      if (error instanceof DuplicateEmailError) {
        res.status(HttpStatus.CONFLICT);
        return { error: error.message };
      }

      if (error instanceof ConcurrencyConflictError) {
        res.status(HttpStatus.CONFLICT);
        return { error: error.message };
      }

      this.logger.error('Unexpected error during registration', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return { error: 'Error interno del servidor' };
    }
  }
}
