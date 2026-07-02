'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface CropModalProps {
  /** URL de la imagen a recortar (object URL). */
  imageSrc: string
  /** Callback cuando el usuario confirma el crop. */
  onCropComplete: (croppedBlob: Blob) => Promise<void>
  /** Callback para cerrar el modal sin guardar. */
  onClose: () => void
}

/**
 * Modal de recorte circular para el logo de empresa.
 * Usa react-easy-crop con forma circular y aspect ratio 1:1.
 */
export function CropModal({ imageSrc, onCropComplete, onClose }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)

    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels)
      await onCropComplete(blob)
      onClose()
    } catch {
      // Si falla el crop o la subida, cerrar el modal
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar logo"
    >
      <div className="relative w-full max-w-md rounded-xl border border-[#3c4a41] bg-[#1a2420] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#dde5dc]">Recortar logo</h2>
          <button
            onClick={onClose}
            className="text-[#bbcabe] hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-[#bbcabe]">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#00bb7a]"
            aria-label="Zoom"
          />
          <span className="text-xs text-[#bbcabe]">+</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#3c4a41] px-4 py-2.5 text-sm font-medium text-[#dde5dc] transition-colors hover:bg-[#2f3731]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 rounded-lg bg-[#00bb7a] px-4 py-2.5 text-sm font-semibold text-[#004329] transition-colors hover:bg-[#49df9a] disabled:opacity-50"
          >
            {isProcessing ? 'Procesando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Recorta una imagen y retorna un Blob con el resultado.
 * Usa Canvas API para hacer el crop en el navegador.
 */
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Canvas context not available')

  // Output size: 256x256 (good quality for logos)
  const outputSize = 256
  canvas.width = outputSize
  canvas.height = outputSize

  // Draw cropped area scaled to output size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/png',
      0.95,
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (err) => reject(err))
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}
