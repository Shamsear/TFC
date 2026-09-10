import { NextRequest, NextResponse } from 'next/server'
import { autoStartDueTournamentRounds } from '@/lib/tournaments/auto-start-rounds'

export const dynamic = 'force-dynamic'

async function handleCron(request: NextRequest) {
  try {
    // Check CRON_SECRET if configured
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const results = await autoStartDueTournamentRounds()
    const started = results.filter(r => r.status === 'started')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      roundsChecked: results.length,
      roundsStarted: started.length,
      details: results
    })
  } catch (error: any) {
    console.error('[Cron] Error running start-rounds cron:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}
