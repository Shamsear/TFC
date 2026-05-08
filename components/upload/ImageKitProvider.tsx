'use client'

import { IKContext } from 'imagekitio-react'
import { ReactNode } from 'react'

interface ImageKitProviderProps {
  children: ReactNode
}

/**
 * ImageKit context provider for client-side uploads
 * Wraps components that use ImageKitUpload
 */
export function ImageKitProvider({ children }: ImageKitProviderProps) {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || ''
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ''

  const authenticator = async () => {
    try {
      const response = await fetch('/api/imagekit-auth')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to authenticate')
      }

      const data = await response.json()
      const { signature, expire, token } = data
      return { signature, expire, token }
    } catch (error) {
      throw new Error(`Authentication request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <IKContext
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      {children}
    </IKContext>
  )
}
