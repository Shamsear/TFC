import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const body = await request.json()
    const { open } = body

    // Update season
    await prisma.seasons.update({
      where: { id: seasonId },
      data: { swapWindowOpen: open },
    })

    return NextResponse.json({ success: true, swapWindowOpen: open })
  } catch (error: any) {
    console.error('Error toggling swap window:', error)
    return NextResponse.json(
      { error: 'Failed to toggle swap window' },
      { status: 500 }
    )
  }
}
