'use client'

import { useCallback, useRef, useState } from 'react'
import { CropModal } from './CropModal'

interface LogoUploaderProps {
  currentLogo: string | null
  isUploading: boolean
  uploadProgress: number
  error: string | null
  onUpload: (file: File) => Promise<boolean>
  onRemove: () => Promise<boolean>
  onClearError: () => void
}

const ACCEPTED_TYPES = 'image/png,image/jpeg'

export function LogoUploader({
  currentLogo,
  isUploading,
  uploadProgress,
  error,
  onUpload,
  onRemove,
  onClearError,
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    // Validate type client-side
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      return
    }
    // Create object URL for the crop modal
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setSelectedFile(file)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      e.target.value = ''
    },
    [handleFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      // Create a File from the cropped blob
      const fileName = selectedFile?.name || 'logo.png'
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/png' })

      onClearError()
      const success = await onUpload(croppedFile)
      if (!success) {
        throw new Error('Upload failed')
      }
    },
    [selectedFile, onUpload, onClearError],
  )

  const handleCropClose = useCallback(() => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
    setSelectedFile(null)
  }, [cropImageSrc])

  const handleRemove = useCallback(async () => {
    onClearError()
    await onRemove()
  }, [onRemove, onClearError])

  return (
    <>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Logo de la empresa
        </label>

        {/* Drop zone / Preview — circular */}
        <div className="flex items-center gap-5">
          <div
            role="button"
            tabIndex={0}
            aria-label="Seleccionar logo de empresa. Arrastra o haz clic para subir."
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={[
              'relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden',
              'border-gray-700 hover:border-[#00bb7a] bg-[#0d1117]/50',
              isUploading ? 'pointer-events-none opacity-70' : '',
            ].join(' ')}
          >
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Logo de la empresa"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <svg
                className="h-8 w-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}

            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <div className="text-center">
                  <div className="text-xs font-medium text-white">{uploadProgress}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleClick}
              disabled={isUploading}
              className="text-sm font-medium text-[#00bb7a] hover:text-[#49df9a] transition-colors disabled:opacity-50"
            >
              {currentLogo ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {currentLogo && !isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Eliminar
              </button>
            )}
            <p className="text-xs text-gray-500">PNG o JPG, máximo 5MB. Se recortará en círculo.</p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Error message */}
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Crop Modal */}
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onClose={handleCropClose}
        />
      )}
    </>
  )
}
