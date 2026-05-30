import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import TeamDetailTabs from "@/components/team/TeamDetailTabs"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import { 
  getCumulativeXPForLevel, 
  getXPForNextLevel, 
  getRankDetails,
  BADGE_DEFINITIONS
} from "@/lib/achievements-math"

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string
  }>
}

async function getTeamData(teamId: string) {
  // 1. Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true }
  })

  // 2. Get team basic info
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    include: {
      unlockedBadges: true
    }
  })

  if (!team) {
    return null
  }

  // If there's no active season, find the most recent season
  const season = activeSeason || await prisma.seasons.findFirst({
    orderBy: { createdAt: 'desc' }
  })

  if (!season) {
    return {
      team,
      activeSeason: null,
      currentSeason: null,
      historicalSeasons: [],
      allTimeStats: {
        totalTrophies: 0,
        highestSigning: 0,
        seasonsParticipated: 0
      }
    }
  }

  const seasonId = season.id

  // 3. Get saved squad formation
  const teamSquad = await prisma.team_squads.findUnique({
    where: {
      team_id_season_id: {
        team_id: teamId,
        season_id: seasonId
      }
    }
  })

  // 4. Get season team data
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId,
        teamId
      }
    }
  })

  // 5. Get all ACTIVE transfers for this team in this season
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

  // 6. Get tournament standings
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

  // 7. Get historical data (all seasons) with standings
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

  // 8. Calculate squad composition
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

  const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0)
  const averageRating = transfers.length > 0 
    ? Math.round(transfers.reduce((sum, t) => sum + (t.basePlayer.seasonalPlayerStats[0]?.overallRating || 0), 0) / transfers.length)
    : 0

  const positionCounts = Object.entries(squadByPosition).reduce((acc, [position, players]) => {
    acc[position] = players.length
    return acc
  }, {} as Record<string, number>)

  const currentSeason = {
    id: seasonId,
    playerCount: transfers.length,
    totalSpent,
    averageRating,
    remainingBudget: seasonTeam ? seasonTeam.currentBudget : 0,
    positionCounts,
    squad: squadByPosition,
    formation: teamSquad?.formation || null,
    tournaments: standings
  }

  const historicalSeasons = allSeasonTeams.map(st => {
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

  // All-time stats calculation
  const totalTrophies = allSeasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0)
  const allTimeTransfers = await prisma.transfer_history.findMany({
    where: { teamId, status: 'ACTIVE' }
  })
  const allTimeHighestSigning = allTimeTransfers.reduce((max, t) => Math.max(max, t.soldPrice), 0)

  return {
    team,
    activeSeason: season,
    currentSeason,
    historicalSeasons,
    allTimeStats: {
      totalTrophies,
      highestSigning: allTimeHighestSigning,
      seasonsParticipated: allSeasonTeams.length
    }
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params
  const teamData = await getTeamData(teamId)

  if (!teamData) {
    notFound()
  }

  const { team, activeSeason, currentSeason, historicalSeasons, allTimeStats } = teamData

  // Level Progression Math
  const level = team.level
  const currentXP = team.xp
  const levelStartXP = getCumulativeXPForLevel(level)
  const xpInCurrentLevel = currentXP - levelStartXP
  const xpNeededForNextLevel = getXPForNextLevel(level)
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100))

  // Rank Details
  const rank = getRankDetails(level)

  // Unlocked badges mapping
  const unlockedBadges = team.unlockedBadges || []
  const unlockedMap = new Map<string, any>()
  unlockedBadges.forEach(b => {
    unlockedMap.set(b.badgeKey, b)
  })

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-red-400 bg-red-950/40 border border-red-500/20';
      case 'GOLD': return 'text-amber-400 bg-amber-950/40 border border-amber-500/20';
      case 'SILVER': return 'text-slate-300 bg-slate-800/40 border border-slate-500/20';
      default: return 'text-[#E8A800] bg-[#E8A800]/10 border border-[#E8A800]/20';
    }
  }

  const getBadgeImageFilter = (badgeKey: string, unlocked: boolean) => {
    if (!unlocked) {
      return { filter: 'grayscale(1) opacity(0.25) contrast(0.75) brightness(0.75)' };
    }

    let filter = '';
    if (badgeKey.endsWith('_1')) {
      filter = 'hue-rotate(185deg) saturate(1.4) brightness(1.1) contrast(1.1)';
    } else if (badgeKey.endsWith('_2')) {
      filter = 'hue-rotate(42deg) saturate(1.8) brightness(1.2) contrast(1.1)';
    } else if (badgeKey.endsWith('_3')) {
      filter = 'hue-rotate(325deg) saturate(2) brightness(1.1) contrast(1.2)';
    }

    return filter ? { filter } : {};
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-16">
        {/* Back Button */}
        <Link
          href={`/teams`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer mb-6"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Teams
        </Link>

        {/* Team Header */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: rank.color }}
          ></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ff6600]/5 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

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
                className="absolute -bottom-2 -right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/10 bg-[#0d0d10] p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center backdrop-blur-xl hover:scale-110 transition-transform duration-200"
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
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight leading-none">
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
              <p className="text-gray-400 text-base mb-4 font-semibold">
                Manager: {team.managerName}
              </p>

              {/* Progress Bar */}
              <div className="max-w-xl mb-6 mx-auto sm:mx-0">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-mono">
                  <span>Level Progress</span>
                  <span className="text-[#E8A800] font-bold">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(232,168,0,0.3)]"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundImage: `linear-gradient(90deg, ${rank.color}, #E8A800)`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
                  <span>Lvl {level}</span>
                  <span>{team.xp} Total XP</span>
                  <span>Lvl {level + 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All-Time Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl group-hover:bg-[#E8A800]/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold font-mono">
              Total Trophies
            </h3>
            <p className="text-4xl font-black text-[#E8A800] font-mono">
              {allTimeStats.totalTrophies}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold font-mono">
              Highest Signing
            </h3>
            <p className="text-4xl font-black text-emerald-400 font-mono">
              £{allTimeStats.highestSigning.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#ff6600]/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff6600]/5 rounded-full blur-2xl group-hover:bg-[#ff6600]/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold font-mono">
              Seasons Participated
            </h3>
            <p className="text-4xl font-black text-[#ff6600] font-mono">
              {allTimeStats.seasonsParticipated}
            </p>
          </div>
        </div>

        {/* Tabbed Season View (Like Team Portal) */}
        {currentSeason ? (
          <div className="mb-12">
            <TeamDetailTabs
              team={team}
              currentSeason={currentSeason}
              historicalSeasons={historicalSeasons}
              seasonId={activeSeason ? activeSeason.id : ""}
              viewerRole="public"
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-100 p-8 text-center border border-white/5 shadow-md mb-8">
            <p className="text-gray-400 text-sm">No season data registered yet for this team.</p>
          </div>
        )}

        {/* Achievements Showcase */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-2xl font-black tracking-tight text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-[#E8A800] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
            </svg>
            Achievements Showcase
            <span className="text-xs font-normal text-gray-500 font-mono">({unlockedBadges.length}/{Object.keys(BADGE_DEFINITIONS).length} unlocked)</span>
          </h2>

          {unlockedBadges.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-black/20 text-gray-400 text-sm">
              No badges unlocked yet by this team.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.values(BADGE_DEFINITIONS).map(badge => {
                const unlocked = unlockedMap.get(badge.key);
                const tierColor = getTierColorClass(badge.tier);

                return (
                  <div 
                    key={badge.key}
                    className={`relative group rounded-xl p-5 border text-center transition-all duration-300 select-none flex flex-col items-center justify-between ${
                      unlocked 
                        ? 'bg-white/[0.01] hover:bg-white/[0.03] border-white/10 hover:-translate-y-1 hover:border-[#E8A800]/25' 
                        : 'bg-black/40 border-white/[0.03] opacity-40'
                    }`}
                  >
                    {unlocked && (
                      <span className="absolute top-2.5 right-2.5 h-4 w-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}

                    <div className="mb-4 relative h-16 w-16 flex items-center justify-center">
                      <Image
                        src={badge.image}
                        alt={badge.name}
                        width={64}
                        height={64}
                        className="object-contain"
                        style={getBadgeImageFilter(badge.key, !!unlocked)}
                      />
                    </div>

                    <div className="w-full">
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mx-auto mb-2 ${tierColor}`}>
                        {badge.tier}
                      </div>
                      <h3 className={`text-sm font-semibold tracking-tight leading-snug line-clamp-1 ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                        {badge.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
