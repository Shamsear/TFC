import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { autoStartDueTournamentRounds } from '@/lib/tournaments/auto-start-rounds'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId } = await params
    const results = await autoStartDueTournamentRounds(tournamentId, seasonId)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error: any) {
    console.error('Error in auto-start route:', error)
    return NextResponse.json({ error: 'Failed to auto-start rounds' }, { status: 500 })
  }
}
