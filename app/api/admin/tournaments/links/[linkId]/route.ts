import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { clearPopulatedTeams } from '@/lib/tournament-linking'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { linkId } = await params
    const body = await request.json()
    const { qualificationConfig, linkType, sourceTournamentId, targetTournamentId } = body

    if (!qualificationConfig) {
      return NextResponse.json(
        { error: 'qualificationConfig is required' },
        { status: 400 }
      )
    }

    const link = await prisma.tournament_links.findUnique({
      where: { id: linkId }
    })

    if (!link) {
      return NextResponse.json({ error: 'Tournament link not found' }, { status: 404 })
    }

    const sourceChanged = sourceTournamentId && sourceTournamentId !== link.sourceTournamentId
    const targetChanged = targetTournamentId && targetTournamentId !== link.targetTournamentId

    if (sourceChanged || targetChanged) {
      // Clear populated teams from target tournament
      await clearPopulatedTeams(linkId).catch(err => {
        console.warn(`Could not clear teams for link ${linkId} during update:`, err)
      })
    }

    const updatedLink = await prisma.tournament_links.update({
      where: { id: linkId },
      data: {
        ...(linkType ? { linkType } : {}),
        ...(sourceTournamentId ? { sourceTournamentId } : {}),
        ...(targetTournamentId ? { targetTournamentId } : {}),
        qualificationConfig,
        updatedAt: new Date()
      }
    })

    if (sourceChanged || targetChanged) {
      // Recalculate isLinked for source tournaments
      for (const sId of [link.sourceTournamentId, sourceTournamentId || link.sourceTournamentId]) {
        const count = await prisma.tournament_links.count({
          where: { sourceTournamentId: sId }
        })
        await prisma.tournaments.update({
          where: { id: sId },
          data: { isLinked: count > 0 }
        })
      }

      // Recalculate requiresQualification for target tournaments
      for (const tId of [link.targetTournamentId, targetTournamentId || link.targetTournamentId]) {
        const count = await prisma.tournament_links.count({
          where: { targetTournamentId: tId }
        })
        await prisma.tournaments.update({
          where: { id: tId },
          data: {
            requiresQualification: count > 0,
            ...(count === 0 ? { qualificationStatus: 'COMPLETE' } : {})
          }
        })
      }
    }

    return NextResponse.json(updatedLink)
  } catch (error: any) {
    console.error('Error updating tournament link:', error)
    return NextResponse.json(
      { error: 'Failed to update tournament link', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { linkId } = await params

    // Fetch link details before deletion to update tournaments flags
    const link = await prisma.tournament_links.findUnique({
      where: { id: linkId }
    })

    if (!link) {
      return NextResponse.json({ error: 'Tournament link not found' }, { status: 404 })
    }

    // 1. Clear populated teams from target tournament
    await clearPopulatedTeams(linkId).catch(err => {
      console.warn(`Could not clear teams for link ${linkId} during delete:`, err)
    })

    const sourceTournamentId = link.sourceTournamentId
    const targetTournamentId = link.targetTournamentId

    // 2. Delete link (this cascades to qualifications in DB)
    await prisma.tournament_links.delete({
      where: { id: linkId }
    })

    // 3. Recalculate isLinked on source tournament
    const sourceLinksCount = await prisma.tournament_links.count({
      where: { sourceTournamentId }
    })
    await prisma.tournaments.update({
      where: { id: sourceTournamentId },
      data: { isLinked: sourceLinksCount > 0 }
    })

    // 4. Recalculate requiresQualification on target tournament
    const targetLinksCount = await prisma.tournament_links.count({
      where: { targetTournamentId }
    })
    await prisma.tournaments.update({
      where: { id: targetTournamentId },
      data: {
        requiresQualification: targetLinksCount > 0,
        ...(targetLinksCount === 0 ? { qualificationStatus: 'COMPLETE' } : {})
      }
    })

    return NextResponse.json({ success: true, message: 'Tournament link deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting tournament link:', error)
    return NextResponse.json(
      { error: 'Failed to delete tournament link', details: error.message },
      { status: 500 }
    )
  }
}
