import { prisma } from '@/lib/prisma'
import TournamentsClient from '@/components/tournaments/TournamentsClient'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getTournamentsData() {
  try {
    // Get all seasons sorted with active first, then newest
    const seasons = await prisma.seasons.findMany({
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Get all tournaments with season reference and match count
    const tournaments = await prisma.tournaments.findMany({
      include: {
        season: true,
        _count: {
          select: { matches: true }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Get match statistics for all tournaments
    const [completedMatches, liveMatches] = await Promise.all([
      prisma.matches.groupBy({
        by: ['tournamentId'],
        where: { status: 'COMPLETED' },
        _count: { _all: true }
      }),
      prisma.matches.groupBy({
        by: ['tournamentId'],
        where: { status: 'LIVE' },
        _count: { _all: true }
      })
    ])

    const completedMap = new Map(completedMatches.map(m => [m.tournamentId, m._count._all]))
    const liveMap = new Map(liveMatches.map(m => [m.tournamentId, m._count._all]))

    const tournamentsWithStats = tournaments.map(tournament => {
      return {
        ...tournament,
        completedMatches: completedMap.get(tournament.id) || 0,
        liveMatches: liveMap.get(tournament.id) || 0
      }
    })

    // Calculate overall stats
    const totalMatches = tournaments.reduce((sum, t) => sum + t._count.matches, 0)
    const totalCompleted = tournamentsWithStats.reduce((sum, t) => sum + t.completedMatches, 0)

    const overallStats = {
      totalTournaments: tournaments.length,
      totalMatches,
      completedMatches: totalCompleted
    }

    // Calculate season-specific stats
    const seasonStats: Record<string, { totalTournaments: number; totalMatches: number; completedMatches: number }> = {}
    for (const season of seasons) {
      const seasonTourneys = tournamentsWithStats.filter(t => t.seasonId === season.id)
      const sMatches = seasonTourneys.reduce((sum, t) => sum + t._count.matches, 0)
      const sCompleted = seasonTourneys.reduce((sum, t) => sum + t.completedMatches, 0)
      
      seasonStats[season.id] = {
        totalTournaments: seasonTourneys.length,
        totalMatches: sMatches,
        completedMatches: sCompleted
      }
    }

    return {
      seasons: JSON.parse(JSON.stringify(seasons)),
      tournaments: JSON.parse(JSON.stringify(tournamentsWithStats)),
      overallStats,
      seasonStats
    }
  } catch (error) {
    console.error('Error fetching tournaments data:', error)
    return {
      seasons: [],
      tournaments: [],
      overallStats: { totalTournaments: 0, totalMatches: 0, completedMatches: 0 },
      seasonStats: {}
    }
  }
}

export default async function TournamentsPage() {
  const data = await getTournamentsData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <TournamentsClient
            seasons={data.seasons}
            tournaments={data.tournaments}
            overallStats={data.overallStats}
            seasonStats={data.seasonStats}
          />
        </div>
      </main>
    </div>
  )
}
