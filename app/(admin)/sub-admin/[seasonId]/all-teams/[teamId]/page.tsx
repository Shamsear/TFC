import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import TeamDetailTabs from '@/components/team/TeamDetailTabs'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface TeamDetailPageProps {
  params: Promise<{
    seasonId: string
    teamId: string
  }>
}

async function getTeamData(teamId: string, seasonId: string) {
  // Get team basic info
  const team = await prisma.teams.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    return null
  }

  // Get season team data
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId,
        teamId
      }
    }
  })

  // Get all transfers for this team in this season
  const transfers = await prisma.transfer_history.findMany({
    where: {
      seasonId,
      teamId
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: { seasonId }
          }
        }
      }
    },
    orderBy: {
      soldPrice: 'desc'
    }
  })

  // Get historical data (all seasons)
  const allSeasonTeams = await prisma.season_teams.findMany({
    where: { teamId },
    include: {
      season: {
        select: {
          id: true,
          name: true,
          startingPurse: true
        }
      }
    },
    orderBy: {
      season: {
        createdAt: 'desc'
      }
    }
  })

  // Calculate squad composition
  const squadByPosition = transfers.reduce((acc, transfer) => {
    const position = transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A'
    if (!acc[position]) {
      acc[position] = []
    }
    acc[position].push({
      id: transfer.basePlayer.id,
      name: transfer.basePlayer.name,
      photoUrl: getPlayerPhotoUrl(`${transfer.basePlayer.player_id || transfer.basePlayer.id}.webp`),
      position,
      position_group: transfer.basePlayer.seasonalPlayerStats[0]?.position_group || null,
      overallRating: transfer.basePlayer.seasonalPlayerStats[0]?.overallRating || 0,
      realWorldClub: transfer.basePlayer.seasonalPlayerStats[0]?.realWorldClub || 'N/A',
      soldPrice: transfer.soldPrice
    })
    return acc
  }, {} as Record<string, any[]>)

  // Calculate team stats
  const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0)
  const averageRating = transfers.length > 0 
    ? Math.round(transfers.reduce((sum, t) => sum + (t.basePlayer.seasonalPlayerStats[0]?.overallRating || 0), 0) / transfers.length)
    : 0

  const positionCounts = Object.entries(squadByPosition).reduce((acc, [position, players]) => {
    acc[position] = players.length
    return acc
  }, {} as Record<string, number>)

  return {
    team,
    seasonTeam,
    currentSeason: {
      id: seasonId,
      playerCount: transfers.length,
      totalSpent,
      averageRating,
      remainingBudget: seasonTeam ? seasonTeam.currentBudget : 0,
      positionCounts,
      squad: squadByPosition
    },
    historicalSeasons: allSeasonTeams.map(st => ({
      seasonId: st.season.id,
      seasonName: st.season.name,
      startingPurse: st.season.startingPurse,
      finalBudget: st.finalBudget,
      currentBudget: st.currentBudget,
      trophiesWon: st.trophiesWon
    }))
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, teamId } = await params
  const teamData = await getTeamData(teamId, seasonId)

  if (!teamData) {
    notFound()
  }

  const { team, seasonTeam, currentSeason, historicalSeasons } = teamData

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Back Button */}
        <Link
          href={`/sub-admin/${seasonId}/all-teams`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Teams
        </Link>

        {/* Team Header */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Team Logo */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex-shrink-0 ring-4 ring-white/10 p-3">
              <Image
                src={team.logoUrl}
                alt={team.name}
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">
                {team.name}
              </h1>
              <p className="text-[#D4CCBB] text-lg mb-4">
                Manager: {team.managerName}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {currentSeason.playerCount}
                  </div>
                  <div className="text-xs text-[#7A7367]">Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-[#FFB347]">
                    {formatCurrency(currentSeason.totalSpent)}
                  </div>
                  <div className="text-xs text-[#7A7367]">Spent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">
                    {currentSeason.averageRating}
                  </div>
                  <div className="text-xs text-[#7A7367]">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-purple-400">
                    {formatCurrency(currentSeason.remainingBudget)}
                  </div>
                  <div className="text-xs text-[#7A7367]">Remaining</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <TeamDetailTabs
          team={team}
          currentSeason={currentSeason}
          historicalSeasons={historicalSeasons}
          seasonId={seasonId}
        />
      </div>
    </div>
  )
}