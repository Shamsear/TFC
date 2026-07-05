import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { checkCircularDependency } from '@/lib/tournament-linking'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check roles
    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sourceTournamentId, targetTournamentId, linkType, qualificationConfig } = body

    if (!sourceTournamentId || !targetTournamentId || !linkType || !qualificationConfig) {
      return NextResponse.json(
        { error: 'sourceTournamentId, targetTournamentId, linkType, and qualificationConfig are required' },
        { status: 400 }
      )
    }

    // Prevent linking tournament to itself
    if (sourceTournamentId === targetTournamentId) {
      return NextResponse.json(
        { error: 'Source and target tournaments cannot be the same' },
        { status: 400 }
      )
    }

    // Check for circular dependency
    const isCircular = await checkCircularDependency(sourceTournamentId, targetTournamentId)
    if (isCircular) {
      return NextResponse.json(
        { error: 'Creating this link would cause a circular dependency between tournaments' },
        { status: 400 }
      )
    }

    // Check if link already exists
    const existingLink = await prisma.tournament_links.findUnique({
      where: {
        sourceTournamentId_targetTournamentId: {
          sourceTournamentId,
          targetTournamentId
        }
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'A link already exists between these two tournaments' },
        { status: 400 }
      )
    }

    // Check if source and target tournaments exist
    const tournaments = await prisma.tournaments.findMany({
      where: { id: { in: [sourceTournamentId, targetTournamentId] } }
    })

    if (tournaments.length < 2) {
      return NextResponse.json(
        { error: 'Source or target tournament not found' },
        { status: 404 }
      )
    }

    // Create the link
    const link = await prisma.tournament_links.create({
      data: {
        id: crypto.randomUUID(),
        sourceTournamentId,
        targetTournamentId,
        linkType,
        qualificationConfig,
        status: 'ACTIVE' // Starts as active since tournaments are set up
      },
      include: {
        sourceTournament: true,
        targetTournament: true
      }
    })

    // Update tournaments linked flags
    await prisma.tournaments.update({
      where: { id: sourceTournamentId },
      data: { isLinked: true }
    })

    await prisma.tournaments.update({
      where: { id: targetTournamentId },
      data: { requiresQualification: true, qualificationStatus: 'PENDING' }
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tournament link:', error)
    return NextResponse.json(
      { error: 'Failed to create tournament link', details: error.message },
      { status: 500 }
    )
  }
}
