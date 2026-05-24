'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Participant {
  id: number
  teamId: string
  newBidAmount: number | null
  submitted: boolean
  submittedAt: Date | null
  team: {
    id: string
    name: string
    logoUrl: string
    currentBudget?: number
    squadSize?: number
  }
}

interface BulkTiebreakerManualResolveProps {
  tiebreakerId: number
  basePrice: number
  participants: Participant[]
  playerName: string
  seasonId: string
  maxSquadSize?: number
}

export default function BulkTiebreakerManualResolve({
  tiebreakerId,
  basePrice,
  participants,
  playerName,
  seasonId,
  maxSquadSize = 25
}: BulkTiebreakerManualResolveProps) {
  const router = useRouter()
  const [teamBids, setTeamBids] = useState<Record<string, number>>(
    participants.reduce((acc, p) => ({
      ...acc,
      [p.teamId]: p.newBidAmount || basePrice
    }), {})
  )
  const [selectedWinner, setSelectedWinner] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showUnsoldConfirm, setShowUnsoldConfirm] = useState(false)

  // Auto-select winner based on highest bid
  useEffect(() => {
    const highestBidEntry = Object.entries(teamBids).reduce((max, [teamId, bid]) => {
      return bid > max.bid ? { teamId, bid } : max
    }, { teamId: '', bid: 0 })

    if (highestBidEntry.teamId && highestBidEntry.bid >= basePrice) {
      setSelectedWinner(highestBidEntry.teamId)
    }
  }, [teamBids, basePrice])

  const handleBidChange = (teamId: string, value: string) => {
    const numValue = parseInt(value) || basePrice
    setTeamBids(prev => ({
      ...prev,
      [teamId]: numValue
    }))
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!selectedWinner) {
      setError('Please select a winner')
      return
    }

    const winningBid = teamBids[selectedWinner]
    if (!winningBid || winningBid < basePrice) {
      setError(`Winning bid must be at least £${basePrice.toLocaleString()}`)
      return
    }

    // Check all bids are valid
    for (const [teamId, bid] of Object.entries(teamBids)) {
      if (bid < basePrice) {
        setError(`All bids must be at least £${basePrice.toLocaleString()}`)
        return
      }
    }

    setShowConfirm(true)
  }

  const handleMarkUnsold = () => {
    setError('')
    setShowUnsoldConfirm(true)
  }

  const handleConfirmUnsold = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/bulk-tiebreakers/${tiebreakerId}/mark-unsold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark as unsold')
      }

      // Success - redirect back to bulk tiebreakers list page
      router.push(`/sub-admin/${seasonId}/auction/bulk-tiebreakers`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as unsold')
      setShowUnsoldConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmResolve = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/bulk-tiebreakers/${tiebreakerId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamBids,
          winnerId: selectedWinner
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resolve tiebreaker')
      }

      // Success - redirect back to bulk tiebreakers list page
      router.push(`/sub-admin/${seasonId}/auction/bulk-tiebreakers`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve tiebreaker')
      setShowConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const winnerTeam = participants.find(p => p.teamId === selectedWinner)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Manual Resolution</h2>
        <p className="text-sm text-[#7A7367]">
          Enter the final bids for each team. The team with the highest bid will be automatically selected as the winner.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Team Bids */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-white">Team Sealed Bids</h3>
        <p className="text-sm text-[#7A7367]">
          Admin can see all sealed bids. Teams marked as "Not Submitted" haven't submitted yet.
        </p>
        {participants.map((participant) => {
          const currentBudget = participant.team.currentBudget || 0
          const bidAmount = teamBids[participant.teamId] || basePrice
          const remainingBudget = currentBudget - bidAmount
          const currentSquadSize = participant.team.squadSize || 0
          const slotsRemaining = maxSquadSize - currentSquadSize - 1 // -1 for this player
          const minBudgetNeeded = slotsRemaining > 0 ? slotsRemaining * 10 : 0 // £10 per remaining slot
          const isWinner = selectedWinner === participant.teamId
          const hasInsufficientFunds = bidAmount > currentBudget
          const hasInsufficientBudgetForSlots = slotsRemaining > 0 && remainingBudget < minBudgetNeeded
          
          return (
            <div
              key={participant.teamId}
              className={`p-4 rounded-lg border transition-all ${
                isWinner
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : hasInsufficientFunds
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                  <Image
                    src={participant.team.logoUrl}
                    alt={participant.team.name}
                    width={48}
                    height={48}
                    unoptimized={true}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-white mb-1 flex items-center gap-2">
                        {participant.team.name}
                        {!participant.submitted && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                            Not Submitted
                          </span>
                        )}
                        {participant.submitted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                            ✓ Submitted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#7A7367]">
                        <span>Budget: £{currentBudget.toLocaleString()}</span>
                        <span>•</span>
                        <span>Squad: {currentSquadSize}/{maxSquadSize}</span>
                      </div>
                    </div>
                    {isWinner && (
                      <div className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-sm font-medium flex-shrink-0">
                        ✓ Winner
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm text-[#7A7367] flex-shrink-0">Final Bid:</label>
                    <div className="relative flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7367]">£</span>
                      <input
                        type="number"
                        min={basePrice}
                        step="1000"
                        value={bidAmount}
                        onChange={(e) => handleBidChange(participant.teamId, e.target.value)}
                        disabled={isSubmitting}
                        className={`pl-7 pr-4 py-2 rounded-lg bg-black/30 border text-white focus:border-[#E8A800] focus:outline-none w-40 ${
                          hasInsufficientFunds ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Balance and Slots Info - Only show for winner */}
                  {isWinner && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-2 rounded-lg ${
                        hasInsufficientFunds 
                          ? 'bg-red-500/10 border border-red-500/30' 
                          : hasInsufficientBudgetForSlots
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : remainingBudget < basePrice
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <div className="text-xs text-[#7A7367] mb-1">After Purchase</div>
                        <div className={`text-sm font-bold ${
                          hasInsufficientFunds 
                            ? 'text-red-400' 
                            : hasInsufficientBudgetForSlots
                            ? 'text-amber-400'
                            : remainingBudget < basePrice
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}>
                          £{remainingBudget.toLocaleString()}
                        </div>
                        {hasInsufficientFunds && (
                          <div className="text-xs text-red-400 mt-1">Insufficient funds!</div>
                        )}
                        {!hasInsufficientFunds && hasInsufficientBudgetForSlots && (
                          <div className="text-xs text-amber-400 mt-1">
                            Need £{minBudgetNeeded.toLocaleString()} for {slotsRemaining} slots
                          </div>
                        )}
                      </div>
                      <div className={`p-2 rounded-lg ${
                        slotsRemaining < 0
                          ? 'bg-red-500/10 border border-red-500/30'
                          : slotsRemaining < 3
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <div className="text-xs text-[#7A7367] mb-1">Slots After</div>
                        <div className={`text-sm font-bold ${
                          slotsRemaining < 0
                            ? 'text-red-400'
                            : slotsRemaining < 3
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}>
                          {slotsRemaining} remaining
                        </div>
                        {slotsRemaining < 0 && (
                          <div className="text-xs text-red-400 mt-1">Squad full!</div>
                        )}
                        {slotsRemaining > 0 && slotsRemaining < 3 && (
                          <div className="text-xs text-amber-400 mt-1">Low slots</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {selectedWinner && (
        <div className="mb-6 p-4 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#E8A800] mb-1">Selected Winner</div>
              <div className="text-lg font-bold text-white">{winnerTeam?.team.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#E8A800] mb-1">Winning Bid</div>
              <div className="text-2xl font-black text-white">
                £{teamBids[selectedWinner]?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleMarkUnsold}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Mark as Unsold
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedWinner}
          className="flex-1 px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Resolving...' : 'Resolve Tiebreaker'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Resolution</h3>
            <div className="mb-6 space-y-3">
              <p className="text-[#D4CCBB]">
                You are about to manually resolve the tiebreaker for <span className="font-semibold text-white">{playerName}</span>.
              </p>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm text-[#7A7367] mb-1">Winner</div>
                <div className="font-semibold text-white">{winnerTeam?.team.name}</div>
                <div className="text-sm text-[#7A7367] mt-2 mb-1">Winning Bid</div>
                <div className="text-xl font-bold text-[#E8A800]">
                  £{teamBids[selectedWinner]?.toLocaleString()}
                </div>
              </div>
              <p className="text-sm text-amber-400">
                This action cannot be undone. The player will be allocated to the winning team and funds will be deducted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsold Confirmation Modal */}
      {showUnsoldConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Mark as Unsold</h3>
            <div className="mb-6 space-y-3">
              <p className="text-[#D4CCBB]">
                You are about to mark <span className="font-semibold text-white">{playerName}</span> as unsold.
              </p>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-300">
                  The player will not be allocated to any team and the tiebreaker will be marked as completed with no winner.
                </p>
              </div>
              <p className="text-sm text-amber-400">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnsoldConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnsold}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Unsold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
