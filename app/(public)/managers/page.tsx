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
        { seasonNumber: 'desc' }
      ]
    })

    // Get all teams with their overall data, including manager links
    const allTeams = await prisma.teams.findMany({
      include: {
        seasonTeams: {
          include: {
            season: true
          }
        },
        managerLinks: {
          include: {
            manager: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // --- 1. Fetch bulk overall team statistics ---
    const [
      overallPlayerCounts,
      overallSpentData,
      overallHomeWins,
      overallAwayWins
    ] = await Promise.all([
      prisma.transfer_history.groupBy({
        by: ['teamId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true }
      }),
      prisma.transfer_history.groupBy({
        by: ['teamId'],
        where: { status: 'ACTIVE' },
        _sum: { soldPrice: true }
      }),
      prisma.$queryRaw<Array<{ teamId: string; count: bigint }>>`
        SELECT st."teamId", COUNT(*)::bigint as count
        FROM matches m
        INNER JOIN season_teams st ON m."homeTeamId" = st.id
        WHERE m.status = 'COMPLETED' AND m."homeScore" > m."awayScore"
        GROUP BY st."teamId"
      `,
      prisma.$queryRaw<Array<{ teamId: string; count: bigint }>>`
        SELECT st."teamId", COUNT(*)::bigint as count
        FROM matches m
        INNER JOIN season_teams st ON m."awayTeamId" = st.id
        WHERE m.status = 'COMPLETED' AND m."awayScore" > m."homeScore"
        GROUP BY st."teamId"
      `
    ])

    const overallCountMap = new Map(overallPlayerCounts.map(pc => [pc.teamId, pc._count._all]))
    const overallSpentMap = new Map(overallSpentData.map(sd => [sd.teamId, sd._sum.soldPrice || 0]))
    const overallHomeWinsMap = new Map(overallHomeWins.map(hw => [hw.teamId, Number(hw.count)]))
    const overallAwayWinsMap = new Map(overallAwayWins.map(aw => [aw.teamId, Number(aw.count)]))

    // Calculate overall stats per manager (group by managerId)
    // The same manager can have different teams across seasons — group by managerId to avoid duplicates
    const managerMap = new Map<string, {
      managerId: string | null
      managerPhotoUrl: string | null
      managerName: string
      totalPlayers: number
      totalSpent: number
      totalWins: number
      seasonsCount: number
    }>()

    for (const team of allTeams) {
      const managerLink = team.managerLinks[0]
      // Use managerId as key when available, fall back to managerName
      const key = managerLink?.managerId || team.managerName
      const existing = managerMap.get(key)
      if (existing) {
        existing.totalPlayers += overallCountMap.get(team.id) || 0
        existing.totalSpent += overallSpentMap.get(team.id) || 0
        existing.totalWins += (overallHomeWinsMap.get(team.id) || 0) + (overallAwayWinsMap.get(team.id) || 0)
        existing.seasonsCount += team.seasonTeams.length
        // Prefer the manager link info if available
        if (!existing.managerId && managerLink) {
          existing.managerId = managerLink.managerId
          existing.managerPhotoUrl = managerLink.manager?.photoUrl || null
        }
      } else {
        managerMap.set(key, {
          managerId: managerLink?.managerId || null,
          managerPhotoUrl: managerLink?.manager?.photoUrl || null,
          managerName: team.managerName,
          totalPlayers: overallCountMap.get(team.id) || 0,
          totalSpent: overallSpentMap.get(team.id) || 0,
          totalWins: (overallHomeWinsMap.get(team.id) || 0) + (overallAwayWinsMap.get(team.id) || 0),
          seasonsCount: team.seasonTeams.length
        })
      }
    }

    const overallTeams = Array.from(managerMap.values()).map(m => ({
      id: m.managerId || m.managerName,
      managerId: m.managerId,
      managerPhotoUrl: m.managerPhotoUrl,
      name: m.managerName,
      managerName: m.managerName,
      logoUrl: m.managerPhotoUrl || '',
      totalPlayers: m.totalPlayers,
      totalSpent: m.totalSpent,
      totalWins: m.totalWins,
      currentBudget: 0,
      seasonsCount: m.seasonsCount
    }))

    // --- 2. Fetch bulk season-specific statistics ---
    const [
      allSeasonPlayerCounts,
      allSeasonSpentData,
      allSeasonHomeWins,
      allSeasonAwayWins,
      allTotalPlayersBySeason,
      allTotalSpentBySeason
    ] = await Promise.all([
      prisma.transfer_history.groupBy({
        by: ['seasonId', 'teamId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true }
      }),
      prisma.transfer_history.groupBy({
        by: ['seasonId', 'teamId'],
        where: { status: 'ACTIVE' },
        _sum: { soldPrice: true }
      }),
      prisma.$queryRaw<Array<{ homeTeamId: string; count: bigint }>>`
        SELECT "homeTeamId", COUNT(*)::bigint as count
        FROM matches
        WHERE status = 'COMPLETED' AND "homeScore" > "awayScore"
        GROUP BY "homeTeamId"
      `,
      prisma.$queryRaw<Array<{ awayTeamId: string; count: bigint }>>`
        SELECT "awayTeamId", COUNT(*)::bigint as count
        FROM matches
        WHERE status = 'COMPLETED' AND "awayScore" > "homeScore"
        GROUP BY "awayTeamId"
      `,
      prisma.transfer_history.groupBy({
        by: ['seasonId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true }
      }),
      prisma.transfer_history.groupBy({
        by: ['seasonId'],
        where: { status: 'ACTIVE' },
        _sum: { soldPrice: true }
      })
    ])

    const seasonCountMap = new Map(allSeasonPlayerCounts.map(pc => [`${pc.seasonId}-${pc.teamId}`, pc._count._all]))
    const seasonSpentMap = new Map(allSeasonSpentData.map(sd => [`${sd.seasonId}-${sd.teamId}`, sd._sum.soldPrice || 0]))
    const seasonHomeWinsMap = new Map(allSeasonHomeWins.map(hw => [hw.homeTeamId, Number(hw.count)]))
    const seasonAwayWinsMap = new Map(allSeasonAwayWins.map(aw => [aw.awayTeamId, Number(aw.count)]))
    const totalPlayersSeasonMap = new Map(allTotalPlayersBySeason.map(pc => [pc.seasonId, pc._count._all]))
    const totalSpentSeasonMap = new Map(allTotalSpentBySeason.map(sd => [sd.seasonId, sd._sum.soldPrice || 0]))

    // Get all season teams
    const allSeasonTeams = await prisma.season_teams.findMany({
      include: { team: true }
    })

    const seasonTeams: Record<string, any[]> = {}
    const seasonStats: Record<string, any> = {}

    for (const season of seasons) {
      const seasonTeamData = allSeasonTeams.filter(st => st.seasonId === season.id)

      // Group by MANAGER (not team) — use season_teams.managerName for the season-specific owner
      const managerSeasonMap = new Map<string, {
        managerId: string | null
        managerPhotoUrl: string | null
        managerName: string
        teamName: string
        teamLogo: string
        seasonPlayers: number
        seasonSpent: number
        seasonWins: number
        seasonBudget: number
      }>()

      for (const st of seasonTeamData) {
        // Use the SEASON-SPECIFIC manager name, not the team's current manager
        const mgrName = st.managerName || st.team.managerName
        const teamData = allTeams.find(t => t.id === st.teamId)
        const managerLink = teamData?.managerLinks?.[0]
        // Group by managerId when available to avoid duplicate entries
        const mapKey = managerLink?.managerId || mgrName
        const existing = managerSeasonMap.get(mapKey)

        const players = seasonCountMap.get(`${season.id}-${st.teamId}`) || 0
        const spent = seasonSpentMap.get(`${season.id}-${st.teamId}`) || 0
        const wins = (seasonHomeWinsMap.get(st.id) || 0) + (seasonAwayWinsMap.get(st.id) || 0)

        if (existing) {
          // Same manager had multiple teams in this season (unlikely but safe)
          existing.seasonPlayers += players
          existing.seasonSpent += spent
          existing.seasonWins += wins
          existing.seasonBudget += st.currentBudget
        } else {
          managerSeasonMap.set(mapKey, {
            managerId: managerLink?.managerId || null,
            managerPhotoUrl: managerLink?.manager?.photoUrl || null,
            managerName: mgrName,
            teamName: st.team.name,
            teamLogo: st.team.logoUrl,
            seasonPlayers: players,
            seasonSpent: spent,
            seasonWins: wins,
            seasonBudget: st.currentBudget
          })
        }
      }

      const teamsWithStats = Array.from(managerSeasonMap.values()).map(m => ({
        id: m.managerId || m.managerName,
        managerId: m.managerId,
        managerPhotoUrl: m.managerPhotoUrl,
        name: m.teamName,
        managerName: m.managerName,
        logoUrl: m.teamLogo,
        seasonPlayers: m.seasonPlayers,
        seasonSpent: m.seasonSpent,
        seasonWins: m.seasonWins,
        seasonBudget: m.seasonBudget,
        totalPlayers: 0,
        totalSpent: 0,
        totalWins: 0,
        currentBudget: 0,
        seasonsCount: 0
      }))

      seasonTeams[season.id] = teamsWithStats

      seasonStats[season.id] = {
        totalTeams: teamsWithStats.length,
        totalPlayers: totalPlayersSeasonMap.get(season.id) || 0,
        totalSpent: totalSpentSeasonMap.get(season.id) || 0
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
