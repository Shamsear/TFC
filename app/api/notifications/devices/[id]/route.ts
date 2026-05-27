import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const device = await prisma.push_subscriptions.findUnique({ where: { id } });
    if (!device || device.userId !== session.user.id) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    await prisma.push_subscriptions.delete({ where: { id } });
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
  }
}
