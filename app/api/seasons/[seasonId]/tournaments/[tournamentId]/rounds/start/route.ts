import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { startTournamentRound } from '@/lib/tournaments/auto-start-rounds'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow sub-admins and super-admins
    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tournamentId } = await params
    const body = await request.json()
    const { round, deadline } = body

    if (!round || !deadline) {
      return NextResponse.json({ error: 'Round name and deadline are required' }, { status: 400 })
    }

    const parsedDeadline = new Date(deadline)
    if (isNaN(parsedDeadline.getTime())) {
      return NextResponse.json({ error: 'Invalid deadline date format' }, { status: 400 })
    }

    const result = await startTournamentRound({
      tournamentId,
      round,
      deadline: parsedDeadline
    })

    if (result.status === 'error') {
      return NextResponse.json({ error: result.error || 'Failed to start round' }, { status: 500 })
    }

    if (result.status === 'no_matches') {
      return NextResponse.json({ error: 'No matches found for this round' }, { status: 404 })
    }

    return NextResponse.json({ success: true, updatedMatches: result.matchesCount })
  } catch (error: any) {
    console.error('Error starting round:', error)
    return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
  }
}
