import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const logId = searchParams.get('id')
  const redirectUrl = searchParams.get('url') || '/team'

  if (logId) {
    // Record that this specific notification was clicked
    await prisma.push_delivery_log.update({
      where: { id: logId },
      data: { status: 'CLICKED' }
    }).catch(() => {});
  }

  // Set no-cache to avoid SW caching route
  return NextResponse.redirect(new URL(redirectUrl, req.url), {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}
