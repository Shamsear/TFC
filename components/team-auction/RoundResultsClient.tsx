'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
}

export default function RoundResultsClient({
  round,
  allocations,
  tiebreakers,
  teamId,
  bidsByPlayer
}: RoundResultsClientProps) {
  const router = useRouter()
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Round {round.roundNumber} Results
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {round.season.name} {round.position && `— ${round.position}`}
              </p>
            </div>
            <Link
              href="/team/auction"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              Back to Auction
            </Link>
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
                <h3 className="text-xl font-black text-amber-300 mb-2">Tiebreaker Required</h3>
                <p className="text-[#D4CCBB] mb-4">
                  You are involved in {tiebreakers.length} tiebreaker{tiebreakers.length > 1 ? 's' : ''}. 
                  The admin will resolve {tiebreakers.length > 1 ? 'these' : 'this'} and assign the player{tiebreakers.length > 1 ? 's' : ''}.
                </p>
                <div className="space-y-3">
                  {tiebreakers.map(tie => (
                    <div key={tie.id} className="p-4 rounded-lg bg-black/30 border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <Image
                            src={tie.basePlayer.photoUrl}
                            alt={tie.basePlayer.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{tie.basePlayer.name}</h4>
                          <p className="text-sm text-[#D4CCBB]">
                            Base price: £{tie.basePrice.toLocaleString()} • {tie.participants.length} teams tied
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
            <h2 className="text-2xl font-black text-white mb-4">Your Acquisitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAllocations.map(alloc => (
                <div
                  key={alloc.id}
                  className="rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={alloc.basePlayer.photoUrl}
                        alt={alloc.basePlayer.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{alloc.basePlayer.name}</h3>
                      <p className="text-sm text-emerald-400">Won by you</p>
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

        {/* All Results */}
        <div>
          <h2 className="text-2xl font-black text-white mb-4">All Results</h2>
          <div className="space-y-3">
            {allocations.map(alloc => {
              const isMyTeam = alloc.teamId === teamId
              const isExpanded = expandedPlayers.has(alloc.basePlayerId)
              const playerBids = bidsByPlayer[alloc.basePlayerId] || []
              const hasBids = playerBids.length > 0

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
                    className={`p-4 ${hasBids ? 'cursor-pointer hover:bg-white/5' : ''}`}
                    onClick={() => hasBids && togglePlayer(alloc.basePlayerId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <Image
                            src={alloc.basePlayer.photoUrl}
                            alt={alloc.basePlayer.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
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
                        {hasBids && (
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

                  {/* Expanded Bid Details */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 bg-black/20">
                      {/* Acquisition Notes */}
                      {alloc.acquisitionNotes && (
                        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-blue-200">{alloc.acquisitionNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* Bid History */}
                      {hasBids && (
                        <>
                          <h4 className="text-sm font-bold text-[#D4CCBB] mb-3">All Bids</h4>
                          <div className="space-y-2">
                            {playerBids.map((bid, idx) => {
                              const isWinner = bid.teamId === alloc.teamId
                              return (
                                <div
                                  key={`${bid.teamId}-${idx}`}
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
                                      {bid.teamName}
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
                                    £{bid.amount.toLocaleString()}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
