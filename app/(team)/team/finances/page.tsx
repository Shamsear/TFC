import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export const metadata = {
  title: "Finances | Team Dashboard",
  description: "View team finances and transactions",
}

export default async function FinancesPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason || !seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Active Season</h1>
            <p className="text-gray-400">There is no active season at the moment.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get current season team
  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
  })

  if (!currentSeasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Not Participating</h1>
            <p className="text-gray-400">Your team is not participating in the current season.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get all transactions
  const transactions = await prisma.financial_ledger.findMany({
    where: {
      seasonTeamId: currentSeasonTeam.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate totals
  const totalSpent = transactions
    .filter((t) => t.transactionType === "PLAYER_PURCHASE")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalEarned = transactions
    .filter((t) => t.transactionType === "PLAYER_SALE")
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              {team?.name} Finances
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Current Budget</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
              ${currentSeasonTeam.currentBudget.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Starting Purse</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
              ${activeSeason.startingPurse.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Spent</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-400">
              ${totalSpent.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Earned</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">
              ${totalEarned.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6">Transaction History</h2>
          {transactions.length > 0 ? (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-[#7A7367] uppercase">
                        Date
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-[#7A7367] uppercase">
                        Type
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-[#7A7367] uppercase hidden sm:table-cell">
                        Player
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-[#7A7367] uppercase hidden md:table-cell">
                        Description
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-[#7A7367] uppercase">
                        Amount
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-[#7A7367] uppercase hidden lg:table-cell">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#D4CCBB]">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span
                            className={`inline-flex px-2 sm:px-3 py-1 rounded-lg text-xs font-medium ${
                              transaction.transactionType === "INITIAL_PURSE"
                                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                : transaction.transactionType === "PLAYER_PURCHASE"
                                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                : transaction.transactionType === "PLAYER_SALE"
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                            }`}
                          >
                            {transaction.transactionType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white font-medium hidden sm:table-cell">
                          {transaction.playerName || "-"}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white hidden md:table-cell">
                          <div className="line-clamp-1">{transaction.description || "-"}</div>
                        </td>
                        <td
                          className={`px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-black ${
                            transaction.amount >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {transaction.amount >= 0 ? "+" : ""}£
                          {Math.abs(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-black text-white hidden lg:table-cell">
                          £{transaction.newBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[#7A7367] text-sm sm:text-base">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
