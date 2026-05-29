'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  photoUrl: string
}

interface Team {
  id: string
  name: string
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

interface Tiebreaker {
  id: number
  basePlayerId: string
  basePrice: number
  status: string
  currentHighestBid: number | null
  teamsRemaining: number
  basePlayer: Player
  participants: Array<{
    teamId: string
  }>
}

interface Round {
  id: string
  roundNumber: number
  position: string | null
  status: string
  season: {
    id: string
    name: string
  }
}

interface RoundResultsClientProps {
  round: Round
  allocations: Allocation[]
  tiebreakers: Tiebreaker[]
  teamId: string
  bidsByPlayer: Record<string, Array<{ teamId: string; teamName: string; amount: number }>>
  playerNameMap: Map<string, string>
}

export default function RoundResultsClient({
  round,
  allocations,
  tiebreakers,
  teamId,
  bidsByPlayer,
  playerNameMap
}: RoundResultsClientProps) {
  const router = useRouter()
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const myAllocations = allocations.filter(a => a.teamId === teamId)
  const hasTiebreakers = tiebreakers.length > 0

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

  const handleCopyMyBids = () => {
    const myBids: Array<{ playerName: string; amount: number; won: boolean }> = []
    
    Object.entries(bidsByPlayer).forEach(([playerId, bids]) => {
      const myBid = bids.find(b => b.teamId === teamId)
      if (myBid) {
        const allocation = allocations.find(a => a.basePlayerId === playerId)
        const playerName = allocation?.basePlayer.name || playerNameMap.get(playerId) || 'Unknown Player'
        const won = allocation?.teamId === teamId
        myBids.push({
          playerName,
          amount: myBid.amount,
          won
        })
      }
    })

    if (myBids.length === 0) {
      alert('No bids found for this round')
      return
    }

    myBids.sort((a, b) => b.amount - a.amount)

    const positionText = round.position || 'All Positions'
    const wonCount = myBids.filter(b => b.won).length
    const totalSpent = myBids.filter(b => b.won).reduce((sum, b) => sum + b.amount, 0)

    const message = `*${round.season.name}*

*Round ${round.roundNumber} - My Bids*

*Position:* ${positionText}

*Summary:*
• Total Bids: ${myBids.length}
• Players Won: ${wonCount}
• Total Spent: £${totalSpent.toLocaleString()}

*Bids:*
${myBids.map((bid, idx) => `${idx + 1}. ${bid.playerName} - £${bid.amount.toLocaleString()}${bid.won ? ' ✓ WON' : ''}`).join('\n')}`

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  const getPositionBadgeClass = (pos: string) => {
    const p = pos.toUpperCase()
    if (p.includes('GK')) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    if (p.includes('DEF') || p.includes('CB') || p.includes('LB') || p.includes('RB')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    }
    if (p.includes('MID') || p.includes('CM') || p.includes('CMF') || p.includes('AMF') || p.includes('DMF') || p.includes('LM') || p.includes('RM')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }
    return 'bg-red-500/10 text-red-400 border border-red-500/20'
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-20 relative overflow-hidden font-sans">
      {/* Background radial spotlights */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Panel */}
      <div className="relative border-b border-white/[0.06] bg-black/40 backdrop-blur-xl z-10 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Draft Room Chambers</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-1">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
                  Round {round.roundNumber} Results
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 font-mono font-bold uppercase tracking-wider">
                {round.season.name} {round.position && `— ${round.position}`}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleCopyMyBids}
                className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20 text-[#25D366] hover:scale-[1.02]'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {copied ? 'Copied!' : 'Copy My Bids'}
              </button>
              <Link
                href="/team/auction"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-white hover:bg-white/[0.08] text-xs font-black uppercase tracking-wider transition-all"
              >
                Back to Auction
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        
        {/* Tiebreaker Warning Panel */}
        {hasTiebreakers && (
          <div className="mb-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider font-mono">Tiebreaker Endorsement Required</h3>
                <p className="text-sm text-gray-400 mt-1">
                  You are currently tied in {tiebreakers.length} negotiation round{tiebreakers.length > 1 ? 's' : ''}. The league administrator will adjudicate remaining bids to finalize player placement.
                </p>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tiebreakers.map(tie => (
                    <div key={tie.id} className="p-3 rounded-xl bg-black/40 border border-white/[0.04] flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                        <img
                          src={tie.basePlayer.photoUrl}
                          alt={tie.basePlayer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-white text-sm truncate">{tie.basePlayer.name}</h4>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                          Base: £{tie.basePrice.toLocaleString()} • {tie.participants.length} Clubs Tied
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Acquisitions Showcase Grid */}
        {myAllocations.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Your Signed Acquisitions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myAllocations.map(alloc => (
                <div
                  key={alloc.id}
                  className="rounded-2xl bg-emerald-950/10 border border-emerald-500/25 p-5 shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                  <div className="flex items-center gap-4.5 mb-4">
                    <div className="w-15 h-15 rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                      <img
                        src={alloc.basePlayer.photoUrl}
                        alt={alloc.basePlayer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-white text-base truncate leading-tight">{alloc.basePlayer.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider font-mono mt-1">
                        Contract Finalized
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Acquisition Fee</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                      £{alloc.soldPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Results Ledger List */}
        <div>
          <h2 className="text-xl font-black text-white mb-4 uppercase tracking-wider font-mono">
            Full Draft Sheet Results
          </h2>
          <div className="space-y-3.5">
            {allocations.map(alloc => {
              const isMyTeam = alloc.teamId === teamId
              const isExpanded = expandedPlayers.has(alloc.basePlayerId)
              const playerBids = bidsByPlayer[alloc.basePlayerId] || []
              const hasBids = playerBids.length > 0

              return (
                <div
                  key={alloc.id}
                  className={`rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                    isMyTeam
                      ? 'bg-[#E8A800]/5 border-[#E8A800]/25 shadow-[0_0_20px_rgba(232,168,0,0.04)]'
                      : 'bg-neutral-900/40 border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <div
                    className={`p-4.5 ${hasBids ? 'cursor-pointer' : ''}`}
                    onClick={() => hasBids && togglePlayer(alloc.basePlayerId)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                          <img
                            src={alloc.basePlayer.photoUrl}
                            alt={alloc.basePlayer.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-white text-base truncate leading-tight mb-1">{alloc.basePlayer.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold ${isMyTeam ? 'text-[#E8A800] font-black' : 'text-gray-400'}`}>
                              {alloc.team.name}
                            </span>
                            {alloc.acquisitionType === 'auto_assigned' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider font-mono">
                                Auto-assigned
                              </span>
                            )}
                            {alloc.acquisitionType === 'tiebreaker_won' && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-bold uppercase tracking-wider font-mono">
                                Tiebreaker
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-white/[0.04] sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-0.5">Final Deal</span>
                          <span className={`text-xl font-black font-mono tracking-tight ${isMyTeam ? 'text-[#E8A800]' : 'text-white'}`}>
                            £{alloc.soldPrice.toLocaleString()}
                          </span>
                        </div>
                        {hasBids && (
                          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 hover:bg-white/[0.08] transition-colors">
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
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
                  </div>

                  {/* Expanded Bid History details comparison ladder */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] p-4.5 bg-black/40 animate-[slideDown_0.2s_ease-out]">
                      {alloc.acquisitionNotes && (
                        <div className="mb-4.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-blue-300 font-medium">{alloc.acquisitionNotes}</p>
                        </div>
                      )}

                      {hasBids && (
                        <div>
                          <h4 className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-3">Bid Comparison Ladder</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {playerBids.map((bid, idx) => {
                              const isWinner = bid.teamId === alloc.teamId
                              return (
                                <div
                                  key={`${bid.teamId}-${idx}`}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    isWinner
                                      ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.04)]'
                                      : 'bg-white/[0.01] border-white/[0.04]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`font-mono text-xs font-bold shrink-0 ${isWinner ? 'text-emerald-400' : 'text-gray-600'}`}>
                                      #{idx + 1}
                                    </span>
                                    <span className={`text-sm truncate font-medium ${
                                      isWinner ? 'text-emerald-400 font-bold' : 'text-gray-300'
                                    }`}>
                                      {bid.teamName}
                                    </span>
                                    {isWinner && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black tracking-wider uppercase font-mono">
                                        WINNER
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-sm font-bold font-mono ${
                                    isWinner ? 'text-emerald-400' : 'text-gray-400'
                                  }`}>
                                    £{bid.amount.toLocaleString()}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  )
}
