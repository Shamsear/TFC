import { prisma } from '@/lib/prisma'
import TeamsClient from '@/components/teams/TeamsClient'
import { filterMatchesByTenureWindow } from '@/lib/manager-tenure'

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
      select: {
        id: true,
        name: true,
        photoUrl: true,
        teamLinks: {
          select: {
            teamId: true,
            isCurrent: true,
            team: { select: { id: true, name: true, logoUrl: true } }
          },
          orderBy: { isCurrent: 'desc' }
        },
        user: { select: { id: true } }
      },
      orderBy: { name: 'asc' }
    })

    // ── 2. Resolve CURRENT team and tenures for each manager ───────
    const allSeasonTeams = await prisma.season_teams.findMany({
      select: {
        id: true,
        teamId: true,
        seasonId: true,
        managerName: true,
        currentBudget: true,
        trophiesWon: true,
        team: { select: { id: true, name: true, logoUrl: true, managerName: true } },
        season: { select: { id: true, seasonNumber: true } },
        managerTenures: {
          select: {
            id: true,
            managerName: true,
            fromMatchId: true,
            toMatchId: true
          }
        },
        homeMatches: {
          where: { status: 'COMPLETED' },
          select: { id: true, homeScore: true, awayScore: true, matchDate: true, status: true, homeTeamId: true, awayTeamId: true }
        },
        awayMatches: {
          where: { status: 'COMPLETED' },
          select: { id: true, homeScore: true, awayScore: true, matchDate: true, status: true, homeTeamId: true, awayTeamId: true }
        }
      },
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

    // ── 3. Fetch transfer aggregates ──────────────────────────────
    const [
      overallPlayerCounts,
      overallSpentData,
      allSeasonPlayerCounts,
      allSeasonSpentData,
      allTotalPlayersBySeason,
      allTotalSpentBySeason
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

    const overallCountMap = new Map(overallPlayerCounts.map(pc => [pc.teamId, pc._count._all]))
    const overallSpentMap = new Map(overallSpentData.map(sd => [sd.teamId, sd._sum.soldPrice || 0]))
    const seasonCountMap = new Map(allSeasonPlayerCounts.map(pc => [`${pc.seasonId}-${pc.teamId}`, pc._count._all]))
    const seasonSpentMap = new Map(allSeasonSpentData.map(sd => [`${sd.seasonId}-${sd.teamId}`, sd._sum.soldPrice || 0]))
    const totalPlayersSeasonMap = new Map(allTotalPlayersBySeason.map(pc => [pc.seasonId, pc._count._all]))
    const totalSpentSeasonMap = new Map(allTotalSpentBySeason.map(sd => [sd.seasonId, sd._sum.soldPrice || 0]))

    // ── 4. Build Season-specific and Overall stats per manager ─────
    const seasonTeams: Record<string, any[]> = {}
    const seasonStats: Record<string, any> = {}

    // Track total wins and seasons per manager
    const managerTotalWins = new Map<string, number>()
    const managerSeasonIds = new Map<string, Set<string>>()
    const managerTotalSpent = new Map<string, number>()
    const managerTotalPlayers = new Map<string, number>()

    for (const mgr of allManagers) {
      managerTotalWins.set(mgr.id, 0)
      managerSeasonIds.set(mgr.id, new Set())
      managerTotalSpent.set(mgr.id, 0)
      managerTotalPlayers.set(mgr.id, 0)
    }

    for (const season of seasons) {
      const seasonTeamData = allSeasonTeams.filter(st => st.seasonId === season.id)

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
        const allTeamMatches = [...st.homeMatches, ...st.awayMatches].sort(
          (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        )

        const players = seasonCountMap.get(`${season.id}-${st.teamId}`) || 0
        const spent = seasonSpentMap.get(`${season.id}-${st.teamId}`) || 0

        if (st.managerTenures && st.managerTenures.length > 0) {
          // Team has multiple manager tenures in this season
          for (const tenure of st.managerTenures) {
            const tenureMgrName = tenure.managerName
            if (!tenureMgrName) continue
            const mgrId = managerNameToId.get(tenureMgrName.toLowerCase()) || tenureMgrName
            const mgrRecord = allManagers.find(m => m.id === (managerNameToId.get(tenureMgrName.toLowerCase()) || ''))

            const windowMatches = filterMatchesByTenureWindow(
              allTeamMatches,
              tenure.fromMatchId,
              tenure.toMatchId
            )
            const wins = windowMatches.filter(m => 
              (m.homeTeamId === st.id && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
              (m.awayTeamId === st.id && (m.awayScore ?? 0) > (m.homeScore ?? 0))
            ).length

            // Track overall career stats
            if (managerTotalWins.has(mgrId)) {
              managerTotalWins.set(mgrId, (managerTotalWins.get(mgrId) || 0) + wins)
              managerSeasonIds.get(mgrId)?.add(season.id)
              managerTotalSpent.set(mgrId, (managerTotalSpent.get(mgrId) || 0) + spent)
              managerTotalPlayers.set(mgrId, (managerTotalPlayers.get(mgrId) || 0) + players)
            }

            const existing = managerSeasonMap.get(mgrId)
            if (existing) {
              existing.seasonWins += wins
            } else {
              managerSeasonMap.set(mgrId, {
                managerId: mgrRecord?.id || mgrId,
                managerPhotoUrl: mgrRecord?.photoUrl || null,
                managerName: tenureMgrName,
                teamName: st.team.name,
                teamLogo: st.team.logoUrl,
                seasonPlayers: players,
                seasonSpent: spent,
                seasonWins: wins,
                seasonBudget: st.currentBudget
              })
            }
          }
        } else {
          // Standard season team (single manager)
          const mgrName = st.managerName || st.team.managerName
          if (!mgrName) continue
          const mgrId = managerNameToId.get(mgrName.toLowerCase()) || mgrName
          const mgrRecord = allManagers.find(m => m.id === (managerNameToId.get(mgrName.toLowerCase()) || ''))

          const wins = allTeamMatches.filter(m => 
            (m.homeTeamId === st.id && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
            (m.awayTeamId === st.id && (m.awayScore ?? 0) > (m.homeScore ?? 0))
          ).length

          // Track overall career stats
          if (managerTotalWins.has(mgrId)) {
            managerTotalWins.set(mgrId, (managerTotalWins.get(mgrId) || 0) + wins)
            managerSeasonIds.get(mgrId)?.add(season.id)
            managerTotalSpent.set(mgrId, (managerTotalSpent.get(mgrId) || 0) + spent)
            managerTotalPlayers.set(mgrId, (managerTotalPlayers.get(mgrId) || 0) + players)
          }

          const existing = managerSeasonMap.get(mgrId)
          if (existing) {
            existing.seasonPlayers += players
            existing.seasonSpent += spent
            existing.seasonWins += wins
            existing.seasonBudget += st.currentBudget
          } else {
            managerSeasonMap.set(mgrId, {
              managerId: mgrRecord?.id || mgrId,
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

    const overallTeams = allManagers.map(mgr => {
      const currentTeam = currentTeamByManager.get(mgr.id)
      return {
        id: mgr.id,
        managerId: mgr.id,
        managerPhotoUrl: mgr.photoUrl || null,
        name: currentTeam?.teamName || mgr.name,
        managerName: mgr.name,
        logoUrl: currentTeam?.teamLogo || mgr.photoUrl || '',
        totalPlayers: managerTotalPlayers.get(mgr.id) || 0,
        totalSpent: managerTotalSpent.get(mgr.id) || 0,
        totalWins: managerTotalWins.get(mgr.id) || 0,
        currentBudget: 0,
        seasonsCount: managerSeasonIds.get(mgr.id)?.size || 0
      }
    })

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
