'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import type { UploadZoneProps } from '../types';

/**
 * Zona de carga con drag & drop y selector de archivos.
 * Feedback visual durante drag, progreso de upload y errores inline.
 */
export function KnowledgeUploadZone({ onUpload, progress, isUploading, error }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset input para permitir re-selección del mismo archivo
    e.target.value = '';
  }, [onUpload]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir archivo. Arrastra un archivo aquí o haz clic para seleccionar."
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragOver
            ? 'border-[#42e5a1] bg-[#42e5a1]/5'
            : 'border-[#262626] hover:border-[#42e5a1]/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <Upload size={24} className="text-[#888888]" aria-hidden="true" />

        {isUploading ? (
          <div className="w-full max-w-xs">
            <div className="mb-1 text-center text-xs text-[#888888]">
              Subiendo... {progress}%
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#262626]">
              <div
                className="h-full rounded-full bg-[#42e5a1] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#888888]">
              Arrastra un archivo aquí o{' '}
              <span className="font-medium text-[#42e5a1]">selecciona</span>
            </p>
            <p className="font-mono text-xs text-[#555]">
              PDF, TXT, MD — máx. 10 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-[#EF4444]" role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />
    </div>
  );
}
