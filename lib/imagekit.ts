import ImageKit from 'imagekit-javascript'

// ImageKit client configuration for browser-side uploads
// Note: authenticationEndpoint is handled separately via fetch
// Lazy initialization to avoid errors during build
let imagekitInstance: ImageKit | null = null

export function getImageKit() {
  if (!imagekitInstance && typeof window !== 'undefined') {
    imagekitInstance = new ImageKit({
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!
    })
  }
  return imagekitInstance
}

// Server-side ImageKit configuration (for auth endpoint)
export function getServerImageKit() {
  // Return null if environment variables are not set (e.g., during build)
  if (!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || 
      !process.env.IMAGEKIT_PRIVATE_KEY || 
      !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
    return null
  }

  const ImageKitServer = require('imagekit')
  
  return new ImageKitServer({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!
  })
}
