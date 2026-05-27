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

    const logs = await prisma.push_delivery_log.findMany({
      take: 20,
      orderBy: { sentAt: 'desc' }
    });

    return NextResponse.json({ logs }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('[API] Fetch Logs Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
