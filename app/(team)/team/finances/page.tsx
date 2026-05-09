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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{team?.name} Finances</h1>
              <p className="text-gray-400">{activeSeason.name}</p>
            </div>
            <Link
              href="/team"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Current Budget</div>
              <div className="text-3xl font-bold text-white">
                ${currentSeasonTeam.currentBudget.toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Starting Purse</div>
              <div className="text-3xl font-bold text-white">
                ${activeSeason.startingPurse.toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Total Spent</div>
              <div className="text-3xl font-bold text-red-400">
                ${totalSpent.toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Total Earned</div>
              <div className="text-3xl font-bold text-green-400">
                ${totalEarned.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
          {transactions.length > 0 ? (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-white/5">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${
                              transaction.transactionType === "INITIAL_PURSE"
                                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                : transaction.transactionType === "PLAYER_PURCHASE"
                                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                : transaction.transactionType === "PLAYER_SALE"
                                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                : "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                            }`}
                          >
                            {transaction.transactionType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {transaction.description || "-"}
                        </td>
                        <td
                          className={`px-6 py-4 text-right text-sm font-bold ${
                            transaction.transactionType === "PLAYER_SALE"
                              ? "text-green-400"
                              : transaction.transactionType === "INITIAL_PURSE"
                              ? "text-blue-400"
                              : "text-red-400"
                          }`}
                        >
                          {transaction.transactionType === "PLAYER_SALE" ||
                          transaction.transactionType === "INITIAL_PURSE"
                            ? "+"
                            : "-"}
                          ${transaction.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-white">
                          ${transaction.newBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-gray-400">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
