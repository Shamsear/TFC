import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export const metadata = {
  title: "Team Dashboard | Turf Cats",
  description: "Team manager dashboard",
}

export default async function TeamDashboardPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Check if team is participating in active season
  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: activeSeason.id,
            teamId: team.id,
          },
        },
      })
    : null

  // If team is not in active season, redirect to not-in-season page
  if (!currentSeasonTeam || !activeSeason) {
    redirect("/team/not-in-season")
  }

  // Team is in active season - show dashboard
  // Get squad count for current season
  const squadCount = await prisma.transfer_history.count({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
    },
  })

  // Get upcoming matches
  const upcomingMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId: activeSeason.id,
      },
      OR: [
        { homeTeamId: currentSeasonTeam.id },
        { awayTeamId: currentSeasonTeam.id },
      ],
      status: "SCHEDULED",
    },
    include: {
      homeTeam: {
        include: {
          team: true,
        },
      },
      awayTeam: {
        include: {
          team: true,
        },
      },
      tournament: true,
    },
    orderBy: {
      matchDate: "asc",
    },
    take: 5,
  })

  // Get recent transactions
  const recentTransactions = await prisma.financial_ledger.findMany({
    where: {
      seasonTeamId: currentSeasonTeam.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  // Get active auction rounds
  const activeRounds = await prisma.rounds.findMany({
    where: {
      seasonId: activeSeason.id,
      status: 'active',
      endTime: {
        gte: new Date(), // Only rounds that haven't ended yet
      },
    },
    select: {
      id: true,
      roundNumber: true,
      position: true,
      position_group: true,
      roundType: true,
      endTime: true,
      teamRoundBids: {
        where: {
          teamId: team.id,
        },
        select: {
          submitted: true,
          bidCount: true,
        },
      },
    },
    orderBy: {
      endTime: 'asc',
    },
    take: 3,
  })

  // Get pending and active bulk tiebreakers for this team
  const pendingBulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
      status: {
        in: ['pending', 'active']
      },
      participants: {
        some: {
          teamId: team.id,
          status: 'active'
        }
      }
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      participants: {
        where: {
          status: 'active'
        },
        select: {
          teamId: true
        }
      }
    },
  })

  // Get pending normal tiebreakers for this team
  const pendingNormalTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
      status: 'active',
      teamTiebreakerBids: {
        some: {
          teamId: team.id
        }
      }
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      teamTiebreakerBids: {
        where: {
          teamId: team.id
        },
        select: {
          submitted: true,
          oldBidAmount: true,
          newBidAmount: true
        }
      }
    },
  })

  const totalPendingTiebreakers = pendingBulkTiebreakers.length + pendingNormalTiebreakers.length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Budget */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Current Budget</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">
              ${currentSeasonTeam.currentBudget.toLocaleString()}
            </div>
            <div className="text-xs text-[#7A7367]">
              Starting: ${activeSeason.startingPurse.toLocaleString()}
            </div>
          </div>

          {/* Squad Size */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Squad Size</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{squadCount}</div>
            <Link
              href="/team/squad"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] inline-flex items-center gap-1 transition-colors font-medium"
            >
              View Squad
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Upcoming Matches */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Upcoming Matches</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{upcomingMatches.length}</div>
            <Link
              href="/team/matches"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] inline-flex items-center gap-1 transition-colors font-medium"
            >
              View Schedule
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Trophies */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Trophies Won</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347] mb-1">
              {currentSeasonTeam.trophiesWon}
            </div>
            <div className="text-xs text-[#7A7367]">This season</div>
          </div>
        </div>

        {/* Pending Tiebreakers Alert */}
        {totalPendingTiebreakers > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500 flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Action Required: Tiebreakers</h2>
                  <p className="text-xs sm:text-sm text-[#D4CCBB]">
                    {totalPendingTiebreakers} tiebreaker{totalPendingTiebreakers > 1 ? 's' : ''} need{totalPendingTiebreakers === 1 ? 's' : ''} your bid
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {/* Normal Tiebreakers */}
                {pendingNormalTiebreakers.map((tie) => {
                  const teamBid = tie.teamTiebreakerBids[0]
                  return (
                    <Link
                      key={tie.id}
                      href={`/team/auction/tiebreakers/${tie.id}`}
                      className="block rounded-lg bg-black/30 border border-purple-500/30 p-3 hover:bg-black/40 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                              Normal Round
                            </span>
                          </div>
                          <div className="text-xs text-[#D4CCBB]">
                            Round {tie.round.roundNumber} • Original bid: £{tie.originalAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {teamBid?.submitted ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 animate-pulse">
                              Bid Now
                            </span>
                          )}
                          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                
                {/* Bulk Tiebreakers */}
                {pendingBulkTiebreakers.map((tie) => {
                  const isActive = tie.status === 'active'
                  const isPending = tie.status === 'pending'
                  
                  if (isActive) {
                    return (
                      <Link
                        key={tie.id}
                        href={`/team/auction/bulk-tiebreakers/${tie.id}`}
                        className="block rounded-lg bg-black/30 border border-amber-500/30 hover:bg-amber-500/5 p-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                                Bulk Round
                              </span>
                            </div>
                            <div className="text-xs text-[#D4CCBB]">
                              Round {tie.round.roundNumber} • £{tie.basePrice.toLocaleString()} • {tie.participants.length} teams tied
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                            Active - Bid Now →
                          </span>
                        </div>
                      </Link>
                    )
                  }
                  
                  return (
                    <div
                      key={tie.id}
                      className="rounded-lg bg-black/30 border border-gray-500/30 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                              Bulk Round
                            </span>
                          </div>
                          <div className="text-xs text-[#D4CCBB]">
                            Round {tie.round.roundNumber} • £{tie.basePrice.toLocaleString()} • {tie.participants.length} teams tied
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
                          Awaiting Admin
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Auction Rounds - Prominent Alert */}
        {activeRounds.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 border-2 border-[#E8A800]/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800] flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Active Auction Rounds</h2>
                  <p className="text-xs sm:text-sm text-[#D4CCBB]">{activeRounds.length} round{activeRounds.length > 1 ? 's' : ''} in progress</p>
                </div>
              </div>
              <div className="space-y-3">
                {activeRounds.map((round) => {
                  const teamBid = round.teamRoundBids[0]
                  const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
                  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
                  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
                  const isUrgent = hoursRemaining < 2
                  const roundPath = round.roundType === 'bulk'
                    ? `/team/auction/bulk-rounds/${round.id}`
                    : `/team/auction/rounds/${round.id}`

                  return (
                    <Link
                      key={round.id}
                      href={roundPath}
                      className="block bg-black/40 border border-white/20 rounded-lg p-4 hover:border-[#E8A800] hover:bg-black/60 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-black text-base sm:text-lg">Round {round.roundNumber}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              LIVE
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#D4CCBB]">
                            <span className="font-medium">
                              {round.position ? `${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}` : 'All Positions'}
                            </span>
                            <span className="text-[#7A7367]">•</span>
                            <span>{round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg sm:text-xl font-black ${isUrgent ? 'text-red-400' : 'text-[#FFB347]'}`}>
                            {hoursRemaining > 0 && `${hoursRemaining}h `}
                            {minutesRemaining}m
                          </div>
                          <div className="text-xs text-[#7A7367]">remaining</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {teamBid ? (
                            teamBid.submitted ? (
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                ✓ Submitted ({teamBid.bidCount} bids)
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                In Progress ({teamBid.bidCount} bids)
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                              Not Started
                            </span>
                          )}
                        </div>
                        <div className="text-[#E8A800] group-hover:text-[#FFC93A] font-bold text-sm inline-flex items-center gap-1 transition-colors">
                          {teamBid?.submitted ? 'View Bids' : 'Place Bids'}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Link
                href="/team/auction"
                className="mt-4 block text-center py-3 rounded-lg bg-[#E8A800] hover:bg-[#FFC93A] text-black font-bold text-sm transition-colors"
              >
                View All Auction Rounds
              </Link>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Upcoming Matches */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-black text-white">Upcoming Matches</h2>
              <Link
                href="/team/matches"
                className="text-xs sm:text-sm text-[#E8A800] hover:text-[#FFC93A] font-medium inline-flex items-center gap-1 transition-colors"
              >
                View All
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/team/matches/${match.id}`}
                    className="block bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="text-xs text-[#7A7367] mb-2">
                      {new Date(match.matchDate).toLocaleDateString()} • {match.tournament.name}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-bold text-sm truncate">{match.homeTeam.team.name}</span>
                      <span className="text-[#7A7367] text-xs flex-shrink-0">vs</span>
                      <span className="text-white font-bold text-sm truncate text-right">{match.awayTeam.team.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[#7A7367] text-sm">No upcoming matches scheduled</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-black text-white">Recent Transactions</h2>
              <Link
                href="/team/finances"
                className="text-xs sm:text-sm text-[#E8A800] hover:text-[#FFC93A] font-medium inline-flex items-center gap-1 transition-colors"
              >
                View All
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {transaction.transactionType.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`font-black text-xs sm:text-sm ${
                          transaction.transactionType === "PLAYER_SALE"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.transactionType === "PLAYER_SALE" ? "+" : "-"}$
                        {transaction.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-[#7A7367] line-clamp-1">{transaction.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[#7A7367] text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <Link
              href="/team/auction"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Auction</div>
            </Link>
            <Link
              href="/team/auction-planner"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Planner</div>
            </Link>
            <Link
              href="/team/squad"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Squad</div>
            </Link>
            <Link
              href="/team/matches"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Matches</div>
            </Link>
            <Link
              href="/team/tournaments"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Tournaments</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
