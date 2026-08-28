import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 })
    }

    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: status ${res.status}`, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'
    const blob = await res.blob()

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
