import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import PlayersSearchClient from '@/components/players/PlayersSearchClient'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

export const metadata = {
  title: "Players | Team Dashboard",
  description: "Browse and search all players in the league",
}

async function getPlayersData(seasonId: string) {
  try {
    // Get all players with seasonal stats
    const allPlayers = await prisma.seasonal_player_stats.findMany({
      where: { seasonId },
      include: {
        basePlayer: {
          include: {
            transferHistory: {
              where: { seasonId },
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
      where: { seasonId },
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
        photoUrl: getPlayerPhotoUrl(`${stats.basePlayer.player_id || stats.basePlayer.id}.webp`),
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

export default async function TeamPlayersPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="pt-24 pb-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">No Active Season</h2>
              <p className="text-gray-400 text-sm sm:text-base">There is no active season at the moment.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const data = await getPlayersData(activeSeason.id)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Player Search
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              Browse all players in {activeSeason.name}
            </p>
          </div>

          {/* Search Interface */}
          <PlayersSearchClient 
            players={data.players}
            teams={data.teams}
            stats={data.stats}
            basePath="/team/players"
          />
        </div>
      </main>
    </div>
  )
}
