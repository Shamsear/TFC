import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import TeamDetailTabs from "@/components/team/TeamDetailTabs"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import { getActiveSeason } from "@/lib/get-active-season"
import { 
  getCumulativeXPForLevel, 
  getXPForNextLevel, 
  getRankDetails,
  BADGE_DEFINITIONS
} from "@/lib/achievements-math"

interface ManagerDetailPageProps {
  params: Promise<{
    managerId: string
  }>
}

async function getTeamData(teamId: string) {
  let resolvedTeamId = teamId;
  let resolvedManagerName: string | null = null;
  let resolvedManagerRecord = null;

  // ── Step 1: Resolve the manager ────────────────────────────────
  // Try as manager ID first
  const manager = await prisma.managers.findUnique({
    where: { id: teamId },
    include: {
      teamLinks: {
        include: { team: true },
        orderBy: { isCurrent: 'desc' }
      },
      user: true
    }
  });

  if (manager) {
    resolvedManagerName = manager.name;
    resolvedManagerRecord = manager;

    // Find current team: prefer isCurrent flag, fallback to first link
    const currentLink = manager.teamLinks.find(l => l.isCurrent) || manager.teamLinks[0];
    if (currentLink) {
      resolvedTeamId = currentLink.teamId;
    } else {
      // Fallback: find most recent season_teams entry
      const latestSeasonTeam = await prisma.season_teams.findFirst({
        where: { managerName: { equals: manager.name, mode: 'insensitive' } },
        include: { season: { select: { seasonNumber: true } } },
        orderBy: { season: { seasonNumber: 'desc' } }
      });
      if (latestSeasonTeam) {
        resolvedTeamId = latestSeasonTeam.teamId;
      }
    }
  } else {
    // Try as team ID directly
    const team = await prisma.teams.findUnique({ where: { id: teamId } });
    if (team) {
      resolvedManagerName = team.managerName;
      // Check if there's a manager record for this name
      const mgrRecord = await prisma.managers.findFirst({
        where: { name: { equals: team.managerName, mode: 'insensitive' } },
        include: {
          teamLinks: { include: { team: true }, orderBy: { isCurrent: 'desc' } },
          user: true
        }
      });
      if (mgrRecord) {
        resolvedManagerRecord = mgrRecord;
        resolvedManagerName = mgrRecord.name;
        const currentLink = mgrRecord.teamLinks.find(l => l.isCurrent) || mgrRecord.teamLinks[0];
        if (currentLink) {
          resolvedTeamId = currentLink.teamId;
        }
      }
    }
  }

  // Get active season info
  const activeSeason = await getActiveSeason()

  // Get team basic info
  const team = await prisma.teams.findUnique({
    where: { id: resolvedTeamId },
    include: {
      unlockedBadges: true
    }
  });

  if (!team) {
    return null;
  }

  // Override manager name with the resolved canonical name
  if (resolvedManagerName) {
    team.managerName = resolvedManagerName;
  } else {
    resolvedManagerName = team.managerName;
  }

  // ── Step 2: Get ALL seasons this manager participated in ────────
  // Query season_teams by the canonical manager name
  const allSeasonTeams = await prisma.season_teams.findMany({
    where: {
      managerName: { equals: resolvedManagerName, mode: 'insensitive' }
    },
    include: {
      season: {
        select: {
          id: true,
          name: true,
          startingPurse: true
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true
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

  // ── Step 3: Fetch transfers and squads for all season-team pairs ─
  const seasonPairs = allSeasonTeams.map(st => ({ seasonId: st.seasonId, teamId: st.teamId }));
  const [allTransfers, allSquads] = allSeasonTeams.length > 0
    ? await Promise.all([
      prisma.transfer_history.findMany({
        where: {
          OR: seasonPairs.map(p => ({ seasonId: p.seasonId, teamId: p.teamId, status: 'ACTIVE' }))
        },
        include: {
          basePlayer: { include: { seasonalPlayerStats: true } }
        },
        orderBy: { soldPrice: 'desc' }
      }),
      prisma.team_squads.findMany({
        where: {
          OR: seasonPairs.map(p => ({ season_id: p.seasonId, team_id: p.teamId }))
        }
      })
    ])
    : [[], []];

  // ── Step 4: Build detailed season data ──────────────────────────
  const detailedSeasons = allSeasonTeams.map(st => {
    const seasonTransfers = allTransfers.filter(t => t.seasonId === st.seasonId && t.teamId === st.teamId);

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

    const positionCounts = Object.entries(squadByPosition).reduce((acc, [position, players]) => {
      acc[position] = players.length;
      return acc;
    }, {} as Record<string, number>);

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

    const formationObj = allSquads.find(q => q.season_id === st.seasonId && q.team_id === st.teamId);

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
      seasonTeamName: st.team.name,
      seasonTeamLogo: st.team.logoUrl,
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

  // All-time stats
  const totalTrophies = allSeasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0);
  const allTimeHighestSigning = allTransfers.reduce((max, t) => Math.max(max, t.soldPrice), 0);

  return JSON.parse(JSON.stringify({
    team,
    activeSeason,
    seasons: detailedSeasons,
    allTimeStats: {
      totalTrophies,
      highestSigning: allTimeHighestSigning,
      seasonsParticipated: allSeasonTeams.length
    }
  })) as {
    team: typeof team;
    activeSeason: typeof activeSeason;
    seasons: typeof detailedSeasons;
    allTimeStats: {
      totalTrophies: number;
      highestSigning: number;
      seasonsParticipated: number;
    }
  }
}

export default async function TeamDetailPage({ params }: ManagerDetailPageProps) {
  const { managerId } = await params
  const teamData = await getTeamData(managerId)

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

  // Unlocked badges
  const unlockedBadges = team.unlockedBadges || []

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-16">
        {/* Back Button */}
        <Link
          href={`/managers`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer mb-6"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Managers
        </Link>

        {/* Manager Header */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: rank.color }}
          ></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ff6600]/5 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Manager Logo & Rank Overlay */}
            <div className="relative flex-shrink-0">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-black/40 ring-4 ring-white/5 flex items-center justify-center shadow-xl">
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt={team.managerName}
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
              
              {/* Floating Rank Badge */}
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

            {/* Manager Info */}
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start mb-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent tracking-tight leading-none">
                  {team.managerName}
                </h1>
                
                {/* Level Tag */}
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
                Current Franchise: <span className="text-white">{team.name}</span>
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

        {/* Tabbed Season View */}
        {seasons.length > 0 ? (
          <div className="mb-12">
            <TeamDetailTabs
              team={team}
              seasons={seasons}
              viewerRole="public"
              unlockedBadges={unlockedBadges}
              badgeDefinitions={Object.values(BADGE_DEFINITIONS)}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-100 p-8 text-center border border-white/5 shadow-md mb-8">
            <p className="text-gray-400 text-sm">No season data registered yet for this manager.</p>
          </div>
        )}

      </div>
    </div>
  )
}
