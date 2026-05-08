import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import PlayersSearchClient from '@/components/players/PlayersSearchClient'
import { prisma } from '@/lib/prisma'

async function getPlayersData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { 
        players: [], 
        teams: [],
        seasonName: null, 
        stats: { 
          totalPlayers: 0, 
          totalValue: 0, 
          avgRating: 0,
          soldPlayers: 0,
          freeAgents: 0
        } 
      }
    }

    // Get all players with seasonal stats
    const allPlayers = await prisma.seasonal_player_stats.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        basePlayer: {
          include: {
            transferHistory: {
              where: { seasonId: activeSeason.id },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                team: true
              }
            }
          }
        }
      },
      orderBy: { overallRating: 'desc' }
    })

    // Get all teams in the season
    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        team: true
      }
    })

    // Transform players data
    const playersData = allPlayers.map(stats => {
      const transfer = stats.basePlayer.transferHistory[0]
      return {
        id: stats.basePlayer.id,
        name: stats.basePlayer.name,
        photoUrl: stats.basePlayer.photoUrl,
        position: stats.position,
        nationality: stats.nationality || 'Unknown',
        realWorldClub: stats.realWorldClub,
        overallRating: stats.overallRating,
        playingStyle: stats.playing_style,
        teamId: transfer?.teamId || null,
        teamName: transfer?.team.name || null,
        teamLogoUrl: transfer?.team.logoUrl || null,
        soldPrice: transfer?.soldPrice || null
      }
    })

    // Transform teams data
    const teamsData = seasonTeams.map(st => ({
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl
    }))

    // Calculate stats
    const soldPlayers = playersData.filter(p => p.teamId !== null).length
    const freeAgents = playersData.filter(p => p.teamId === null).length
    const totalValue = playersData.reduce((sum, p) => sum + (p.soldPrice || 0), 0)
    const avgRating = playersData.length > 0 
      ? Math.round(playersData.reduce((sum, p) => sum + p.overallRating, 0) / playersData.length)
      : 0

    return {
      players: playersData,
      teams: teamsData,
      seasonName: activeSeason.name,
      stats: {
        totalPlayers: playersData.length,
        soldPlayers,
        freeAgents,
        totalValue,
        avgRating
      }
    }
  } catch (error) {
    console.error('Error fetching players data:', error)
    return { 
      players: [], 
      teams: [],
      seasonName: null, 
      stats: { 
        totalPlayers: 0, 
        soldPlayers: 0,
        freeAgents: 0,
        totalValue: 0, 
        avgRating: 0 
      } 
    }
  }
}

export default async function PlayersPage() {
  const data = await getPlayersData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Player Search
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              {data.seasonName ? `Browse all players in ${data.seasonName}` : 'Browse all players in the league'}
            </p>
          </div>

          {/* Search Interface */}
          <PlayersSearchClient 
            players={data.players}
            teams={data.teams}
            stats={data.stats}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
