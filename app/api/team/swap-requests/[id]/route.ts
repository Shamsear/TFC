import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the request
    const swapRequest = await prisma.swap_requests.findUnique({
      where: { id },
    })

    if (!swapRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Either requesting or target team can cancel
    if (swapRequest.requestingTeamId !== session.user.teamId && swapRequest.targetTeamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Not authorized to cancel this request' }, { status: 403 })
    }

    // Can only cancel pending requests
    if (swapRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      )
    }

    // Delete the request (cascade will delete players)
    await prisma.swap_requests.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error canceling swap request:', error)
    return NextResponse.json(
      { error: 'Failed to cancel swap request' },
      { status: 500 }
    )
  }
}
