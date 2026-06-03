import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerNews } from '@/lib/news/trigger'
import type { NewsEventType } from '@/lib/news/types'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await req.json()

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
    }

    // Get match details
    const match = await prisma.matches.findUnique({
      where: { id: matchId },
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
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Match must be completed to generate news' },
        { status: 400 }
      )
    }

    // Check if news already exists
    const existingNews = await prisma.news.findFirst({
      where: {
        matchId: match.id,
      },
    })

    if (existingNews) {
      // Delete existing news to regenerate
      await prisma.news.delete({
        where: { id: existingNews.id },
      })
    }

    // Generate news
    console.log(`[News Manager] Generating news for match ${matchId}`)
    
    // Determine event type based on match outcome
    const homeScore = match.homeScore || 0
    const awayScore = match.awayScore || 0
    const scoreDiff = Math.abs(homeScore - awayScore)
    
    let eventType: NewsEventType = 'match_completed'
    
    if (scoreDiff >= 5) {
      eventType = 'thrashing'
    } else if (scoreDiff === 0) {
      if (homeScore === 0 && awayScore === 0) {
        eventType = 'boring_draw'
      } else if (homeScore + awayScore >= 4) {
        eventType = 'entertaining_draw'
      } else {
        eventType = 'draw'
      }
    } else if (scoreDiff === 1 && homeScore + awayScore >= 5) {
      eventType = 'close_match'
    } else if (homeScore + awayScore >= 6) {
      eventType = 'high_scoring'
    }
    
    // Get clean manager names
    const getCleanManagerName = (name: string) => {
      return name.replace(/^(TM|Mr\.?|Manager)\s+/i, '').trim()
    }
    
    await triggerNews(eventType, {
      season_id: match.tournament.seasonId,
      season_name: match.tournament.season.name,
      metadata: {
        match_id: match.id,
        home_team: match.homeTeam.team.name,
        away_team: match.awayTeam.team.name,
        home_manager: getCleanManagerName(match.homeTeam.managerName),
        away_manager: getCleanManagerName(match.awayTeam.managerName),
        home_score: homeScore,
        away_score: awayScore,
        winner: homeScore > awayScore ? match.homeTeam.team.name : match.awayTeam.team.name,
        goal_diff: scoreDiff,
        tournament_name: match.tournament.name,
        round: match.round,
        venue: match.venue || 'Stadium',
        has_penalties: match.homePenalty !== null && match.awayPenalty !== null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'News generated successfully',
    })
  } catch (error: any) {
    console.error('[News Manager] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate news' },
      { status: 500 }
    )
  }
}
