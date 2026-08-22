import { prisma } from '@/lib/prisma'
import TeamsClient from '@/components/teams/TeamsClient'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getTeamsData() {
  try {
    const seasons = await prisma.seasons.findMany({
      orderBy: [
        { isActive: 'desc' },
        { seasonNumber: 'desc' }
      ]
    })

    // ── 1. Get all managers as the primary entity ──────────────────
    const allManagers = await prisma.managers.findMany({
      include: {
        teamLinks: {
          include: { team: true },
          orderBy: { isCurrent: 'desc' }
        },
        user: true
      },
      orderBy: { name: 'asc' }
    })

    // ── 2. Resolve CURRENT team for each manager ──────────────────
    //    Priority: manager_teams.isCurrent → latest season_teams by seasonNumber
    const allSeasonTeams = await prisma.season_teams.findMany({
      include: { team: true, season: { select: { id: true, seasonNumber: true } } },
      orderBy: { season: { seasonNumber: 'desc' } }
    })

    const currentTeamByManager = new Map<string, {
      teamId: string
      teamName: string
      teamLogo: string
    }>()

    for (const mgr of allManagers) {
      // Prefer manager_teams with isCurrent
      const currentLink = mgr.teamLinks.find(l => l.isCurrent)
      if (currentLink) {
        currentTeamByManager.set(mgr.id, {
          teamId: currentLink.teamId,
          teamName: currentLink.team.name,
          teamLogo: currentLink.team.logoUrl
        })
        continue
      }

      // Fallback: latest season_teams entry by season number
      const latestSeasonTeam = allSeasonTeams.find(
        st => st.managerName && st.managerName.toLowerCase() === mgr.name.toLowerCase()
      )
      if (latestSeasonTeam) {
        currentTeamByManager.set(mgr.id, {
          teamId: latestSeasonTeam.teamId,
          teamName: latestSeasonTeam.team.name,
          teamLogo: latestSeasonTeam.team.logoUrl
        })
      }
    }

    // Also build a lookup: managerName (lowercase) → managerId
    // For season-specific views where we need to find the manager by name
    const managerNameToId = new Map<string, string>()
    for (const mgr of allManagers) {
      managerNameToId.set(mgr.name.toLowerCase(), mgr.id)
    }

    // ── 3. Fetch OVERALL stats per manager (across ALL teams/seasons) ─
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

    // Map teamId → managerIds (a team could have had multiple managers)
    // We attribute stats to the LATEST manager for each team
    const teamToManager = new Map<string, string>() // teamId → managerId (latest)
    for (const st of allSeasonTeams) {
      const mgrId = managerNameToId.get((st.managerName || '').toLowerCase())
      if (mgrId) {
        teamToManager.set(st.teamId, mgrId) // last one wins (ordered desc by seasonNumber)
      }
    }

    // Build overall stats per manager
    const overallManagerMap = new Map<string, {
      managerId: string
      managerName: string
      photoUrl: string | null
      totalPlayers: number
      totalSpent: number
      totalWins: number
      seasonsCount: number
    }>()

    // Initialize all managers
    for (const mgr of allManagers) {
      overallManagerMap.set(mgr.id, {
        managerId: mgr.id,
        managerName: mgr.name,
        photoUrl: mgr.photoUrl || null,
        totalPlayers: 0,
        totalSpent: 0,
        totalWins: 0,
        seasonsCount: 0
      })
    }

    // Aggregate stats: each team's stats go to its latest manager
    // But we want COMBINED stats per manager across ALL their teams
    // So we iterate season_teams and accumulate per manager
    for (const st of allSeasonTeams) {
      const mgrId = managerNameToId.get((st.managerName || '').toLowerCase())
      if (!mgrId) continue

      const entry = overallManagerMap.get(mgrId)!
      entry.totalPlayers += overallCountMap.get(st.teamId) || 0
      entry.totalSpent += overallSpentMap.get(st.teamId) || 0
      entry.totalWins += (overallHomeWinsMap.get(st.teamId) || 0) + (overallAwayWinsMap.get(st.teamId) || 0)
    }

    // Count seasons per manager
    const seasonCountByManager = new Map<string, Set<string>>()
    for (const st of allSeasonTeams) {
      const mgrId = managerNameToId.get((st.managerName || '').toLowerCase())
      if (mgrId) {
        if (!seasonCountByManager.has(mgrId)) {
          seasonCountByManager.set(mgrId, new Set())
        }
        seasonCountByManager.get(mgrId)!.add(st.seasonId)
      }
    }
    for (const [mgrId, seasonSet] of seasonCountByManager) {
      const entry = overallManagerMap.get(mgrId)
      if (entry) {
        entry.seasonsCount = seasonSet.size
      }
    }

    const overallTeams = Array.from(overallManagerMap.values()).map(m => {
      const currentTeam = currentTeamByManager.get(m.managerId)
      return {
        id: m.managerId,
        managerId: m.managerId,
        managerPhotoUrl: m.photoUrl,
        name: currentTeam?.teamName || m.managerName,
        managerName: m.managerName,
        logoUrl: currentTeam?.teamLogo || m.photoUrl || '',
        totalPlayers: m.totalPlayers,
        totalSpent: m.totalSpent,
        totalWins: m.totalWins,
        currentBudget: 0,
        seasonsCount: m.seasonsCount
      }
    })

    // ── 4. Season-specific stats ───────────────────────────────────
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

    const seasonTeams: Record<string, any[]> = {}
    const seasonStats: Record<string, any> = {}

    for (const season of seasons) {
      const seasonTeamData = allSeasonTeams.filter(st => st.seasonId === season.id)

      // Group by MANAGER (using managers table as primary key)
      const managerSeasonMap = new Map<string, {
        managerId: string
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
        const mgrName = st.managerName || st.team.managerName
        if (!mgrName) continue

        const mgrId = managerNameToId.get(mgrName.toLowerCase()) || mgrName
        const existing = managerSeasonMap.get(mgrId)

        const players = seasonCountMap.get(`${season.id}-${st.teamId}`) || 0
        const spent = seasonSpentMap.get(`${season.id}-${st.teamId}`) || 0
        const wins = (seasonHomeWinsMap.get(st.id) || 0) + (seasonAwayWinsMap.get(st.id) || 0)

        if (existing) {
          // Same manager had multiple teams in this season — combine
          existing.seasonPlayers += players
          existing.seasonSpent += spent
          existing.seasonWins += wins
          existing.seasonBudget += st.currentBudget
        } else {
          const mgrRecord = allManagers.find(m => m.id === (managerNameToId.get(mgrName.toLowerCase()) || ''))
          managerSeasonMap.set(mgrId, {
            managerId: mgrRecord?.id || mgrName,
            managerPhotoUrl: mgrRecord?.photoUrl || null,
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
        id: m.managerId,
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
