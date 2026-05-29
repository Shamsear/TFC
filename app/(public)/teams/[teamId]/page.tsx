import { notFound } from "next/navigation"
import { TeamDetailView } from "@/components/team/TeamDetailView"
import { 
  getCumulativeXPForLevel, 
  getXPForNextLevel, 
  getRankDetails,
  BADGE_DEFINITIONS
} from "@/lib/achievements-math"
import Image from "next/image"

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string
  }>
}

interface AllTimeStats {
  totalTrophies: number
  highestSigning: number
  seasonsParticipated: number
}

interface SeasonalData {
  seasonId: string
  seasonName: string
  currentBudget: number
  finalBudget: number | null
  trophiesWon: number
  played?: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDiff?: number
  points?: number
}

interface TransferHistoryItem {
  id: string
  playerId: string
  playerName: string
  seasonId: string
  seasonName: string
  soldPrice: number
  createdAt: string
}

interface UnlockedBadge {
  id: string
  badgeKey: string
  badgeName: string
  tier: string
  seasonId: string | null
  unlockedAt: string
}

interface TeamDetailResponse {
  id: string
  name: string
  managerName: string
  logoUrl: string
  createdAt: string
  updatedAt: string
  xp: number
  level: number
  unlockedBadges: UnlockedBadge[]
  allTimeStats: AllTimeStats
  seasonalData: SeasonalData[]
  transferHistory: TransferHistoryItem[]
}

async function getTeamDetails(teamId: string): Promise<TeamDetailResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/teams/${teamId}`, {
      cache: "no-store"
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching team details:", error)
    return null
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params
  const teamData = await getTeamDetails(teamId)

  if (!teamData) {
    notFound()
  }

  // Level Progression Math
  const level = teamData.level
  const currentXP = teamData.xp
  const levelStartXP = getCumulativeXPForLevel(level)
  const xpInCurrentLevel = currentXP - levelStartXP
  const xpNeededForNextLevel = getXPForNextLevel(level)
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100))

  // Rank Details
  const rank = getRankDetails(level)

  // Unlocked badges mapping
  const unlockedBadges = teamData.unlockedBadges || []
  const unlockedMap = new Map<string, UnlockedBadge>()
  unlockedBadges.forEach(b => {
    unlockedMap.set(b.badgeKey, b)
  })

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-red-400 bg-red-950/40 border border-red-500/20';
      case 'GOLD': return 'text-amber-400 bg-amber-950/40 border border-amber-500/20';
      case 'SILVER': return 'text-slate-300 bg-slate-800/40 border border-slate-500/20';
      default: return 'text-orange-400 bg-orange-950/40 border border-orange-500/20';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-12 pt-24">
        {/* Team Header Card */}
        <div className="relative rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl p-6 md:p-8 mb-8 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
            style={{ backgroundColor: rank.color }}
          ></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Logo and Rank Emblem */}
            <div className="relative flex-shrink-0">
              <div 
                className="relative h-28 w-28 md:h-32 md:w-32 overflow-hidden rounded-xl border border-white/10 p-1 bg-black/40 shadow-2xl"
                style={{ boxShadow: `0 0 40px ${rank.color}20` }}
              >
                <img
                  src={teamData.logoUrl}
                  alt={`${teamData.name} Logo`}
                  className="h-full w-full object-cover rounded-lg"
                />
              </div>
              {/* Floating Rank Badge Emblem Overlay */}
              <div 
                className="absolute -bottom-3 -right-3 h-12 w-12 md:h-14 md:w-14 rounded-full border bg-[#0d0d10] p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center backdrop-blur-xl"
                title={`${rank.title} Emblem`}
                style={{ borderColor: `${rank.color}30` }}
              >
                <Image
                  src={rank.badgePath}
                  alt={rank.title}
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Info and Progression */}
            <div className="flex-1 w-full text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  {teamData.name}
                </h1>
                
                {/* Level Tag with Micro Rank Emblem */}
                <span 
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mx-auto md:mx-0 border w-fit"
                  style={{ 
                    borderColor: `${rank.color}30`, 
                    color: rank.color,
                    backgroundColor: `${rank.color}0a`
                  }}
                >
                  <Image
                    src={rank.badgePath}
                    alt={rank.title}
                    width={16}
                    height={16}
                    className="object-contain animate-[pulse_3s_infinite]"
                  />
                  Lvl {level} • {rank.title}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">Manager: {teamData.managerName}</p>
              <p className="text-xs text-gray-500 mb-6 max-w-xl">
                Level progress and unlocked badges for TFC accomplishments!
              </p>

              {/* Progress Bar */}
              <div className="max-w-2xl">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Level Progress</span>
                  <span className="font-mono text-cyan-400">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
                </div>
                
                <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundImage: `linear-gradient(90deg, ${rank.color}, #06b6d4)`
                    }}
                  ></div>
                </div>

                <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                  <span>Lvl {level}</span>
                  <span>{teamData.xp} Total XP</span>
                  <span>Lvl {level + 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All-Time Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl group-hover:bg-[#E8A800]/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold">
              Total Trophies
            </h3>
            <p className="text-4xl font-black text-[#E8A800] font-mono">
              {teamData.allTimeStats.totalTrophies}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold">
              Highest Signing
            </h3>
            <p className="text-4xl font-black text-emerald-400 font-mono">
              £{teamData.allTimeStats.highestSigning.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-cyan-500/25 transition-all duration-300 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-extrabold">
              Seasons Participated
            </h3>
            <p className="text-4xl font-black text-cyan-400 font-mono">
              {teamData.allTimeStats.seasonsParticipated}
            </p>
          </div>
        </div>

        {/* Season-by-Season View */}
        <div className="mb-8">
          <TeamDetailView
            teamId={teamData.id}
            seasonalData={teamData.seasonalData}
            transferHistory={teamData.transferHistory}
          />
        </div>

        {/* Achievements Showcase */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
            </svg>
            Achievements Showcase
            <span className="text-xs font-normal text-gray-500 font-mono">({unlockedBadges.length}/{Object.keys(BADGE_DEFINITIONS).length} unlocked)</span>
          </h2>

          {unlockedBadges.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-black/20 text-gray-400">
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
                        ? 'bg-white/[0.01] hover:bg-white/[0.03] border-white/10 hover:-translate-y-1' 
                        : 'bg-black/40 border-white/[0.03] opacity-50'
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
