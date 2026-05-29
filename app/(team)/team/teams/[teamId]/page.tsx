import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import TeamDetailTabs from '@/components/team/TeamDetailTabs'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import { checkTeamSeasonParticipation } from '@/lib/team-auth'
import { 
  getCumulativeXPForLevel, 
  getXPForNextLevel, 
  getRankDetails 
} from '@/lib/achievements-math'

interface TeamDetailPageProps {
  params: Promise<{
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

  // Get saved squad formation
  const teamSquad = await prisma.team_squads.findUnique({
    where: {
      team_id_season_id: {
        team_id: teamId,
        season_id: seasonId
      }
    }
  })

  // Get season team data
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId,
        teamId
      }
    }
  })

  // Get all ACTIVE transfers for this team in this season
  const transfers = await prisma.transfer_history.findMany({
    where: {
      seasonId,
      teamId,
      status: 'ACTIVE',
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

  // Get tournament standings
  const standings = seasonTeam ? await prisma.standings.findMany({
    where: {
      teamId: seasonTeam.id,
      tournament: {
        seasonId
      }
    },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          tournamentType: true,
          status: true
        }
      }
    }
  }) : []

  // Get historical data (all seasons) with standings
  const allSeasonTeams = await prisma.season_teams.findMany({
    where: { teamId },
    include: {
      season: {
        select: {
          id: true,
          name: true,
          startingPurse: true
        }
      },
      standings: true
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
      playerId: transfer.basePlayer.player_id || transfer.basePlayer.id,
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
      squad: squadByPosition,
      formation: teamSquad?.formation || null,
      tournaments: standings
    },
    historicalSeasons: allSeasonTeams.map(st => {
      const played = st.standings.reduce((sum, s) => sum + s.played, 0)
      const won = st.standings.reduce((sum, s) => sum + s.won, 0)
      const drawn = st.standings.reduce((sum, s) => sum + s.drawn, 0)
      const lost = st.standings.reduce((sum, s) => sum + s.lost, 0)
      const goalsFor = st.standings.reduce((sum, s) => sum + s.goalsFor, 0)
      const goalsAgainst = st.standings.reduce((sum, s) => sum + s.goalsAgainst, 0)
      const goalDiff = st.standings.reduce((sum, s) => sum + s.goalDiff, 0)
      const points = st.standings.reduce((sum, s) => sum + s.points, 0)

      return {
        seasonId: st.season.id,
        seasonName: st.season.name,
        startingPurse: st.season.startingPurse,
        finalBudget: st.finalBudget,
        currentBudget: st.currentBudget,
        trophiesWon: st.trophiesWon,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff,
        points
      }
    })
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await auth()
  if (!session?.user?.teamId) {
    redirect('/auth/signin')
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason) {
    redirect("/team/not-in-season")
  }

  const { teamId } = await params
  const seasonId = activeSeason.id
  const teamData = await getTeamData(teamId, seasonId)

  if (!teamData) {
    notFound()
  }

  const { team, seasonTeam, currentSeason, historicalSeasons } = teamData

  // Level Progression Math
  const level = team.level
  const currentXP = team.xp
  const levelStartXP = getCumulativeXPForLevel(level)
  const xpInCurrentLevel = currentXP - levelStartXP
  const xpNeededForNextLevel = getXPForNextLevel(level)
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100))

  // Rank Details
  const rank = getRankDetails(level)

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24">
        {/* Back Button */}
        <Link
          href={`/team/teams`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Teams
        </Link>

        {/* Team Header */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: rank.color }}
          ></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Team Logo & Rank Overlay */}
            <div className="relative flex-shrink-0">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-black/40 ring-4 ring-white/5 flex items-center justify-center shadow-xl">
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    fill
                    className="object-contain p-3"
                    priority
                    unoptimized
                  />
                ) : (
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                )}
              </div>
              
              {/* Floating Rank Badge Emblem Overlay */}
              <div 
                className="absolute -bottom-2 -right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full border bg-[#0d0d10] p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center backdrop-blur-xl hover:scale-110 transition-transform duration-200"
                title={`${rank.title} Emblem`}
                style={{ borderColor: `${rank.color}30` }}
              >
                <Image
                  src={rank.badgePath}
                  alt={rank.title}
                  width={40}
                  height={40}
                  className="object-contain animate-[pulse_4s_infinite]"
                />
              </div>
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start mb-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {team.name}
                </h1>
                
                {/* Level Tag with Micro Rank Emblem */}
                <span 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mx-auto sm:mx-0 border w-fit"
                  style={{ 
                    borderColor: `${rank.color}30`, 
                    color: rank.color,
                    backgroundColor: `${rank.color}0a`
                  }}
                >
                  <Image
                    src={rank.badgePath}
                    alt={rank.title}
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                  Lvl {level} • {rank.title}
                </span>
              </div>
              <p className="text-gray-400 text-lg mb-4">
                Manager: {team.managerName}
              </p>

              {/* Progress Bar */}
              <div className="max-w-xl mb-6 mx-auto sm:mx-0">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-mono">
                  <span>Level Progress</span>
                  <span className="text-cyan-400 font-bold">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundImage: `linear-gradient(90deg, ${rank.color}, #06b6d4)`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
                  <span>Lvl {level}</span>
                  <span>{team.xp} Total XP</span>
                  <span>Lvl {level + 1}</span>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-white/5 pt-6 mt-6">
                <div className="rounded-xl bg-black/30 border border-white/5 p-3 hover:border-emerald-500/20 transition-all duration-300">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Players</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    {currentSeason.playerCount}
                  </div>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/5 p-3 hover:border-[#FFB347]/20 transition-all duration-300">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Spent</div>
                  <div className="text-xl sm:text-2xl font-black text-[#FFB347] font-mono">
                    {formatCurrency(currentSeason.totalSpent)}
                  </div>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/5 p-3 hover:border-[#E8A800]/20 transition-all duration-300">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Avg Rating</div>
                  <div className="text-xl sm:text-2xl font-black text-[#E8A800] font-mono">
                    {currentSeason.averageRating} <span className="text-xs font-normal text-gray-500">OVR</span>
                  </div>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/5 p-3 hover:border-purple-500/20 transition-all duration-300">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Remaining</div>
                  <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
                    {formatCurrency(currentSeason.remainingBudget)}
                  </div>
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
          viewerRole="team"
        />
      </div>
    </div>
  )
}
