import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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
    const { name, startDate, endDate, retentionLimit, bannedTeamIds, status } = body

    // Get existing window
    const existingWindow = await prisma.retention_windows.findUnique({
      where: { id },
    })

    if (!existingWindow) {
      return NextResponse.json({ error: 'Window not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (retentionLimit !== undefined) updateData.retentionLimit = retentionLimit
    if (status !== undefined) updateData.status = status
    if (bannedTeamIds !== undefined) {
      updateData.bannedTeamIds = bannedTeamIds ? JSON.stringify(bannedTeamIds) : null
    }

    // Handle date updates with validation
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : existingWindow.startDate
      const end = endDate ? new Date(endDate) : existingWindow.endDate

      if (start >= end) {
        return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
      }

      // Check for overlapping windows (excluding current window)
      const overlapping = await prisma.retention_windows.findFirst({
        where: {
          seasonId: existingWindow.seasonId,
          id: { not: id },
          OR: [
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: start } },
              ],
            },
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: end } },
              ],
            },
            {
              AND: [
                { startDate: { gte: start } },
                { endDate: { lte: end } },
              ],
            },
          ],
        },
      })

      if (overlapping) {
        return NextResponse.json(
          { error: 'This window overlaps with another retention window' },
          { status: 400 }
        )
      }

      if (startDate) updateData.startDate = start
      if (endDate) updateData.endDate = end
    }

    // Update window
    const window = await prisma.retention_windows.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, window })
  } catch (error: any) {
    console.error('Error updating retention window:', error)
    return NextResponse.json(
      { error: 'Failed to update retention window' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if window has any requests
    const requestCount = await prisma.retention_requests.count({
      where: { retentionWindowId: id },
    })

    if (requestCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete window with ${requestCount} retention request(s)` },
        { status: 400 }
      )
    }

    // Delete window
    await prisma.retention_windows.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting retention window:', error)
    return NextResponse.json(
      { error: 'Failed to delete retention window' },
      { status: 500 }
    )
  }
}
