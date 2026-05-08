'use client'

import { IKUpload } from 'imagekitio-react'
import { useState } from 'react'
import { ImageKitProvider } from './ImageKitProvider'

interface ImageKitUploadProps {
  onSuccess: (url: string) => void
  onError: (error: Error) => void
  folder?: string
  fileName?: string
  accept?: string
  className?: string
}

function ImageKitUploadInner({
  onSuccess,
  onError,
  folder = '/turf-cats',
  fileName,
  accept = 'image/*',
  className = ''
}: ImageKitUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleSuccess = (res: any) => {
    setIsUploading(false)
    onSuccess(res.url)
  }

  const handleError = (err: any) => {
    setIsUploading(false)
    onError(new Error(err.message || 'Upload failed'))
  }

  const handleUploadStart = () => {
    setIsUploading(true)
  }

  return (
    <div className={className}>
      <IKUpload
        fileName={fileName || `upload-${Date.now()}`}
        onError={handleError}
        onSuccess={handleSuccess}
        onUploadStart={handleUploadStart}
        useUniqueFileName={true}
        folder={folder}
        accept={accept}
        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-500 file:text-black hover:file:bg-neon-400 disabled:opacity-50"
        disabled={isUploading}
      />
      {isUploading && (
        <p className="mt-2 text-sm text-gray-400">Uploading...</p>
      )}
    </div>
  )
}

/**
 * ImageKit upload component with built-in provider
 * Handles image uploads to ImageKit with success/error callbacks
 * 
 * Requirements: 15.1, 15.2, 15.4
 */
export function ImageKitUpload(props: ImageKitUploadProps) {
  return (
    <ImageKitProvider>
      <ImageKitUploadInner {...props} />
    </ImageKitProvider>
  )
}
