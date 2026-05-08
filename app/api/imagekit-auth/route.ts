import { NextRequest, NextResponse } from 'next/server'
import { getServerImageKit } from '@/lib/imagekit'
import { logError, extractRequestContext } from '@/lib/logger'

/**
 * ImageKit authentication endpoint
 * Returns authentication parameters required for client-side uploads
 * 
 * Requirements: 15.1
 */
export async function GET(request: NextRequest) {
  const context = extractRequestContext(request)
  
  try {
    // Check if ImageKit is configured
    if (!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || 
        !process.env.IMAGEKIT_PRIVATE_KEY || 
        !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
      logError(
        'ImageKit configuration missing',
        new Error('Missing ImageKit environment variables'),
        context
      )
      
      return NextResponse.json(
        { error: 'Image service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const imagekit = getServerImageKit()
    
    if (!imagekit) {
      logError(
        'ImageKit client not initialized',
        new Error('ImageKit configuration missing'),
        context
      )
      
      return NextResponse.json(
        { error: 'Image service is not configured. Please contact support.' },
        { status: 500 }
      )
    }
    
    // Generate authentication parameters
    const authParams = imagekit.getAuthenticationParameters()
    
    return NextResponse.json(authParams, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (error) {
    logError('Failed to generate ImageKit authentication parameters', error, context)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate authentication parameters. Please try again later.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : undefined
      },
      { status: 500 }
    )
  }
}

// Export dynamic to prevent static generation during build
export const dynamic = 'force-dynamic'
