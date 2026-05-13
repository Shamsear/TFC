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
        className="block w-full text-sm text-gray-300 
          file:mr-4 file:py-2 file:px-4 
          file:rounded-lg file:border-0 
          file:text-sm file:font-bold 
          file:bg-gradient-to-r file:from-[#E8A800] file:to-[#FFB347] 
          file:text-[#0a0a0a] 
          hover:file:from-[#FFC93A] hover:file:to-[#FFB347] 
          file:transition-all file:cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer"
        disabled={isUploading}
      />
      {isUploading && (
        <p className="mt-2 text-sm text-[#E8A800] font-medium flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Uploading...
        </p>
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
