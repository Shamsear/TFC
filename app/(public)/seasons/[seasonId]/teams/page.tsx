import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
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
            teamId: st.teamId
          }
        })

        // Get total spent by this team
        const spentData = await prisma.transfer_history.aggregate({
          where: {
            seasonId,
            teamId: st.teamId
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
      where: { seasonId },
      _sum: { soldPrice: true }
    })
    const totalPlayers = await prisma.transfer_history.count({
      where: { seasonId }
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
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href={`/seasons/${seasonId}`}
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Season
          </Link>

          {/* Header with Stats */}
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1 sm:mb-2">Season Teams</h1>
                <p className="text-sm sm:text-base text-[#D4CCBB]">
                  {data.season.name}
                </p>
              </div>
              
              {/* Inline Stats */}
              <div className="flex items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.teams.length}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Teams</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalPlayers}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Players</div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{formatCurrency(data.stats.totalSpent)}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Total Spent</div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          {data.teams.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Teams Found</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">Teams will appear here once they join this season</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {data.teams.map((team) => {
                const spentPercentage = team.currentBudget > 0 ? ((team.spent / (team.currentBudget + team.spent)) * 100) : 0

                return (
                  <Link
                    key={team.id}
                    href={`/teams/${team.teamId}`}
                    className="group rounded-xl bg-[#111111] border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
                  >
                    {/* Team Header with Logo */}
                    <div className="mb-3 sm:mb-5">
                      <div className="flex items-center gap-3 mb-2 sm:mb-3">
                        {/* Team Logo */}
                        <TeamLogo logoUrl={team.team.logoUrl} teamName={team.team.name} size="md" />
                        
                        {/* Team Name */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-xl font-black text-[#F5F0E8] mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                            {team.team.name}
                          </h3>
                          <div className="text-xs text-[#7A7367] truncate">{team.team.managerName}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7A7367]">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{team.playerCount} players</span>
                        </div>
                        <span className="hidden sm:inline">•</span>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span className="text-[#FFB347]">{team.wins} wins</span>
                        </div>
                      </div>
                    </div>

                    {/* Budget Section */}
                    <div className="mb-3 sm:mb-5">
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                        <span className="text-[#D4CCBB]">Remaining Budget</span>
                        <span className="text-[#F5F0E8] font-bold">{formatCurrency(team.currentBudget)}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FFC93A] to-[#E8A800] rounded-full transition-all"
                          style={{ width: `${100 - spentPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#7A7367] mt-1 sm:mt-1.5">
                        <span>Spent: {formatCurrency(team.spent)}</span>
                        <span>{spentPercentage.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* View Link */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10">
                      <span className="text-xs sm:text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                        View Squad
                      </span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
