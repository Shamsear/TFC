import { prisma } from '@/lib/prisma'
import TeamsClient from '@/components/teams/TeamsClient'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getTeamsData() {
  try {
    // Get all seasons
    const seasons = await prisma.seasons.findMany({
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Get all teams with their overall data
    const allTeams = await prisma.teams.findMany({
      include: {
        seasonTeams: {
          include: {
            season: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calculate overall stats for each team
    const overallTeams = await Promise.all(
      allTeams.map(async (team) => {
        const totalPlayers = await prisma.transfer_history.count({
          where: { teamId: team.id, status: 'ACTIVE' }
        })

        const spentData = await prisma.transfer_history.aggregate({
          where: { teamId: team.id, status: 'ACTIVE' },
          _sum: { soldPrice: true }
        })

        const homeWins = await prisma.matches.count({
          where: {
            homeTeam: { teamId: team.id },
            status: 'COMPLETED',
            homeScore: { gt: prisma.matches.fields.awayScore }
          }
        })

        const awayWins = await prisma.matches.count({
          where: {
            awayTeam: { teamId: team.id },
            status: 'COMPLETED',
            awayScore: { gt: prisma.matches.fields.homeScore }
          }
        })

        const activeSeasonTeam = team.seasonTeams.find(st => st.season.isActive)

        return {
          id: team.id,
          name: team.name,
          managerName: team.managerName,
          logoUrl: team.logoUrl,
          totalPlayers,
          totalSpent: spentData._sum.soldPrice || 0,
          totalWins: homeWins + awayWins,
          currentBudget: activeSeasonTeam?.currentBudget || 0,
          seasonsCount: team.seasonTeams.length
        }
      })
    )

    // Calculate season-specific stats
    const seasonTeams: Record<string, any[]> = {}
    const seasonStats: Record<string, any> = {}

    for (const season of seasons) {
      const seasonTeamData = await prisma.season_teams.findMany({
        where: { seasonId: season.id },
        include: { team: true }
      })

      const teamsWithStats = await Promise.all(
        seasonTeamData.map(async (st) => {
          const playerCount = await prisma.transfer_history.count({
            where: { seasonId: season.id, teamId: st.teamId, status: 'ACTIVE' }
          })

          const spentData = await prisma.transfer_history.aggregate({
            where: { seasonId: season.id, teamId: st.teamId, status: 'ACTIVE' },
            _sum: { soldPrice: true }
          })

          const homeWins = await prisma.matches.count({
            where: {
              homeTeamId: st.id,
              status: 'COMPLETED',
              homeScore: { gt: prisma.matches.fields.awayScore }
            }
          })

          const awayWins = await prisma.matches.count({
            where: {
              awayTeamId: st.id,
              status: 'COMPLETED',
              awayScore: { gt: prisma.matches.fields.homeScore }
            }
          })

          return {
            id: st.team.id,
            name: st.team.name,
            managerName: st.team.managerName,
            logoUrl: st.team.logoUrl,
            seasonPlayers: playerCount,
            seasonSpent: spentData._sum.soldPrice || 0,
            seasonWins: homeWins + awayWins,
            seasonBudget: st.currentBudget,
            totalPlayers: 0,
            totalSpent: 0,
            totalWins: 0,
            currentBudget: 0,
            seasonsCount: 0
          }
        })
      )

      seasonTeams[season.id] = teamsWithStats

      const totalPlayers = await prisma.transfer_history.count({
        where: { seasonId: season.id, status: 'ACTIVE' }
      })

      const totalSpentData = await prisma.transfer_history.aggregate({
        where: { seasonId: season.id, status: 'ACTIVE' },
        _sum: { soldPrice: true }
      })

      seasonStats[season.id] = {
        totalTeams: teamsWithStats.length,
        totalPlayers,
        totalSpent: totalSpentData._sum.soldPrice || 0
      }
    }

    const overallStats = {
      totalTeams: overallTeams.length,
      totalPlayers: overallTeams.reduce((sum, t) => sum + t.totalPlayers, 0),
      totalSpent: overallTeams.reduce((sum, t) => sum + t.totalSpent, 0)
    }

    return {
      overallTeams,
      seasonTeams,
      seasons,
      overallStats,
      seasonStats
    }
  } catch (error) {
    console.error('Error fetching teams data:', error)
    return {
      overallTeams: [],
      seasonTeams: {},
      seasons: [],
      overallStats: { totalTeams: 0, totalPlayers: 0, totalSpent: 0 },
      seasonStats: {}
    }
  }
}

export default async function TeamsPage() {
  const data = await getTeamsData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <TeamsClient
            overallTeams={data.overallTeams}
            seasonTeams={data.seasonTeams}
            seasons={data.seasons}
            overallStats={data.overallStats}
            seasonStats={data.seasonStats}
          />
        </div>
      </main>

          </div>
  )
}
