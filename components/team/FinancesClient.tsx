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

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-full text-xs font-semibold text-[#D4CCBB] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
              Financial Ledger
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                {teamName}
              </span>
              <span className="text-white"> Balance</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1.5 uppercase tracking-wider">
              {seasonName} • BUDGET TRACKING AND REAL-TIME EXPENDITURES
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-5 py-2.5 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 text-[#D4CCBB] hover:text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isRefreshing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8.89M9 11l3-3m0 0l3 3m-3-3v8" />
              </svg>
            )}
            Refresh Ledger
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Financial Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Available Budget</div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatCurrency(data.currentBudget)}
            </div>
          </div>
          
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Starting Purse</div>
            <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#FFB347] font-mono">
              {formatCurrency(data.startingPurse)}
            </div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Spent</div>
            <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">
              {formatCurrency(data.totalSpent)}
            </div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Earned</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {formatCurrency(data.totalEarned)}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center mb-8 bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "INITIAL_PURSE", "PLAYER_PURCHASE", "PLAYER_SALE", "ADJUSTMENT", "REFUND"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer border ${
                  filterType === type
                    ? "bg-[#E8A800] border-[#E8A800] text-black shadow-[0_0_15px_rgba(232,168,0,0.2)]"
                    : "bg-transparent border-white/10 text-gray-500 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80 flex-shrink-0">
            <input
              type="text"
              placeholder="Search by player or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0f] border border-white/5 rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-[#E8A800]/40 text-xs font-semibold text-white placeholder-gray-600 transition-colors shadow-inner"
            />
            <svg className="w-4 h-4 text-gray-600 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Transaction History ledger */}
        <div>
          <div className="flex items-center justify-between mb-4 pl-1">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Transactions Logs
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">({filteredTransactions.length} listed)</span>
            </h2>
          </div>
          
          {filteredTransactions.length > 0 ? (
            <div className="rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono">Ledger Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono hidden sm:table-cell">Target Player</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono hidden md:table-cell">Memo Description</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono">Amount Change</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono hidden lg:table-cell">Ledger Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group/row">
                        <td className="px-6 py-4 text-xs text-[#D4CCBB] font-mono whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
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
                        <td className="px-6 py-4 text-xs text-white font-extrabold hidden sm:table-cell whitespace-nowrap group-hover/row:text-[#FFB347] transition-colors">
                          {transaction.playerName || "-"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 hidden md:table-cell">
                          <div className="line-clamp-1 max-w-md">{transaction.description || "-"}</div>
                        </td>
                        <td
                          className={`px-6 py-4 text-right text-xs font-black font-mono whitespace-nowrap ${
                            transaction.amount >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {transaction.amount >= 0 ? "+" : "-"}£{Math.abs(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-black text-white hidden lg:table-cell whitespace-nowrap font-mono">
                          £{transaction.newBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-xl">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-black text-white mb-0.5">No Transactions Found</h3>
              <p className="text-gray-500 text-xs uppercase tracking-wider">No ledger entries match your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
