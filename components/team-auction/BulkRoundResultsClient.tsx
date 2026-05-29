'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  photoUrl: string
}

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface Allocation {
  id: string
  basePlayerId: string
  teamId: string
  soldPrice: number
  acquisitionType: string
  acquisitionNotes: string | null
  basePlayer: Player
  team: Team
}

interface TiebreakerParticipant {
  teamId: string
  status: string
  submitted: boolean
  newBidAmount: number | null
  team: Team
}

interface Tiebreaker {
  id: number
  basePlayerId: string
  status: string
  basePlayer: Player
  participants: TiebreakerParticipant[]
}

interface Round {
  id: string
  roundNumber: number
  position: string | null
  position_group?: string | null
  status: string
  season: {
    id: string
    name: string
  }
}

interface BulkRoundResultsClientProps {
  round: Round
  allocations: Allocation[]
  tiebreakers: Tiebreaker[]
  teamId: string
  selectionsByPlayer: Record<string, Array<{ teamId: string; teamName: string; priority: number }>>
  playerNameMap: Map<string, string>
}

export default function BulkRoundResultsClient({
  round,
  allocations,
  tiebreakers,
  teamId,
  selectionsByPlayer,
  playerNameMap
}: BulkRoundResultsClientProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'by-team' | 'by-player'>('by-team')

  const myAllocations = allocations.filter(a => a.teamId === teamId)
  const hasTiebreakers = tiebreakers.filter(t => 
    t.participants.some(p => p.teamId === teamId)
  ).length > 0

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(playerId)) {
        newSet.delete(playerId)
      } else {
        newSet.add(playerId)
      }
      return newSet
    })
  }

  // Group allocations by team
  const allocationsByTeam = allocations.reduce((acc, alloc) => {
    if (!acc[alloc.teamId]) {
      acc[alloc.teamId] = {
        team: alloc.team,
        allocations: []
      }
    }
    acc[alloc.teamId].allocations.push(alloc)
    return acc
  }, {} as Record<string, { team: Team; allocations: Allocation[] }>)

  const handleCopyMyResults = () => {
    if (myAllocations.length === 0) {
      alert('No players acquired in this round')
      return
    }

    const positionText = round.position || 'All Positions'
    const totalSpent = myAllocations.reduce((sum, a) => sum + a.soldPrice, 0)

    const message = `*${round.season.name}*

*Round ${round.roundNumber} - Bulk Round Results*

*Position:* ${positionText}

*Summary:*
• Players Acquired: ${myAllocations.length}
• Total Spent: £${totalSpent.toLocaleString()}

*Players:*
${myAllocations.map((alloc, idx) => `${idx + 1}. ${alloc.basePlayer.name} - £${alloc.soldPrice.toLocaleString()}`).join('\n')}`

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-full text-xs font-semibold text-[#D4CCBB] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {round.season.name}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2.5">
              Round {round.roundNumber} Results
              {round.position && (
                <span className="text-xs font-black uppercase tracking-wider bg-white/[0.03] border border-white/10 px-2 py-0.5 rounded-md text-gray-400">
                  {round.position}{round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Share via WhatsApp */}
            <button
              onClick={handleCopyMyResults}
              className={`group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border font-extrabold tracking-wide uppercase text-xs transition-all duration-300 transform active:scale-95 cursor-pointer shadow-md hover:-translate-y-0.5 ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20 text-[#25D366] hover:border-[#25D366]/50 hover:shadow-[0_0_25px_rgba(37,211,102,0.3)] animate-pulse'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>{copied ? 'Copied text!' : 'Share Results'}</span>
            </button>

            {/* Back to Draft Room */}
            <Link
              href="/team/auction"
              className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-1 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Draft
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Active Tiebreakers Alert */}
        {hasTiebreakers && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/[0.02] to-transparent border border-amber-500/20 p-5 sm:p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl animate-[pulse_3s_infinite_ease-in-out]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-inner">
                <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">
                  Contested Tiebreaker in Progress
                </h3>
                <p className="text-xs sm:text-sm text-amber-200 leading-relaxed mb-4">
                  Some players are currently locked in active tiebreaker matches. Full final allocations will be logged once finalized.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiebreakers.filter(t => t.participants.some(p => p.teamId === teamId)).map(tie => (
                    <div key={tie.id} className="p-4 rounded-xl bg-[#0d0d0d]/40 border border-amber-500/25 flex items-center gap-3 shadow-md">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        <img
                          src={tie.basePlayer.photoUrl}
                          alt={tie.basePlayer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-white text-sm truncate">{tie.basePlayer.name}</h4>
                        <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest mt-0.5">
                          {tie.participants.length} contested teams • Status: {tie.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acquisitions Celebratory Showcase */}
        {myAllocations.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Your Acquisitions
              </h2>
              <div className="text-sm font-black text-[#E8A800]">
                Total Spent: <span className="text-emerald-400">£{myAllocations.reduce((sum, a) => sum + a.soldPrice, 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myAllocations.map(alloc => (
                <div
                  key={alloc.id}
                  className="relative rounded-2xl bg-emerald-950/10 border-2 border-emerald-500/20 p-4 shadow-xl overflow-hidden group hover:border-emerald-500/40 hover:shadow-emerald-950/20 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none -mr-8 -mt-8" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    {/* Player Frame */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/25 to-transparent border border-emerald-500/30 flex-shrink-0 group-hover:border-emerald-500/50 transition-colors shadow-lg">
                      <img
                        src={alloc.basePlayer.photoUrl}
                        alt={alloc.basePlayer.name}
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-500 relative z-10"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-20" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-white text-base group-hover:text-emerald-400 transition-colors leading-tight truncate tracking-wide">
                        {alloc.basePlayer.name}
                      </h3>
                      <p className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Acquisition Secured
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/10 mt-3.5 flex items-baseline gap-1 relative z-10 justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-medium">Final Price</span>
                    <span className="text-xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)] font-mono">
                      £{alloc.soldPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Mode Toggle Capsule Pill */}
        <div className="flex justify-start mb-6">
          <div className="inline-flex gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl shadow-lg">
            <button
              onClick={() => setViewMode('by-team')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
                viewMode === 'by-team'
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              View by Team
            </button>
            <button
              onClick={() => setViewMode('by-player')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
                viewMode === 'by-player'
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              View by Player
            </button>
          </div>
        </div>

        {/* Display Content Grid based on Toggle */}
        {viewMode === 'by-team' ? (
          <div className="space-y-6">
            {Object.entries(allocationsByTeam)
              .sort((a, b) => {
                // My team first
                if (a[0] === teamId) return -1
                if (b[0] === teamId) return 1
                // Then by total spent
                const aTotal = a[1].allocations.reduce((sum, alloc) => sum + alloc.soldPrice, 0)
                const bTotal = b[1].allocations.reduce((sum, alloc) => sum + alloc.soldPrice, 0)
                return bTotal - aTotal
              })
              .map(([tId, { team, allocations: teamAllocs }]) => {
                const isMyTeam = tId === teamId
                const totalSpent = teamAllocs.reduce((sum, a) => sum + a.soldPrice, 0)

                return (
                  <div
                    key={tId}
                    className={`relative rounded-2xl p-6 backdrop-blur-xl shadow-xl overflow-hidden group transition-all duration-300 border ${
                      isMyTeam
                        ? 'bg-emerald-500/[0.01] border-emerald-500/20 shadow-[0_0_35px_rgba(16,185,129,0.05)]'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between mb-5 relative z-10">
                      <div className="flex items-center gap-3">
                        {/* Team Badge Frame */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0d0d0d] border border-white/10 p-1 flex-shrink-0 group shadow-lg">
                          <img
                            src={team.logoUrl}
                            alt={team.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                          />
                        </div>
                        <div>
                          <h3 className={`text-lg font-black tracking-tight ${isMyTeam ? 'text-emerald-400' : 'text-white'}`}>
                            {team.name} {isMyTeam && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded ml-1 uppercase font-bold">Your Club</span>}
                          </h3>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                            {teamAllocs.length} player{teamAllocs.length !== 1 ? 's' : ''} acquired
                          </p>
                        </div>
                      </div>
                      <div className={`text-xl sm:text-2xl font-black ${isMyTeam ? 'text-emerald-400' : 'text-white'}`}>
                        £{totalSpent.toLocaleString()}
                      </div>
                    </div>

                    {/* Team Players Roster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                      {teamAllocs.map(alloc => (
                        <div
                          key={alloc.id}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 hover:bg-[#0d0d0d]/60 transition-all duration-300 group/item flex items-center gap-3 hover:-translate-y-0.5 shadow-md shadow-black/10"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 relative">
                            <img
                              src={alloc.basePlayer.photoUrl}
                              alt={alloc.basePlayer.name}
                              className="w-full h-full object-cover relative z-10 group-hover/item:scale-105 transition-transform"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-white text-sm truncate group-hover/item:text-[#E8A800] transition-colors">{alloc.basePlayer.name}</h4>
                            <p className="text-xs text-emerald-400 font-black uppercase mt-0.5 font-mono">£{alloc.soldPrice.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="space-y-4">
            {allocations.map(alloc => {
              const isMyTeam = alloc.teamId === teamId
              const isExpanded = expandedPlayers.has(alloc.basePlayerId)
              const playerSelections = selectionsByPlayer[alloc.basePlayerId] || []
              const hasSelections = playerSelections.length > 0

              return (
                <div
                  key={alloc.id}
                  className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                    isMyTeam
                      ? 'bg-emerald-500/[0.01] border-emerald-500/20'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div
                    className={`p-4 flex items-center justify-between gap-4 select-none ${hasSelections ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                    onClick={() => hasSelections && togglePlayer(alloc.basePlayerId)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Player Image */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 shadow-inner">
                        <img
                          src={alloc.basePlayer.photoUrl}
                          alt={alloc.basePlayer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-white text-base truncate">{alloc.basePlayer.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className={`text-xs font-extrabold uppercase tracking-wider ${isMyTeam ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {alloc.team.name}
                          </p>
                          {alloc.acquisitionType === 'auto_assigned' && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
                              Auto-assigned
                            </span>
                          )}
                          {alloc.acquisitionType === 'tiebreaker_won' && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 tracking-wider">
                              Tiebreaker Winner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 flex-shrink-0">
                      <div className={`text-lg font-black tracking-tight ${isMyTeam ? 'text-emerald-400' : 'text-white'}`}>
                        £{alloc.soldPrice.toLocaleString()}
                      </div>
                      {hasSelections && (
                        <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                          <svg
                            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Selection Details */}
                  {isExpanded && hasSelections && (
                    <div className="border-t border-white/5 p-4 sm:p-5 bg-[#070707]/60 backdrop-blur-md animate-[fadeIn_0.25s_ease-out]">
                      <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-3.5">Contesting Team Selections</h4>
                      <div className="space-y-2.5">
                        {playerSelections.map((selection, idx) => {
                          const isWinner = selection.teamId === alloc.teamId
                          return (
                            <div
                              key={`${selection.teamId}-${idx}`}
                              className={`flex items-center justify-between p-3.5 rounded-xl transition-all border ${
                                isWinner
                                  ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                  : 'bg-white/[0.01] border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black tracking-tight ${
                                  isWinner ? 'text-emerald-400' : 'text-white'
                                }`}>
                                  {selection.teamName}
                                </span>
                                {isWinner && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider ml-1">
                                    CLAIMED
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs font-bold ${
                                isWinner ? 'text-emerald-400' : 'text-gray-400'
                              }`}>
                                Priority Selection #{selection.priority}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
