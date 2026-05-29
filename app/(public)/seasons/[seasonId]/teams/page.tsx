import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TeamLogo from '@/components/team/TeamLogo'

async function getSeasonTeamsData(seasonId: string) {
  try {
    // Get the season
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return null
    }

    // Get all teams in this season
    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: {
        team: true
      },
      orderBy: { currentBudget: 'desc' }
    })

    // Get player counts and match statistics for each team
    const teamsWithStats = await Promise.all(
      seasonTeams.map(async (st) => {
        // Count players from transfer_history
        const playerCount = await prisma.transfer_history.count({
          where: {
            seasonId,
            teamId: st.teamId,
            status: 'ACTIVE'
          }
        })

        // Get total spent by this team
        const spentData = await prisma.transfer_history.aggregate({
          where: {
            seasonId,
            teamId: st.teamId,
            status: 'ACTIVE'
          },
          _sum: { soldPrice: true }
        })

        const homeWins = await prisma.matches.count({
          where: {
            homeTeamId: st.id,
            status: 'COMPLETED',
            homeScore: { gt: prisma.matches.fields.awayScore }
          }
        })

        const awayWins = await prisma.matches.count({
          where: {
            awayTeamId: st.id,
            status: 'COMPLETED',
            awayScore: { gt: prisma.matches.fields.homeScore }
          }
        })

        return {
          ...st,
          playerCount,
          spent: spentData._sum.soldPrice || 0,
          wins: homeWins + awayWins
        }
      })
    )

    const totalBudget = seasonTeams.reduce((sum, st) => sum + st.currentBudget, 0)
    const totalSpent = await prisma.transfer_history.aggregate({
      where: { seasonId, status: 'ACTIVE' },
      _sum: { soldPrice: true }
    })
    const totalPlayers = await prisma.transfer_history.count({
      where: { seasonId, status: 'ACTIVE' }
    })

    return {
      season,
      teams: teamsWithStats,
      stats: { 
        totalBudget, 
        totalSpent: totalSpent._sum.soldPrice || 0, 
        totalPlayers 
      }
    }
  } catch (error) {
    console.error('Error fetching season teams data:', error)
    return null
  }
}

export default async function SeasonTeamsPage({
  params
}: {
  params: Promise<{ seasonId: string }>
}) {
  const { seasonId } = await params
  const data = await getSeasonTeamsData(seasonId)

  if (!data) {
    notFound()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`
    }
    return `£${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <Link
          href={`/seasons/${seasonId}`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6 font-bold text-xs uppercase tracking-wider"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Season
        </Link>

        {/* Header with Stats */}
        <div className="mb-8 border-b border-white/5 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                  Season Teams
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1 uppercase tracking-wider">
                {data.season.name} • PARTICIPATING LEAGUE MEMBERS
              </p>
            </div>
            
            {/* Inline Stats */}
            <div className="flex items-center gap-6 sm:gap-10">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{data.teams.length}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Teams</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{data.stats.totalPlayers}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Players</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{formatCurrency(data.stats.totalSpent)}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-sans">Total Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {data.teams.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl relative overflow-hidden">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-black text-white mb-1">No Teams Found</h3>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Teams will appear here once they join this season</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {data.teams.map((team) => {
              const spentPercentage = team.currentBudget > 0 ? ((team.spent / (team.currentBudget + team.spent)) * 100) : 0

              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.teamId}`}
                  className="relative block rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 p-5 hover:border-amber-500/30 hover:bg-white/[0.01] hover:shadow-[0_0_30px_rgba(232,168,0,0.05)] transition-all duration-300 group cursor-pointer overflow-hidden shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                  {/* Team Header with Logo */}
                  <div className="mb-5 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 p-1 flex-shrink-0 shadow-lg ring-2 ring-white/5 group-hover:ring-amber-500/20 transition-all flex items-center justify-center">
                        <TeamLogo logoUrl={team.team.logoUrl} teamName={team.team.name} size="sm" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-white mb-0.5 group-hover:text-[#FFB347] transition-colors truncate">
                          {team.team.name}
                        </h3>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{team.team.managerName}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-[#7A7367]">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400">{team.playerCount} players</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">{team.wins} wins</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Section */}
                  <div className="mb-4 relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-extrabold uppercase tracking-widest text-[9px]">Remaining Budget</span>
                      <span className="text-[#F5F0E8] font-black font-mono">{formatCurrency(team.currentBudget)}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FFC93A] to-[#E8A800] rounded-full transition-all"
                        style={{ width: `${100 - spentPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-gray-600 mt-1 font-bold font-mono">
                      <span>SPENT: {formatCurrency(team.spent)}</span>
                      <span>{spentPercentage.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* View Link */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
                    <span className="text-xs font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors uppercase tracking-wider">
                      View Squad
                    </span>
                    <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
