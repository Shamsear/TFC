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
    include: {
      seasonTeams: {
        include: {
          season: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Get current season team data
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

  // Get squad count for current season
  const squadCount = activeSeason
    ? await prisma.transfer_history.count({
        where: {
          seasonId: activeSeason.id,
          teamId: team.id,
        },
      })
    : 0

  // Get upcoming matches
  const upcomingMatches = activeSeason
    ? await prisma.matches.findMany({
        where: {
          tournament: {
            seasonId: activeSeason.id,
          },
          OR: [
            { homeTeamId: currentSeasonTeam?.id },
            { awayTeamId: currentSeasonTeam?.id },
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
    : []

  // Get recent transactions
  const recentTransactions = currentSeasonTeam
    ? await prisma.financial_ledger.findMany({
        where: {
          seasonTeamId: currentSeasonTeam.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      })
    : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {team.logoUrl && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5">
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <p className="text-gray-400">Manager: {team.managerName}</p>
            </div>
          </div>
          {activeSeason && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg">
              <span className="text-[#E8A800] font-medium">Current Season:</span>
              <span className="text-white">{activeSeason.name}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Budget */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Current Budget</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-white">
              ${currentSeasonTeam?.currentBudget.toLocaleString() || "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Starting: ${activeSeason?.startingPurse.toLocaleString() || "0"}
            </div>
          </div>

          {/* Squad Size */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Squad Size</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-white">{squadCount}</div>
            <Link
              href="/team/squad"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] mt-1 inline-block"
            >
              View Squad →
            </Link>
          </div>

          {/* Upcoming Matches */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Upcoming Matches</span>
              <span className="text-2xl">⚽</span>
            </div>
            <div className="text-3xl font-bold text-white">{upcomingMatches.length}</div>
            <Link
              href="/team/matches"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] mt-1 inline-block"
            >
              View Schedule →
            </Link>
          </div>

          {/* Trophies */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Trophies Won</span>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {currentSeasonTeam?.trophiesWon || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">This season</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Matches */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Upcoming Matches</h2>
              <Link
                href="/team/matches"
                className="text-sm text-[#E8A800] hover:text-[#FFC93A]"
              >
                View All →
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <div className="text-xs text-gray-400 mb-2">
                      {new Date(match.matchDate).toLocaleDateString()} •{" "}
                      {match.tournament.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">
                        {match.homeTeam.team.name}
                      </span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-white font-medium">
                        {match.awayTeam.team.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No upcoming matches scheduled
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <Link
                href="/team/finances"
                className="text-sm text-[#E8A800] hover:text-[#FFC93A]"
              >
                View All →
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">
                        {transaction.transactionType.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`font-bold ${
                          transaction.transactionType === "PLAYER_SALE"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.transactionType === "PLAYER_SALE" ? "+" : "-"}$
                        {transaction.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No transactions yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/team/squad"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="text-white font-medium">View Squad</div>
          </Link>
          <Link
            href="/team/matches"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">⚽</div>
            <div className="text-white font-medium">Matches</div>
          </Link>
          <Link
            href="/team/tournaments"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-white font-medium">Tournaments</div>
          </Link>
          <Link
            href="/team/profile"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-white font-medium">Team Profile</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
