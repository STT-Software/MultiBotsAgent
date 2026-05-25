'use client';

import { useState, useCallback } from 'react';
import { uploadFile } from '../services';
import { SUPPORTED_FORMATS, MAX_FILE_SIZE_BYTES } from '../types';

interface UseFileUploadReturn {
  upload: (file: File) => Promise<void>;
  progress: number;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook para gestión de upload de archivos con validación cliente y progreso.
 */
export function useFileUpload(
  agentId: string,
  onSuccess: () => Promise<void>,
): UseFileUploadReturn {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setProgress(0);

    // Validación de formato
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension as typeof SUPPORTED_FORMATS[number])) {
      setError(`Formato no soportado. Los formatos válidos son: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }

    // Validación de tamaño
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('El archivo excede el tamaño máximo permitido de 10 MB.');
      return;
    }

    setIsUploading(true);

    try {
      await uploadFile(agentId, file, undefined, (percent) => {
        setProgress(percent);
      });
      setProgress(100);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo');
    } finally {
      setIsUploading(false);
    }
  }, [agentId, onSuccess]);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  return { upload, progress, isUploading, error, reset };
}
