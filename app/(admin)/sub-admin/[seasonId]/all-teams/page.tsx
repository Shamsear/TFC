import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

interface AllTeamsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function AllTeamsPage({ params }: AllTeamsPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        include: {
          team: true
        },
        orderBy: {
          currentBudget: 'desc'
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  // Get player counts and transfer history for each team
  const teamsWithDetails = await Promise.all(
    season.seasonTeams.map(async (st) => {
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId,
          teamId: st.team.id
        },
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: { seasonId }
              }
            }
          }
        }
      })

      const playersByPosition = transfers.reduce((acc, transfer) => {
        const position = transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A'
        acc[position] = (acc[position] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        ...st,
        playerCount: transfers.length,
        playersByPosition,
        totalSpent: transfers.reduce((sum, t) => sum + t.soldPrice, 0)
      }
    })
  )

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                All Teams
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {season.name} - Complete team overview with budgets and squad details
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Teams</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{season.seasonTeams.length}</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Starting Purse</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#E8A800]">
              {formatCurrency(season.startingPurse)}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">
              {teamsWithDetails.reduce((sum, t) => sum + t.playerCount, 0)}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Spent</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">
              {formatCurrency(teamsWithDetails.reduce((sum, t) => sum + t.totalSpent, 0))}
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {season.seasonTeams.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mb-2">No Teams Assigned</div>
            <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
              Assign teams to this season to get started with the league
            </p>
            <Link
              href={`/sub-admin/${seasonId}/teams`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Teams
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6">
            {teamsWithDetails.map((teamDetail) => (
              <Link
                key={teamDetail.id}
                href={`/sub-admin/${seasonId}/all-teams/${teamDetail.team.id}`}
                className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  {/* Team Logo */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                    <Image
                      src={teamDetail.team.logoUrl}
                      alt={teamDetail.team.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Team Info */}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#E8A800] mb-1 transition-colors">
                          {teamDetail.team.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#7A7367]">
                          Manager: {teamDetail.team.managerName}
                        </p>
                      </div>
                      {teamDetail.trophiesWon > 0 && (
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] self-start">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span className="font-bold text-sm">{teamDetail.trophiesWon}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                      <div className="rounded-lg sm:rounded-xl bg-black/30 border border-white/5 p-2 sm:p-3">
                        <div className="text-xs text-[#7A7367] mb-1">Current Budget</div>
                        <div className="text-sm sm:text-base font-black text-emerald-400">
                          {formatCurrency(teamDetail.currentBudget)}
                        </div>
                      </div>

                      <div className="rounded-lg sm:rounded-xl bg-black/30 border border-white/5 p-2 sm:p-3">
                        <div className="text-xs text-[#7A7367] mb-1">Total Spent</div>
                        <div className="text-sm sm:text-base font-black text-[#FFB347]">
                          {formatCurrency(teamDetail.totalSpent)}
                        </div>
                      </div>

                      <div className="rounded-lg sm:rounded-xl bg-black/30 border border-white/5 p-2 sm:p-3">
                        <div className="text-xs text-[#7A7367] mb-1">Players</div>
                        <div className="text-sm sm:text-base font-black text-cyan-400">
                          {teamDetail.playerCount}
                        </div>
                      </div>

                      <div className="rounded-lg sm:rounded-xl bg-black/30 border border-white/5 p-2 sm:p-3">
                        <div className="text-xs text-[#7A7367] mb-1">Remaining</div>
                        <div className="text-sm sm:text-base font-black text-purple-400">
                          {formatCurrency(season.startingPurse - teamDetail.totalSpent)}
                        </div>
                      </div>
                    </div>

                    {/* Squad Composition */}
                    {Object.keys(teamDetail.playersByPosition).length > 0 && (
                      <div>
                        <div className="text-xs text-[#7A7367] mb-2 font-medium">Squad Composition</div>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {Object.entries(teamDetail.playersByPosition)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([position, count]) => (
                            <div
                              key={position}
                              className="px-2 sm:px-3 py-1 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold"
                            >
                              {position}: {count}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
