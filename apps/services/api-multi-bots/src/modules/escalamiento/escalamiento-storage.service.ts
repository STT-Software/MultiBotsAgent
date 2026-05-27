import { Injectable, Inject, Logger } from '@nestjs/common';
import type { S3StorageService } from '@multibotagents/db';
import { randomUUID } from 'crypto';

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

@Injectable()
export class EscalamientoStorageService {
  private readonly logger = new Logger(EscalamientoStorageService.name);

  constructor(
    @Inject('ESCALAMIENTO_STORAGE') private readonly storageService: S3StorageService,
  ) {
    this.logger.log('EscalamientoStorageService initialized');
  }

  async generateUploadUrl(
    companyId: string,
    conversationId: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadUrlResult> {
    const uuid = randomUUID();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `escalamiento/${companyId}/${conversationId}/${uuid}-${sanitizedFileName}`;

    const uploadUrl = await this.storageService.generatePresignedUploadUrl(key, contentType);
    const publicUrl = this.storageService.getPublicUrl(key);

    return { uploadUrl, fileKey: key, publicUrl };
  }
}
