import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId } = await params
    const body = await request.json()
    const { name, description, startDate, endDate, status } = body

    if (!name || !startDate) {
      return NextResponse.json(
        { error: 'Name and start date are required' },
        { status: 400 }
      )
    }

    // Verify tournament exists and belongs to the season
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId }
    })

    if (!existingTournament || existingTournament.seasonId !== seasonId) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Update tournament
    const updatedTournament = await prisma.tournaments.update({
      where: { id: tournamentId },
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_TOURNAMENT',
      entityType: 'tournament',
      entityId: updatedTournament.id,
      entityName: updatedTournament.name,
      seasonId,
      details: {
        name,
        description,
        startDate,
        endDate,
        status
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(updatedTournament)
  } catch (error: any) {
    console.error('Error updating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to update tournament', details: error.message },
      { status: 500 }
    )
  }
}
