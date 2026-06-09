import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerNews } from '@/lib/news/trigger'
import type { NewsEventType } from '@/lib/news/types'

export const maxDuration = 60; // Max allowed for Vercel Hobby plan (Pro users can increase this up to 300)

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId, round, eventType } = await req.json()

    if (!seasonId || !round || !eventType) {
      return NextResponse.json(
        { error: 'Season ID, round, and event type required' },
        { status: 400 }
      )
    }

    if (eventType !== 'matchday_started' && eventType !== 'matchday_completed') {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Get tournament details
    const tournament = tournamentId
      ? await prisma.tournaments.findUnique({
          where: { id: tournamentId },
          include: { season: true },
        })
      : null

    // Get all matches in this round
    const matches = await prisma.matches.findMany({
      where: {
        tournament: { seasonId },
        round,
        ...(tournamentId ? { tournamentId } : {}),
      },
      include: {
        homeTeam: {
          include: { team: true },
        },
        awayTeam: {
          include: { team: true },
        },
        tournament: {
          include: { season: true },
        },
      },
      orderBy: {
        matchDate: 'asc',
      },
    })

    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'No matches found for this round' },
        { status: 404 }
      )
    }

    // Build context based on event type
    let context = ''
    let metadata: Record<string, any> = {
      tournament_name: tournament?.name || matches[0].tournament.name,
      round,
      total_matches: matches.length,
    }

    if (eventType === 'matchday_started') {
      // Matchday Started: Preview of upcoming matches
      const matchupsList = matches
        .map((m) => `${m.homeTeam.team.name} vs ${m.awayTeam.team.name}`)
        .join(', ')

      context = `${round} of ${metadata.tournament_name} is about to begin!\n\n` +
        `${matches.length} exciting matches are scheduled:\n\n` +
        `${matchupsList}\n\n` +
        `Fans are eagerly waiting to see how these matchups unfold.`

      metadata.fixtures = matches.map((m) => ({
        home_team: m.homeTeam.team.name,
        away_team: m.awayTeam.team.name,
        match_date: m.matchDate,
      }))
    } else {
      // Matchday Completed: Recap of results
      const completedMatches = matches.filter(
        (m) => m.status === 'COMPLETED' || m.status === 'WALKOVER'
      )

      if (completedMatches.length === 0) {
        return NextResponse.json(
          { error: 'No completed matches found for this round' },
          { status: 400 }
        )
      }

      const resultsSummary = completedMatches
        .map((m) => {
          const homeScore = m.homeScore || 0
          const awayScore = m.awayScore || 0
          return `${m.homeTeam.team.name} ${homeScore}-${awayScore} ${m.awayTeam.team.name}`
        })
        .join(', ')

      const totalGoals = completedMatches.reduce(
        (sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0),
        0
      )

      context = `${round} Results:\n\n` +
        `${completedMatches.length} matches completed with ${totalGoals} goals scored.\n\n` +
        `Results: ${resultsSummary}\n\n` +
        `This matchday concludes ${round} of ${metadata.tournament_name}.`

      metadata.total_goals = totalGoals
      metadata.results = completedMatches.map((m) => ({
        home_team: m.homeTeam.team.name,
        away_team: m.awayTeam.team.name,
        home_score: m.homeScore || 0,
        away_score: m.awayScore || 0,
      }))
    }

    // Generate news
    console.log(`[News Manager] Generating ${eventType} news for ${round}`)
    await triggerNews(eventType as NewsEventType, {
      season_id: seasonId,
      season_name: tournament?.season.name || matches[0].tournament.season.name,
      metadata,
      context,
    })

    return NextResponse.json({
      success: true,
      message: `${eventType === 'matchday_started' ? 'Matchday Started' : 'Matchday Recap'} news generated successfully`,
    })
  } catch (error: any) {
    console.error('[News Manager] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate matchday news' },
      { status: 500 }
    )
  }
}
