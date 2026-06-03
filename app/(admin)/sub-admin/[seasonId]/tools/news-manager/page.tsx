import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import NewsManagerClient from '@/components/admin/NewsManagerClient'

export const dynamic = 'force-dynamic'

interface NewsManagerPageProps {
  params: Promise<{ seasonId: string }>
}

export default async function NewsManagerPage({ params }: NewsManagerPageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUB_ADMIN') {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Get recent matches that might need news
  const recentMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId,
      },
      status: 'COMPLETED',
    },
    include: {
      homeTeam: {
        include: {
          team: true,
        },
      },
      awayTeam: {
        include: {
          team: true,
        },
      },
      tournament: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      matchDate: 'desc',
    },
    take: 50,
  })

  // Get existing news articles
  const existingNews = await prisma.news.findMany({
    where: {
      season_id: seasonId,
      event_type: {
        in: [
          // Standard match events
          'match_completed',
          'match_walkover',
          'matchday_opener',
          // Match quality/outcome scenarios
          'thrashing',
          'close_match',
          'boring_draw',
          'high_scoring',
          'comeback_victory',
          'clean_sheet',
          'penalty_shootout',
          'dominant_win',
          'thriller',
          'goal_fest',
          'entertaining_draw',
          'draw',
          // Advanced match scenarios
          'clean_sheet_master',
          'unbeaten_streak',
          'losing_streak',
          'goal_fest_h2h',
          'manager_first_match',
          'perfect_start',
          'winless_drought_ends',
          'top_of_table_takeover',
          'mid_table_mediocrity',
          'basement_battle',
          'giant_slayer',
          'century_of_goals',
          'defensive_nightmare',
          'goal_drought_ends',
          // Title race scenarios
          'title_race_heating',
          'title_secured',
          'must_win_title',
          'title_dream_over',
          'final_day_drama',
          'manager_quote_special',
        ]
      }
    },
    select: {
      id: true,
      metadata: true,
      event_type: true,
      created_at: true,
    },
  })
  
  console.log(`📊 Total match news articles fetched: ${existingNews.length}`)

  // Check which matches have news
  const matchesWithStatus = recentMatches.map((match) => {
    const hasNews = existingNews.some((news) => {
      const metadata = news.metadata as any
      
      // First, try to match by match_id
      if (metadata?.match_id === match.id || metadata?.matchId === match.id) {
        return true
      }
      
      // Fallback: Match by teams and scores
      // Trim team names to handle whitespace issues
      const matchHomeTeam = match.homeTeam.team.name.trim()
      const matchAwayTeam = match.awayTeam.team.name.trim()
      const metadataHomeTeam = metadata?.home_team?.trim()
      const metadataAwayTeam = metadata?.away_team?.trim()
      
      // Be flexible with team name matching (could be home/away swapped in metadata)
      const teamsMatch = (
        (metadataHomeTeam === matchHomeTeam && metadataAwayTeam === matchAwayTeam) ||
        (metadataHomeTeam === matchAwayTeam && metadataAwayTeam === matchHomeTeam)
      )
      
      if (!teamsMatch) return false
      
      // If teams match, check if scores match (accounting for potential swap)
      const homeScoreNum = Number(metadata?.home_score)
      const awayScoreNum = Number(metadata?.away_score)
      const matchHomeScore = Number(match.homeScore)
      const matchAwayScore = Number(match.awayScore)
      
      // Check for NaN
      if (isNaN(homeScoreNum) || isNaN(awayScoreNum) || isNaN(matchHomeScore) || isNaN(matchAwayScore)) {
        return false
      }
      
      let scoresMatch = false
      if (metadataHomeTeam === matchHomeTeam) {
        // Normal order
        scoresMatch = homeScoreNum === matchHomeScore && awayScoreNum === matchAwayScore
      } else {
        // Swapped order
        scoresMatch = homeScoreNum === matchAwayScore && awayScoreNum === matchHomeScore
      }
      
      return scoresMatch
    })
    
    return {
      id: match.id,
      homeTeam: match.homeTeam.team.name,
      awayTeam: match.awayTeam.team.name,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      matchDate: match.matchDate.toISOString(), // Convert to ISO string for consistent serialization
      tournament: match.tournament.name,
      round: match.round,
      hasNews,
    }
  })

  // Get first tournament ID for matchday news generation (assuming single tournament per season typically)
  const firstTournament = recentMatches[0]?.tournamentId

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              News Manager
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Check and manually trigger news generation for completed matches and matchdays
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <NewsManagerClient 
          matches={matchesWithStatus} 
          seasonId={seasonId}
          tournamentId={firstTournament}
        />
      </div>
    </div>
  )
}
