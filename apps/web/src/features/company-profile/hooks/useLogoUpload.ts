'use client';

import { useCallback, useRef, useState } from 'react';
import {
  getLogoUploadUrl,
  uploadLogoToS3,
  deleteLogo as deleteLogoService,
  updateProfile,
} from '../services';
import type { ServiceError } from '../services/companyProfile.service';
import type { CompanyProfileResponse } from '@multibotagents/types';

const ALLOWED_TYPES = ['image/png', 'image/jpeg'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UseLogoUploadOptions {
  onProfileUpdate: (profile: CompanyProfileResponse) => void;
}

interface UseLogoUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  upload: (file: File) => Promise<boolean>;
  removeLogo: () => Promise<boolean>;
  clearError: () => void;
}

export function useLogoUpload({ onProfileUpdate }: UseLogoUploadOptions): UseLogoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
      return 'Solo se permiten archivos PNG o JPG.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo no puede superar los 5MB.';
    }
    return null;
  };

  const upload = useCallback(async (file: File): Promise<boolean> => {
    setError(null);
    setUploadProgress(0);

    // Client-side validation
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Get presigned URL
      const contentType = file.type as 'image/png' | 'image/jpeg';
      const { uploadUrl, logoUrl } = await getLogoUploadUrl(contentType, file.name);

      if (abortRef.current) return false;
      setUploadProgress(30);

      // Step 2: Upload to S3
      await uploadLogoToS3(uploadUrl, file);

      if (abortRef.current) return false;
      setUploadProgress(70);

      // Step 3: Update profile with logo URL
      const updated = await updateProfile({ logo: logoUrl });

      if (abortRef.current) return false;
      setUploadProgress(100);
      onProfileUpdate(updated);

      return true;
    } catch (err: unknown) {
      if (abortRef.current) return false;
      const serviceErr = err as ServiceError;
      setError(serviceErr.message || 'Error al subir el logo. Intenta nuevamente.');
      return false;
    } finally {
      if (!abortRef.current) {
        setIsUploading(false);
      }
    }
  }, [onProfileUpdate]);

  const removeLogo = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsUploading(true);

    try {
      await deleteLogoService();

      if (abortRef.current) return false;
      onProfileUpdate({ logo: null } as unknown as CompanyProfileResponse);

      return true;
    } catch (err: unknown) {
      if (abortRef.current) return false;
      const serviceErr = err as ServiceError;
      setError(serviceErr.message || 'Error al eliminar el logo.');
      return false;
    } finally {
      if (!abortRef.current) {
        setIsUploading(false);
      }
    }
  }, [onProfileUpdate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    upload,
    removeLogo,
    clearError,
  };
}
