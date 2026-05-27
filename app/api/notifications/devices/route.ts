import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const devices = await prisma.push_subscriptions.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, deviceName: true, deviceType: true, lastUsedAt: true, endpoint: true },
    orderBy: { lastUsedAt: 'desc' }
  })
  return NextResponse.json({ devices }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
