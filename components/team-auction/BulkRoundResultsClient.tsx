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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Round {round.roundNumber} Results
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {round.season.name} {round.position && (
                  <>
                    {' — '}
                    <span className="truncate max-w-[200px] sm:max-w-none inline-block align-bottom">
                      {round.position}{round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyMyResults}
                className={`px-4 py-2 rounded-lg border font-medium transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 text-[#25D366]'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {copied ? 'Copied!' : 'Copy My Results'}
              </button>
              <Link
                href="/team/auction"
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                Back to Auction
              </Link>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('by-team')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'by-team'
                  ? 'bg-[#E8A800] text-black'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              View by Team
            </button>
            <button
              onClick={() => setViewMode('by-player')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'by-player'
                  ? 'bg-[#E8A800] text-black'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              View by Player
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tiebreaker Alert */}
        {hasTiebreakers && (
          <div className="mb-6 p-6 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-amber-300 mb-2">Tiebreaker in Progress</h3>
                <p className="text-[#D4CCBB] mb-4">
                  Some players are in tiebreaker rounds. Results will be updated once resolved.
                </p>
                <div className="space-y-3">
                  {tiebreakers.filter(t => t.participants.some(p => p.teamId === teamId)).map(tie => (
                    <div key={tie.id} className="p-4 rounded-lg bg-black/30 border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <img
                            src={tie.basePlayer.photoUrl}
                            alt={tie.basePlayer.name}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{tie.basePlayer.name}</h4>
                          <p className="text-sm text-[#D4CCBB]">
                            {tie.participants.length} teams in tiebreaker • Status: {tie.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Acquisitions */}
        {myAllocations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white">Your Acquisitions</h2>
              <div className="text-lg font-bold text-emerald-400">
                Total: £{myAllocations.reduce((sum, a) => sum + a.soldPrice, 0).toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAllocations.map(alloc => (
                <div
                  key={alloc.id}
                  className="rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <img
                        src={alloc.basePlayer.photoUrl}
                        alt={alloc.basePlayer.name}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{alloc.basePlayer.name}</h3>
                      <p className="text-sm text-emerald-400">Acquired</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-emerald-500/20">
                    <div className="text-2xl font-black text-emerald-300">
                      £{alloc.soldPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results by View Mode */}
        {viewMode === 'by-team' ? (
          <div>
            <h2 className="text-2xl font-black text-white mb-4">All Results by Team</h2>
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
                      className={`rounded-xl ${
                        isMyTeam
                          ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                          : 'bg-white/5 border border-white/10'
                      } p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                            />
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${isMyTeam ? 'text-emerald-300' : 'text-white'}`}>
                              {team.name}
                            </h3>
                            <p className="text-sm text-[#D4CCBB]">
                              {teamAllocs.length} player{teamAllocs.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className={`text-2xl font-black ${isMyTeam ? 'text-emerald-300' : 'text-white'}`}>
                          £{totalSpent.toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamAllocs.map(alloc => (
                          <div
                            key={alloc.id}
                            className="p-3 rounded-lg bg-black/30 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                <img
                                  src={alloc.basePlayer.photoUrl}
                                  alt={alloc.basePlayer.name}
                                  loading="eager"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm truncate">{alloc.basePlayer.name}</h4>
                                <p className="text-xs text-[#D4CCBB]">£{alloc.soldPrice.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-white mb-4">All Results by Player</h2>
            <div className="space-y-3">
              {allocations.map(alloc => {
                const isMyTeam = alloc.teamId === teamId
                const isExpanded = expandedPlayers.has(alloc.basePlayerId)
                const playerSelections = selectionsByPlayer[alloc.basePlayerId] || []
                const hasSelections = playerSelections.length > 0

                return (
                  <div
                    key={alloc.id}
                    className={`rounded-xl ${
                      isMyTeam
                        ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div
                      className={`p-4 ${hasSelections ? 'cursor-pointer hover:bg-white/5' : ''}`}
                      onClick={() => hasSelections && togglePlayer(alloc.basePlayerId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                            <img
                              src={alloc.basePlayer.photoUrl}
                              alt={alloc.basePlayer.name}
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white">{alloc.basePlayer.name}</h3>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm ${isMyTeam ? 'text-emerald-400' : 'text-[#D4CCBB]'}`}>
                                {alloc.team.name}
                              </p>
                              {alloc.acquisitionType === 'auto_assigned' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Auto-assigned
                                </span>
                              )}
                              {alloc.acquisitionType === 'tiebreaker_won' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Tiebreaker
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-xl font-bold ${isMyTeam ? 'text-emerald-300' : 'text-white'}`}>
                            £{alloc.soldPrice.toLocaleString()}
                          </div>
                          {hasSelections && (
                            <svg
                              className={`w-5 h-5 text-[#7A7367] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Selection Details */}
                    {isExpanded && hasSelections && (
                      <div className="border-t border-white/10 p-4 bg-black/20">
                        <h4 className="text-sm font-bold text-[#D4CCBB] mb-3">Team Selections</h4>
                        <div className="space-y-2">
                          {playerSelections.map((selection, idx) => {
                            const isWinner = selection.teamId === alloc.teamId
                            return (
                              <div
                                key={`${selection.teamId}-${idx}`}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  isWinner
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : 'bg-white/5 border border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    isWinner ? 'text-emerald-300' : 'text-white'
                                  }`}>
                                    {selection.teamName}
                                  </span>
                                  {isWinner && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/30 text-emerald-200">
                                      WON
                                    </span>
                                  )}
                                </div>
                                <span className={`text-sm font-bold ${
                                  isWinner ? 'text-emerald-300' : 'text-[#D4CCBB]'
                                }`}>
                                  Priority #{selection.priority}
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
          </div>
        )}
      </div>
    </div>
  )
}
