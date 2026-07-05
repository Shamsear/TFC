import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params

    const [outgoingLinks, incomingLinks] = await Promise.all([
      prisma.tournament_links.findMany({
        where: { sourceTournamentId: tournamentId },
        include: {
          targetTournament: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tournament_links.findMany({
        where: { targetTournamentId: tournamentId },
        include: {
          sourceTournament: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    return NextResponse.json({
      outgoing: outgoingLinks,
      incoming: incomingLinks
    })
  } catch (error: any) {
    console.error('Error fetching tournament links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournament links', details: error.message },
      { status: 500 }
    )
  }
}
