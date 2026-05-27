import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    // Ensure only SUPER_ADMIN or SUB_ADMIN users can access
    if (!session?.user?.id || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptions = await prisma.push_subscriptions.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      },
      orderBy: {
        lastUsedAt: "desc"
      }
    });

    const parsedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      deviceName: sub.deviceName,
      deviceType: sub.deviceType,
      lastUsedAt: sub.lastUsedAt.toISOString(),
      consentGivenAt: sub.consentGivenAt.toISOString(),
      user: {
        id: sub.user.id,
        email: sub.user.email,
        name: sub.user.name || "N/A"
      }
    }));

    return NextResponse.json({ subscriptions: parsedSubscriptions }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('[API] Fetch Subscribers Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
