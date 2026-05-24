import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

    // Get the request
    const releaseRequest = await prisma.release_requests.findUnique({
      where: { id },
    })

    if (!releaseRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (releaseRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Update request status
    await prisma.release_requests.update({
      where: { id },
      data: {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: session.user.id,
        rejectionReason: reason,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rejecting release request:', error)
    return NextResponse.json(
      { error: 'Failed to reject release request' },
      { status: 500 }
    )
  }
}
