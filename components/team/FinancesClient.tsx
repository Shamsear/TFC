"use client"

import { useState } from "react"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface Transaction {
  id: string
  transactionType: "INITIAL_PURSE" | "PLAYER_PURCHASE" | "PLAYER_SALE" | "ADJUSTMENT" | "REFUND"
  amount: number
  previousBalance: number
  newBalance: number
  description: string
  playerName?: string | null
  createdAt: Date | string
}

interface FinancesClientProps {
  initialData: {
    currentBudget: number
    startingPurse: number
    totalSpent: number
    totalEarned: number
    transactions: Transaction[]
  }
  teamName: string
  seasonName: string
}

export default function FinancesClient({ initialData, teamName, seasonName }: FinancesClientProps) {
  const [data, setData] = useState(initialData)
  const [filterType, setFilterType] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/team/finances", { cache: "no-store" })
      if (res.ok) {
        const freshData = await res.json()
        setData(freshData)
      }
    } catch (err) {
      console.error("Error refreshing finances:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter and Search Logic
  const filteredTransactions = data.transactions.filter((t) => {
    const matchesFilter = filterType === "ALL" || t.transactionType === filterType
    const matchesSearch = 
      t.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                {teamName} Finances
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">{seasonName}</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-center px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 hover:scale-105 disabled:opacity-50"
          >
            {isRefreshing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8.89M9 11l3-3m0 0l3 3m-3-3v8" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Financial Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-xs text-[#7A7367] mb-2 font-bold uppercase tracking-wider">Current Budget</div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ${data.currentBudget.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-xs text-[#7A7367] mb-2 font-bold uppercase tracking-wider">Starting Purse</div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ${data.startingPurse.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-xs text-[#7A7367] mb-2 font-bold uppercase tracking-wider">Total Spent</div>
            <div className="text-2xl sm:text-3xl font-black text-red-400">
              ${data.totalSpent.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-xs text-[#7A7367] mb-2 font-bold uppercase tracking-wider">Total Earned</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              ${data.totalEarned.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "INITIAL_PURSE", "PLAYER_PURCHASE", "PLAYER_SALE", "ADJUSTMENT", "REFUND"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filterType === type
                    ? "bg-[#E8A800] border-[#E8A800] text-[#0a0a0a]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search player or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-[#E8A800]/50 text-sm text-white placeholder-gray-500"
            />
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Transaction History table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black text-white">Transactions ({filteredTransactions.length})</h2>
          </div>
          
          {filteredTransactions.length > 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.01]">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Player</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs sm:text-sm text-[#D4CCBB] whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              transaction.transactionType === "INITIAL_PURSE"
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                : transaction.transactionType === "PLAYER_PURCHASE"
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : transaction.transactionType === "PLAYER_SALE"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                            }`}
                          >
                            {transaction.transactionType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs sm:text-sm text-white font-semibold hidden sm:table-cell whitespace-nowrap">
                          {transaction.playerName || "-"}
                        </td>
                        <td className="px-6 py-4 text-xs sm:text-sm text-white hidden md:table-cell">
                          <div className="line-clamp-1 max-w-md">{transaction.description || "-"}</div>
                        </td>
                        <td
                          className={`px-6 py-4 text-right text-xs sm:text-sm font-black whitespace-nowrap ${
                            transaction.amount >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {transaction.amount >= 0 ? "+" : "-"}£{Math.abs(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-xs sm:text-sm font-black text-white hidden lg:table-cell whitespace-nowrap">
                          £{transaction.newBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm sm:text-base font-medium">No transactions match your search or filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
