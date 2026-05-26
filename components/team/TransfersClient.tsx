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

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return `£${(val).toLocaleString()}`
  }

  return (
    <div className="pt-20 pb-12">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  League Transfers
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                Chronological log of all done swaps and player releases • {seasonName}
              </p>
            </div>
            {/* Scope Toggle */}
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 select-none">
              <button
                onClick={() => setFilterScope("all")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filterScope === "all"
                    ? "bg-[#E8A800] text-black shadow-lg"
                    : "text-[#7A7367] hover:text-white"
                }`}
              >
                All Teams
              </button>
              <button
                onClick={() => setFilterScope("my")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filterScope === "my"
                    ? "bg-[#E8A800] text-black shadow-lg"
                    : "text-[#7A7367] hover:text-white"
                }`}
              >
                {myTeamName} Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 sm:mb-8">
          {/* Tabs */}
          <div className="flex border-b border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("swaps")}
              className={`pb-4 px-6 text-base font-black border-b-2 transition-all relative ${
                activeTab === "swaps"
                  ? "border-[#E8A800] text-[#E8A800]"
                  : "border-transparent text-[#7A7367] hover:text-white"
              }`}
            >
              Done Swaps
              {filteredSwaps.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/10 text-white font-medium">
                  {filteredSwaps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("releases")}
              className={`pb-4 px-6 text-base font-black border-b-2 transition-all relative ${
                activeTab === "releases"
                  ? "border-[#E8A800] text-[#E8A800]"
                  : "border-transparent text-[#7A7367] hover:text-white"
              }`}
            >
              Done Releases
              {filteredReleases.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/10 text-white font-medium">
                  {filteredReleases.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search players or teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] transition-colors text-sm"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "swaps" ? (
          filteredSwaps.length > 0 ? (
            <div className="space-y-4">
              {filteredSwaps.map((swap) => {
                const requestingTeamPlayers = swap.players.filter((p) => p.fromTeamId === swap.requestingTeamId)
                const targetTeamPlayers = swap.players.filter((p) => p.fromTeamId === swap.targetTeamId)

                return (
                  <div
                    key={swap.id}
                    className="rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 p-5 sm:p-6 transition-all"
                  >
                    {/* Swap Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-4 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-400">Approved Player Swap</span>
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {formatDate(swap.processedAt)}
                      </div>
                    </div>

                    {/* Swap Mechanics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6">
                      {/* Left: Requesting Team */}
                      <div className="md:col-span-2 flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1">
                          <TeamLogo logoUrl={swap.requestingTeamLogo} teamName={swap.requestingTeamName} size="xs" />
                          <span className="font-black text-white text-base sm:text-lg">{swap.requestingTeamName}</span>
                        </div>
                        <div className="space-y-2 bg-white/[0.01] border border-white/5 rounded-xl p-3">
                          <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Acquired</div>
                          {targetTeamPlayers.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                                  <img
                                    src={p.playerPhoto}
                                    alt={p.playerName}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-white truncate">{p.playerName}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase">
                                    {p.position} • OVR {p.overall}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-black text-[#E8A800]">{formatCurrency(p.playerValue)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Middle: Swap Indicator */}
                      <div className="flex flex-col items-center justify-center md:col-span-1 py-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] shadow-xl">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                      </div>

                      {/* Right: Target Team */}
                      <div className="md:col-span-2 flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1 justify-end">
                          <span className="font-black text-white text-base sm:text-lg">{swap.targetTeamName}</span>
                          <TeamLogo logoUrl={swap.targetTeamLogo} teamName={swap.targetTeamName} size="xs" />
                        </div>
                        <div className="space-y-2 bg-white/[0.01] border border-white/5 rounded-xl p-3">
                          <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Acquired</div>
                          {requestingTeamPlayers.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                                  <img
                                    src={p.playerPhoto}
                                    alt={p.playerName}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-white truncate">{p.playerName}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase">
                                    {p.position} • OVR {p.overall}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-black text-[#E8A800]">{formatCurrency(p.playerValue)}</div>
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
            <div className="text-center py-16 bg-white/[0.02] border border-white/10 rounded-2xl">
              <svg className="w-16 h-16 text-[#7A7367]/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">No Swaps Logged</h3>
              <p className="text-[#7A7367] text-sm">No completed player swaps found matching the filter criteria.</p>
            </div>
          )
        ) : filteredReleases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReleases.map((rel) => (
              <div
                key={rel.id}
                className="rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 p-5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Release Header */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <TeamLogo logoUrl={rel.teamLogo} teamName={rel.teamName} size="xs" />
                      <span className="font-bold text-white text-sm truncate max-w-[150px] sm:max-w-none">
                        {rel.teamName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{formatDate(rel.processedAt)}</span>
                  </div>

                  {/* Player details */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <img
                        src={rel.playerPhoto}
                        alt={rel.playerName}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base sm:text-lg mb-0.5">{rel.playerName}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                        <span>{rel.position}</span>
                        <span>•</span>
                        <span>OVR {rel.overall}</span>
                        <span>•</span>
                        <span className="text-[#7A7367]">{rel.club}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund & Status */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 bg-white/[0.01] -mx-5 -mb-5 p-5 rounded-b-2xl">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Refund Amount</div>
                    <div className="text-lg font-black text-emerald-400">{formatCurrency(rel.refundAmount)}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black border border-emerald-500/20">
                    RELEASED
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/[0.02] border border-white/10 rounded-2xl">
            <svg className="w-16 h-16 text-[#7A7367]/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">No Releases Logged</h3>
            <p className="text-[#7A7367] text-sm">No completed player releases found matching the filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
