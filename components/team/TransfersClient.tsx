"use client"

import { useState } from "react"
import TeamLogo from "./TeamLogo"

interface ReleaseTransaction {
  id: string
  playerId: string
  playerPhoto: string
  playerName: string
  position: string
  overall: number
  club: string
  refundAmount: number
  notes: string
  processedAt: string
  teamId: string
  teamName: string
  teamLogo: string
}

interface SwapPlayer {
  id: string
  playerId: string
  playerPhoto: string
  playerName: string
  fromTeamId: string
  toTeamId: string
  playerValue: number
  position: string
  overall: number
}

interface SwapTransaction {
  id: string
  requestingTeamId: string
  requestingTeamName: string
  requestingTeamLogo: string
  targetTeamId: string
  targetTeamName: string
  targetTeamLogo: string
  processedAt: string
  players: SwapPlayer[]
}

interface TransfersClientProps {
  myTeamId: string
  myTeamName: string
  seasonName: string
  releases: ReleaseTransaction[]
  swaps: SwapTransaction[]
}

export default function TransfersClient({
  myTeamId,
  myTeamName,
  seasonName,
  releases,
  swaps,
}: TransfersClientProps) {
  const [activeTab, setActiveTab] = useState<"swaps" | "releases">("swaps")
  const [filterScope, setFilterScope] = useState<"all" | "my">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter releases based on search query and scope
  const filteredReleases = releases.filter((rel) => {
    const matchesSearch =
      rel.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.teamName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesScope = filterScope === "all" ? true : rel.teamId === myTeamId
    return matchesSearch && matchesScope
  })

  // Filter swaps based on search query and scope
  const filteredSwaps = swaps.filter((swap) => {
    const matchesSearch =
      swap.requestingTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      swap.targetTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      swap.players.some((p) => p.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesScope =
      filterScope === "all"
        ? true
        : swap.requestingTeamId === myTeamId || swap.targetTeamId === myTeamId
    return matchesSearch && matchesScope
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Helper to format currency (Kept £ symbol matching finance summary layout)
  const formatCurrency = (val: number) => {
    return `£${(val).toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-8 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6sm:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
                  League Transfers
                </span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                Chronological ledger of player swaps and roster releases <span className="text-gray-600">•</span> {seasonName}
              </p>
            </div>
            
            {/* Scope Toggle */}
            <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5 select-none shrink-0 shadow-inner">
              <button
                onClick={() => setFilterScope("all")}
                className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterScope === "all"
                    ? "bg-[#E8A800] text-black shadow-lg shadow-[#E8A800]/25"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                All Teams
              </button>
              <button
                onClick={() => setFilterScope("my")}
                className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterScope === "my"
                    ? "bg-[#E8A800] text-black shadow-lg shadow-[#E8A800]/25"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {myTeamName} Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Controls: Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-5 justify-between items-center mb-8 pb-4 border-b border-white/[0.04]">
          {/* Tabs */}
          <div className="flex w-full md:w-auto overflow-x-auto scrollbar-none gap-2">
            <button
              onClick={() => setActiveTab("swaps")}
              className={`pb-4 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all relative cursor-pointer font-mono ${
                activeTab === "swaps"
                  ? "border-[#E8A800] text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.1)]"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>Done Swaps</span>
                {filteredSwaps.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === "swaps" ? "bg-[#E8A800]/10 text-[#E8A800]" : "bg-white/5 text-gray-500"
                  }`}>
                    {filteredSwaps.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("releases")}
              className={`pb-4 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all relative cursor-pointer font-mono ${
                activeTab === "releases"
                  ? "border-[#E8A800] text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.1)]"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>Done Releases</span>
                {filteredReleases.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === "releases" ? "bg-[#E8A800]/10 text-[#E8A800]" : "bg-white/5 text-gray-500"
                  }`}>
                    {filteredReleases.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search player or team log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all text-xs font-mono"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "swaps" ? (
          filteredSwaps.length > 0 ? (
            <div className="space-y-6">
              {filteredSwaps.map((swap) => {
                const requestingTeamPlayers = swap.players.filter((p) => p.fromTeamId === swap.requestingTeamId)
                const targetTeamPlayers = swap.players.filter((p) => p.fromTeamId === swap.targetTeamId)

                return (
                  <div
                    key={swap.id}
                    className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 hover:border-white/10 p-5 sm:p-7 transition-all duration-300 shadow-xl backdrop-blur-xl relative overflow-hidden group"
                  >
                    {/* Swap Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/[0.04] pb-4 mb-5 gap-2 font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-400">Approved Swap Transaction</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
                        {formatDate(swap.processedAt)}
                      </div>
                    </div>

                    {/* Swap Mechanics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6">
                      {/* Left: Requesting Team */}
                      <div className="md:col-span-2 flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1">
                          <TeamLogo logoUrl={swap.requestingTeamLogo} teamName={swap.requestingTeamName} size="xs" />
                          <span className="font-black text-white text-base sm:text-lg tracking-tight">{swap.requestingTeamName}</span>
                        </div>
                        <div className="space-y-2 bg-black/40 border border-white/5 rounded-2xl p-4">
                          <div className="text-[9px] text-gray-500 font-extrabold mb-2 uppercase tracking-widest font-mono border-b border-white/[0.02] pb-1.5">Acquisitions</div>
                          {targetTeamPlayers.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="relative w-8.5 h-8.5 rounded-full overflow-hidden bg-black border border-white/5 flex-shrink-0">
                                  <img
                                    src={p.playerPhoto}
                                    alt={p.playerName}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-white truncate">{p.playerName}</div>
                                  <div className="text-[9px] text-gray-400 font-bold uppercase font-mono mt-0.5">
                                    {p.position} <span className="text-gray-600">•</span> OVR {p.overall}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-black text-[#E8A800] font-mono shrink-0">{formatCurrency(p.playerValue)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Middle: Swap Indicator */}
                      <div className="flex flex-col items-center justify-center md:col-span-1 py-2">
                        <div className="w-11 h-11 rounded-full bg-[#0c0c0e]/80 border border-white/5 flex items-center justify-center text-[#E8A800] shadow-2xl relative group-hover:scale-110 transition-transform duration-300">
                          <div className="absolute inset-0 bg-[#E8A800]/5 rounded-full blur-md" />
                          <svg className="w-5 h-5 text-[#E8A800] filter drop-shadow-[0_0_8px_rgba(232,168,0,0.3)] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                      </div>

                      {/* Right: Target Team */}
                      <div className="md:col-span-2 flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1 justify-end">
                          <span className="font-black text-white text-base sm:text-lg tracking-tight">{swap.targetTeamName}</span>
                          <TeamLogo logoUrl={swap.targetTeamLogo} teamName={swap.targetTeamName} size="xs" />
                        </div>
                        <div className="space-y-2 bg-black/40 border border-white/5 rounded-2xl p-4">
                          <div className="text-[9px] text-gray-500 font-extrabold mb-2 uppercase tracking-widest font-mono border-b border-white/[0.02] pb-1.5">Acquisitions</div>
                          {requestingTeamPlayers.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="relative w-8.5 h-8.5 rounded-full overflow-hidden bg-black border border-white/5 flex-shrink-0">
                                  <img
                                    src={p.playerPhoto}
                                    alt={p.playerName}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-white truncate">{p.playerName}</div>
                                  <div className="text-[9px] text-gray-400 font-bold uppercase font-mono mt-0.5">
                                    {p.position} <span className="text-gray-600">•</span> OVR {p.overall}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-black text-[#E8A800] font-mono shrink-0">{formatCurrency(p.playerValue)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0c0c0e]/80 border border-white/5 rounded-3xl backdrop-blur-2xl shadow-xl">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">No completed swaps found</h3>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wide">No completed swaps exist matching these filters.</p>
            </div>
          )
        ) : filteredReleases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredReleases.map((rel) => (
              <div
                key={rel.id}
                className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 hover:border-white/10 p-5 sm:p-6 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.01] rounded-full blur-xl pointer-events-none" />
                
                <div>
                  {/* Release Header */}
                  <div className="flex justify-between items-center border-b border-white/[0.04] pb-3 mb-4 font-mono">
                    <div className="flex items-center gap-2">
                      <TeamLogo logoUrl={rel.teamLogo} teamName={rel.teamName} size="xs" />
                      <span className="font-black text-white text-xs uppercase tracking-wider truncate max-w-[150px] sm:max-w-none">
                        {rel.teamName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">{formatDate(rel.processedAt)}</span>
                  </div>

                  {/* Player details */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                      <img
                        src={rel.playerPhoto}
                        alt={rel.playerName}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white text-base mb-1 truncate">{rel.playerName}</h3>
                      <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-gray-500 uppercase font-mono tracking-wider">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-gray-400 border border-white/5">{rel.position}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-gray-400 border border-white/5">OVR {rel.overall}</span>
                        <span>•</span>
                        <span className="text-gray-600 truncate">{rel.club}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund & Status */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] bg-white/[0.005] -mx-6 -mb-6 p-6 rounded-b-3xl">
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Ledger Refund</div>
                    <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 font-mono">{formatCurrency(rel.refundAmount)}</div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20 font-mono shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                    RELEASED
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#0c0c0e]/80 border border-white/5 rounded-3xl backdrop-blur-2xl shadow-xl">
            <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">No releases logged</h3>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wide">No roster releases exist matching these filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
