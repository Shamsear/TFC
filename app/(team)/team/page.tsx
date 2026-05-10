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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-4">
            {team.logoUrl && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-transparent ring-2 ring-[#E8A800]/20">
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  {team.name}
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">Manager: {team.managerName}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg">
            <span className="text-[#E8A800] font-medium text-xs sm:text-sm">Current Season:</span>
            <span className="text-white font-bold text-xs sm:text-sm">{activeSeason.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/team/squad"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">View Squad</div>
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
            <Link
              href="/team/profile"
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors">Team Profile</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
