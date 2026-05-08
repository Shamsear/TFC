import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logError, extractRequestContext } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const context = extractRequestContext(request)
  
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to continue.' },
        { status: 401 }
      )
    }

    // Get form data
    let formData
    try {
      formData = await request.formData()
    } catch (parseError) {
      logError('Failed to parse form data in upload request', parseError, context)
      return NextResponse.json(
        { error: 'Invalid form data. Please ensure you are uploading a file correctly.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please select a file to upload.' },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed. Please upload a valid image file.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // Get ImageKit credentials
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
    const privateKey = process.env.NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

    if (!publicKey || !privateKey || !urlEndpoint) {
      logError(
        'ImageKit configuration missing',
        new Error('Missing ImageKit environment variables'),
        context
      )
      
      return NextResponse.json(
        { error: 'Image upload service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Convert file to buffer
    let buffer
    try {
      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
    } catch (readError) {
      logError('Failed to read file buffer', readError, { ...context, fileName: file.name })
      return NextResponse.json(
        { error: 'Failed to read file. Please try again.' },
        { status: 400 }
      )
    }

    // Create ImageKit upload request
    const imageKitFormData = new FormData()
    imageKitFormData.append('file', new Blob([buffer]), file.name)
    imageKitFormData.append('fileName', file.name)
    imageKitFormData.append('useUniqueFileName', 'true')
    imageKitFormData.append('folder', '/turf-cats')

    // Upload to ImageKit
    const imageKitResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`
      },
      body: imageKitFormData
    })

    if (!imageKitResponse.ok) {
      const errorData = await imageKitResponse.json().catch(() => ({}))
      logError(
        'ImageKit upload failed',
        new Error(`ImageKit returned status ${imageKitResponse.status}`),
        { ...context, imageKitError: errorData }
      )
      
      return NextResponse.json(
        { error: 'Image upload failed. Please try again later.' },
        { status: imageKitResponse.status }
      )
    }

    const imageKitData = await imageKitResponse.json()

    return NextResponse.json({
      url: imageKitData.url,
      fileId: imageKitData.fileId,
      name: imageKitData.name
    })

  } catch (error) {
    logError('Upload process failed', error, context)
    
    return NextResponse.json(
      { 
        error: 'Upload failed. Please try again later.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : undefined
      },
      { status: 500 }
    )
  }
}
