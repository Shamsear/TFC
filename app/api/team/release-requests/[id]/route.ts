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
    const releaseRequest = await prisma.release_requests.findUnique({
      where: { id },
    })

    if (!releaseRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Verify ownership
    if (releaseRequest.teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Can only cancel pending requests
    if (releaseRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      )
    }

    // Delete the request
    await prisma.release_requests.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error canceling release request:', error)
    return NextResponse.json(
      { error: 'Failed to cancel release request' },
      { status: 500 }
    )
  }
}
