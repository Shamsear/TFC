'use client'

import { useState } from 'react'
import Link from 'next/link'

interface TiebreakerSectionProps {
  activeNormalTiebreakers: any[]
  activeBulkTiebreakers: any[]
  pendingNormalTiebreakers: any[]
  pendingBulkTiebreakers: any[]
}

export default function TiebreakerSection({
  activeNormalTiebreakers,
  activeBulkTiebreakers,
  pendingNormalTiebreakers,
  pendingBulkTiebreakers
}: TiebreakerSectionProps) {
  const [showPending, setShowPending] = useState(false)
  
  const totalActive = activeNormalTiebreakers.length + activeBulkTiebreakers.length
  const totalPending = pendingNormalTiebreakers.length + pendingBulkTiebreakers.length

  if (totalActive === 0 && totalPending === 0) return null

  return (
    <div className="mb-6 sm:mb-8">
      {/* Active Tiebreakers */}
      {totalActive > 0 && (
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Action Required: Active Tiebreakers</h2>
              <p className="text-xs sm:text-sm text-[#D4CCBB]">
                {totalActive} tiebreaker{totalActive > 1 ? 's' : ''} need{totalActive === 1 ? 's' : ''} your bid now
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {/* Active Normal Tiebreakers */}
            {activeNormalTiebreakers.map((tie) => {
              const teamBid = tie.teamTiebreakerBids[0]
              return (
                <Link
                  key={tie.id}
                  href={`/team/auction/tiebreakers/${tie.id}`}
                  className="block rounded-lg bg-black/30 border border-purple-500/30 p-3 hover:bg-black/40 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                          Normal Round
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                          LIVE
                        </span>
                      </div>
                      <div className="text-xs text-[#D4CCBB]">
                        Round {tie.round.roundNumber} • Original bid: £{tie.originalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {teamBid?.submitted ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 animate-pulse">
                          Bid Now
                        </span>
                      )}
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
            
            {/* Active Bulk Tiebreakers */}
            {activeBulkTiebreakers.map((tie) => (
              <Link
                key={tie.id}
                href={`/team/auction/bulk-tiebreakers/${tie.id}`}
                className="block rounded-lg bg-black/30 border border-amber-500/30 hover:bg-amber-500/5 p-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                        Bulk Round
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                        LIVE
                      </span>
                    </div>
                    <div className="text-xs text-[#D4CCBB]">
                      Round {tie.round.roundNumber} • £{tie.basePrice.toLocaleString()} • {tie.participants.length} teams tied
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    Bid Now →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending Tiebreakers (Awaiting Admin) */}
      {totalPending > 0 && (
        <div>
          <button
            onClick={() => setShowPending(!showPending)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Pending Tiebreakers ({totalPending})
                </h2>
                <p className="text-xs sm:text-sm text-[#D4CCBB]">Awaiting admin to start</p>
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-[#E8A800] transition-transform ${showPending ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPending && (
            <div className="mt-4 space-y-2">
              {/* Pending Normal Tiebreakers */}
              {pendingNormalTiebreakers.map((tie) => (
                <Link
                  key={tie.id}
                  href={`/team/auction/tiebreakers/${tie.id}/preview`}
                  className="block rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                          Normal Round
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
                          Pending
                        </span>
                      </div>
                      <div className="text-xs text-[#D4CCBB]">
                        Round {tie.round.roundNumber} • {tie.teamTiebreakerBids.length} contested teams
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
              
              {/* Pending Bulk Tiebreakers */}
              {pendingBulkTiebreakers.map((tie) => (
                <Link
                  key={tie.id}
                  href={`/team/auction/bulk-tiebreakers/${tie.id}/preview`}
                  className="block rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-white text-sm sm:text-base">{tie.basePlayer.name}</div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                          Bulk Round
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
                          Pending
                        </span>
                      </div>
                      <div className="text-xs text-[#D4CCBB]">
                        Round {tie.round.roundNumber} • £{tie.basePrice.toLocaleString()} • {tie.participants.length} contested teams
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
