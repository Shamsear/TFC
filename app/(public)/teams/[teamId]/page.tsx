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
  let resolvedTeamId = teamId;
  let resolvedManagerName: string | null = null;

  // Resolve manager if teamId is a manager ID
  const manager = await prisma.managers.findUnique({
    where: { id: teamId }
  });

  if (manager) {
    resolvedManagerName = manager.name;
    // Find the linked team from manager_teams
    const managerLink = await prisma.manager_teams.findFirst({
      where: { managerId: manager.id },
      orderBy: { isCurrent: 'desc' }
    });
    if (managerLink) {
      resolvedTeamId = managerLink.teamId;
    } else {
      // Check season_teams for any season matching managerName
      const seasonTeamLink = await prisma.season_teams.findFirst({
        where: { managerName: { equals: manager.name, mode: 'insensitive' } }
      });
      if (seasonTeamLink) {
        resolvedTeamId = seasonTeamLink.teamId;
      }
    }
  }

  // Get active season info
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true }
  })

  // Get team basic info
  const team = await prisma.teams.findUnique({
    where: { id: resolvedTeamId },
    include: {
      unlockedBadges: true
    }
  })

  if (!team) {
    return null
  }

  // Override manager name if we resolved a manager record
  if (resolvedManagerName) {
    team.managerName = resolvedManagerName;
  }

  // Get all seasons this manager or team participated in
  const allSeasonTeams = await prisma.season_teams.findMany({
    where: resolvedManagerName
      ? {
          OR: [
            { teamId: resolvedTeamId },
            { managerName: resolvedManagerName }
          ]
        }
      : { teamId: resolvedTeamId },
    include: {
      season: {
        select: {
          id: true,
          name: true,
          startingPurse: true
        }
      },
      standings: {
        include: {
          tournament: true
        }
      }
    },
    orderBy: {
      season: {
        createdAt: 'desc'
      }
    }
  });

  // Get all active transfers for these teams and seasons
  const allTransfers = allSeasonTeams.length > 0 
    ? await prisma.transfer_history.findMany({
        where: {
          OR: allSeasonTeams.map(st => ({
            seasonId: st.seasonId,
            teamId: st.teamId,
            status: 'ACTIVE'
          }))
        },
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: true
            }
          }
        },
        orderBy: {
          soldPrice: 'desc'
        }
      })
    : [];

  // Get all saved squad formations for these teams and seasons
  const allSquads = allSeasonTeams.length > 0
    ? await prisma.team_squads.findMany({
        where: {
          OR: allSeasonTeams.map(st => ({
            season_id: st.seasonId,
            team_id: st.teamId
          }))
        }
      })
    : [];

  // Build the detailed seasons list
  const detailedSeasons = allSeasonTeams.map(st => {
    // Filter transfers for this season and team
    const seasonTransfers = allTransfers.filter(t => t.seasonId === st.seasonId && t.teamId === st.teamId);

    // Build squad grouped by position
    const squadByPosition = seasonTransfers.reduce((acc, transfer) => {
      let stats = transfer.basePlayer.seasonalPlayerStats.find(s => s.seasonId === st.seasonId);
      if (!stats && transfer.basePlayer.seasonalPlayerStats.length > 0) {
        stats = transfer.basePlayer.seasonalPlayerStats.find(s => s.seasonId === 'TFCS-4') || transfer.basePlayer.seasonalPlayerStats[0];
      }
      const position = stats?.position || 'N/A';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push({
        id: transfer.basePlayer.id,
        playerId: transfer.basePlayer.player_id || transfer.basePlayer.id,
        name: transfer.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${transfer.basePlayer.player_id || transfer.basePlayer.id}.webp`),
        position,
        position_group: stats?.position_group || null,
        overallRating: stats?.overallRating || 0,
        realWorldClub: stats?.realWorldClub || 'N/A',
        soldPrice: transfer.soldPrice
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Count positions
    const positionCounts = Object.entries(squadByPosition).reduce((acc, [position, players]) => {
      acc[position] = players.length;
      return acc;
    }, {} as Record<string, number>);

    // Calculate total spent and average rating
    const totalSpent = seasonTransfers.reduce((sum, t) => sum + t.soldPrice, 0);
    const averageRating = seasonTransfers.length > 0
      ? Math.round(seasonTransfers.reduce((sum, t) => {
          let stats = t.basePlayer.seasonalPlayerStats.find(s => s.seasonId === st.seasonId);
          if (!stats && t.basePlayer.seasonalPlayerStats.length > 0) {
            stats = t.basePlayer.seasonalPlayerStats.find(s => s.seasonId === 'TFCS-4') || t.basePlayer.seasonalPlayerStats[0];
          }
          return sum + (stats?.overallRating || 0);
        }, 0) / seasonTransfers.length)
      : 0;

    // Find formation
    const formationObj = allSquads.find(q => q.season_id === st.seasonId && q.team_id === st.teamId);

    // Standings & Performance calculations for summary
    const played = st.standings.reduce((sum, s) => sum + s.played, 0);
    const won = st.standings.reduce((sum, s) => sum + s.won, 0);
    const drawn = st.standings.reduce((sum, s) => sum + s.drawn, 0);
    const lost = st.standings.reduce((sum, s) => sum + s.lost, 0);
    const goalsFor = st.standings.reduce((sum, s) => sum + s.goalsFor, 0);
    const goalsAgainst = st.standings.reduce((sum, s) => sum + s.goalsAgainst, 0);
    const goalDiff = st.standings.reduce((sum, s) => sum + s.goalDiff, 0);
    const points = st.standings.reduce((sum, s) => sum + s.points, 0);

    const startingPurse = st.season.startingPurse === 10000 ? 20000 : (st.season.startingPurse || 20000);

    return {
      seasonId: st.seasonId,
      seasonName: st.season.name,
      startingPurse,
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
      points,
      // Full details:
      playerCount: seasonTransfers.length,
      totalSpent,
      averageRating,
      remainingBudget: st.currentBudget,
      positionCounts,
      squad: squadByPosition,
      formation: formationObj?.formation || null,
      tournaments: st.standings
    };
  });

  // All-time stats calculation
  const totalTrophies = allSeasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0);
  const teamSeasonPairs = allSeasonTeams.map(st => ({
    seasonId: st.seasonId,
    teamId: st.teamId
  }));
  const allTimeTransfers = teamSeasonPairs.length > 0 
    ? await prisma.transfer_history.findMany({
        where: {
          OR: teamSeasonPairs.map(p => ({
            seasonId: p.seasonId,
            teamId: p.teamId,
            status: 'ACTIVE'
          }))
        }
      })
    : [];
  const allTimeHighestSigning = allTimeTransfers.reduce((max, t) => Math.max(max, t.soldPrice), 0);

  return {
    team,
    activeSeason,
    seasons: detailedSeasons,
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

  const { team, activeSeason, seasons, allTimeStats } = teamData

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
        {seasons.length > 0 ? (
          <div className="mb-12">
            <TeamDetailTabs
              team={team}
              seasons={seasons}
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
            <svg className="w-6 h-6 text-[#E8A800] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
