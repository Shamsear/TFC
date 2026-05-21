'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BulkTiebreakerBiddingClientProps {
  tiebreaker: {
    id: number
    basePrice: number
    status: string
    currentHighestBid: number | null
    currentHighestTeamId: string | null
    teamsRemaining: number
    startTime: Date | null
    maxEndTime: Date | null
    basePlayer: {
      id: string
      name: string
      photoUrl: string
    }
    round: {
      id: string
      roundNumber: number
      position: string | null
      season: {
        id: string
        name: string
      }
    }
    participants: Array<{
      id: number
      teamId: string
      status: string
      currentBid: number | null
      lastBidTime: Date | null
      team: {
        id: string
        name: string
        logoUrl: string
      }
    }>
    bidHistory: Array<{
      id: number
      teamId: string
      bidAmount: number
      bidTime: Date
      team: {
        name: string
      }
    }>
  }
  team: {
    id: string
    name: string
    logoUrl: string
  }
  budget: number
  myParticipation: {
    id: number
    teamId: string
    status: string
    currentBid: number | null
    lastBidTime: Date | null
  } | null
}

export default function BulkTiebreakerBiddingClient({
  tiebreaker,
  team,
  budget,
  myParticipation
}: BulkTiebreakerBiddingClientProps) {
  const router = useRouter()
  const [bidAmount, setBidAmount] = useState(
    (tiebreaker.currentHighestBid || tiebreaker.basePrice) + 1
  )
  const [submitting, setSubmitting] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [liveData, setLiveData] = useState(tiebreaker)
  const [isPolling, setIsPolling] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingBidAmount, setPendingBidAmount] = useState(0)
  const [lastBidTime, setLastBidTime] = useState<number | null>(null)
  const [bidLockSeconds, setBidLockSeconds] = useState(0)
  const lastHighestBidRef = useRef(liveData.currentHighestBid)
  const [newBidAnimation, setNewBidAnimation] = useState(false)
  const [reserveInfo, setReserveInfo] = useState<any>(null)
  
  const maxBidLimit = reserveInfo ? reserveInfo.maxBid : budget
  
  // Preserve initial round data since API doesn't return it in live updates
  const roundData = tiebreaker.round
  
  // Preserve initial participant team data since API doesn't return it in live updates
  const participantTeamMap = new Map(
    tiebreaker.participants.map(p => [p.teamId, p.team])
  )
  
  // Preserve initial bid history team data
  const bidHistoryTeamMap = new Map(
    tiebreaker.bidHistory.map(b => [b.teamId, b.team])
  )
  if (!bidHistoryTeamMap.has(team.id)) {
    bidHistoryTeamMap.set(team.id, { name: team.name })
  }

  // Fetch reserve info on mount
  useEffect(() => {
    async function fetchReserveInfo() {
      try {
        const response = await fetch(`/api/team/reserve-info?season_id=${roundData.season.id}&round_id=${roundData.id}`)
        if (response.ok) {
          const data = await response.json()
          setReserveInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch reserve info:', error)
      }
    }
    fetchReserveInfo()
  }, [roundData.season.id, roundData.id])

  // Live update real-time SSE stream connection
  useEffect(() => {
    if (liveData.status === 'completed' || !isPolling) return

    console.log('🔌 Connecting to bulk tiebreaker SSE stream...')
    const eventSource = new EventSource(`/api/team/bulk-tiebreakers/${tiebreaker.id}/stream`)

    eventSource.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data)
        if (result) {
          // Check if highest bid changed (new bid from another team)
          if (lastHighestBidRef.current !== result.currentHighestBid) {
            setNewBidAnimation(true)
            setTimeout(() => setNewBidAnimation(false), 1000)
          }
          lastHighestBidRef.current = result.currentHighestBid
          
          setLiveData(result)
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error)
      }
    }

    eventSource.onerror = (err) => {
      console.error('🔌 SSE Connection error:', err)
    }

    return () => {
      console.log('🔌 Closing bulk tiebreaker SSE stream.')
      eventSource.close()
    }
  }, [tiebreaker.id, liveData.status, isPolling])

  // Bid lock countdown timer
  useEffect(() => {
    if (lastBidTime) {
      const updateLockTimer = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - lastBidTime) / 1000)
        const remaining = Math.max(0, 10 - elapsed) // 10 second lock
        setBidLockSeconds(remaining)
        
        if (remaining === 0) {
          setLastBidTime(null)
        }
      }

      updateLockTimer()
      const interval = setInterval(updateLockTimer, 1000)
      return () => clearInterval(interval)
    } else {
      setBidLockSeconds(0)
    }
  }, [lastBidTime])

  // Timer - use live data
  useEffect(() => {
    if (!liveData.maxEndTime) return

    const updateTimer = () => {
      const now = new Date()
      const end = new Date(liveData.maxEndTime!)
      const diff = end.getTime() - now.getTime()

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining('Expired')
        setIsPolling(false) // Stop polling when expired
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [liveData.maxEndTime])

  const handlePlaceBid = async () => {
    // If team is winning, always show confirmation modal
    if (isMyBidHighest) {
      setPendingBidAmount(bidAmount)
      setShowConfirmModal(true)
      return
    }

    // If not winning, bid directly
    await executeBid(bidAmount)
  }

  const executeBid = async (amount: number) => {
    setSubmitting(true)
    setMessage(null)
    setShowConfirmModal(false)

    try {
      const minBid = (liveData.currentHighestBid || liveData.basePrice) + 1
      if (amount < minBid) {
        throw new Error(`Bid must be at least £${minBid.toLocaleString()}`)
      }

      if (amount > maxBidLimit) {
        throw new Error(`Bid £${amount.toLocaleString()} exceeds your maximum allowed bid of £${maxBidLimit.toLocaleString()} (required to maintain squad balance/reserve requirements).`)
      }

      const response = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidAmount: amount })
      })

      if (!response.ok) {
        // Revert on failure by re-fetching
        const refreshResponse = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}`)
        if (refreshResponse.ok) {
          const result = await refreshResponse.json()
          if (result.success && result.tiebreaker) {
            setLiveData(result.tiebreaker)
          }
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to place bid')
      }

      setMessage({ type: 'success', text: 'Bid placed successfully!' })
      setLastBidTime(Date.now()) // Start 10-second lock
      
      // Immediately fetch updated data to confirm
      const refreshResponse = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}`)
      if (refreshResponse.ok) {
        const result = await refreshResponse.json()
        if (result.success && result.tiebreaker) {
          setLiveData(result.tiebreaker)
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    // Prevent withdrawal if you're the highest bidder
    if (isMyBidHighest) {
      setMessage({ 
        type: 'error', 
        text: 'You cannot withdraw while you have the highest bid. Wait to be outbid first.' 
      })
      return
    }

    if (!confirm('Are you sure you want to withdraw? You will lose this player.')) {
      return
    }

    setWithdrawing(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}/withdraw`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to withdraw')
      }

      setMessage({ type: 'success', text: 'Withdrawn successfully' })
      
      // Immediately fetch updated data to check if tiebreaker was auto-finalized
      const refreshResponse = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}`)
      if (refreshResponse.ok) {
        const result = await refreshResponse.json()
        if (result.success && result.tiebreaker) {
          setLiveData(result.tiebreaker)
          
          // If tiebreaker is now completed, stop polling
          if (result.tiebreaker.status === 'completed') {
            setIsPolling(false)
          }
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWithdrawing(false)
    }
  }

  const isMyBidHighest = liveData.currentHighestTeamId === team.id
  const isActive = myParticipation?.status === 'active'
  // Show warning UI when winning (regardless of time)
  const isBidLocked = isMyBidHighest

  // Update bid amount suggestion when highest bid changes
  useEffect(() => {
    const suggestedBid = (liveData.currentHighestBid || liveData.basePrice) + 1
    if (suggestedBid > bidAmount) {
      setBidAmount(suggestedBid)
    }
  }, [liveData.currentHighestBid, liveData.basePrice])

  // Quick bid buttons
  const quickBidAmounts = [1, 5, 10, 100]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-amber-500/30 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Bid Increase</h3>
                <p className="text-sm text-amber-400">You're currently winning</p>
              </div>
            </div>
            <p className="text-[#D4CCBB] mb-6">
              You're currently winning with the highest bid. Are you sure you want to increase your bid to <span className="font-bold text-[#E8A800]">£{pendingBidAmount.toLocaleString()}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => executeBid(pendingBidAmount)}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Placing...' : 'Confirm Bid'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <img
                  src={liveData.basePlayer.photoUrl}
                  alt={liveData.basePlayer.name}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white mb-1">
                  Bulk Tiebreaker
                </h1>
                <p className="text-sm text-[#D4CCBB]">
                  {liveData.basePlayer.name} — Round {roundData.roundNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Live Indicator */}
              {liveData.status === 'active' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-red-300">LIVE</span>
                </div>
              )}
              {timeRemaining && (
                <div className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-xs text-purple-400 mb-1">Time Remaining</div>
                  <div className="text-lg font-bold text-purple-300">{timeRemaining}</div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Your Budget</div>
              <div className="text-xl font-bold text-white">£{budget.toLocaleString()}</div>
            </div>
            <div className={`rounded-lg bg-white/5 border border-white/10 p-4 transition-all ${
              newBidAnimation ? 'ring-2 ring-[#E8A800] scale-105' : ''
            }`}>
              <div className="text-xs text-[#7A7367] mb-1">Current Highest</div>
              <div className="text-xl font-bold text-[#E8A800]">
                £{(liveData.currentHighestBid || liveData.basePrice).toLocaleString()}
              </div>
              {liveData.currentHighestTeamId && (
                <div className="text-xs text-[#D4CCBB] mt-1">
                  {participantTeamMap.get(liveData.currentHighestTeamId)?.name || 'Unknown Team'}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Teams Remaining</div>
              <div className="text-xl font-bold text-white">{liveData.teamsRemaining}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Your Status</div>
              <div className={`text-xl font-bold ${
                !liveData.currentHighestBid || liveData.currentHighestBid === liveData.basePrice
                  ? 'text-[#D4CCBB]'
                  : isActive 
                    ? (isMyBidHighest ? 'text-emerald-400' : 'text-amber-400') 
                    : 'text-red-400'
              }`}>
                {!liveData.currentHighestBid || liveData.currentHighestBid === liveData.basePrice
                  ? 'No Bids Yet'
                  : isActive 
                    ? (isMyBidHighest ? 'Winning' : 'Outbid') 
                    : 'Withdrawn'}
              </div>
            </div>
          </div>

          {/* Reserve Information */}
          {reserveInfo && (
            <div className={`mt-4 rounded-lg border p-4 ${
              reserveInfo.phase === 'phase_1' 
                ? 'bg-red-500/10 border-red-500/30'
                : reserveInfo.phase === 'phase_2'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  reserveInfo.phase === 'phase_1' 
                    ? 'bg-red-500/20 text-red-300'
                    : reserveInfo.phase === 'phase_2'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold mb-1 ${
                    reserveInfo.phase === 'phase_1' 
                      ? 'text-red-300'
                      : reserveInfo.phase === 'phase_2'
                      ? 'text-amber-300'
                      : 'text-blue-300'
                  }`}>
                    Budget Reserve - {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
                  </h3>
                  <div className="space-y-1 text-xs text-white/80">
                    <p><strong>Required Reserve:</strong> £{reserveInfo.floorReserve.toLocaleString()}</p>
                    <p><strong>Maximum Bid:</strong> £{reserveInfo.maxBid.toLocaleString()}</p>
                    {reserveInfo.phase === 'phase_2' && reserveInfo.maxRecommendedBid < reserveInfo.maxBid && (
                      <p className="text-amber-300"><strong>Recommended Max:</strong> £{reserveInfo.maxRecommendedBid.toLocaleString()}</p>
                    )}
                    <p className="text-white/60 text-xs mt-1">{reserveInfo.calculation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bidding Panel */}
          <div className="lg:col-span-2">
            {/* Status Messages - Check these first */}
            {liveData.status === 'completed' && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6 mb-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">🏆 Tiebreaker Resolved</h3>
                <p className="text-[#D4CCBB] mb-4">This tiebreaker has been finalized.</p>
                {liveData.currentHighestTeamId === team.id && (
                  <div className="inline-block px-6 py-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                    <p className="text-emerald-300 font-bold">🎉 You won with £{liveData.currentHighestBid?.toLocaleString()}!</p>
                  </div>
                )}
              </div>
            )}
            
            {liveData.status === 'pending' && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-6 mb-6 text-center">
                <h3 className="text-xl font-bold text-yellow-300 mb-2">⏳ Awaiting Admin</h3>
                <p className="text-[#D4CCBB]">This tiebreaker has not been started yet. Waiting for admin to activate it.</p>
              </div>
            )}

            {!isActive && liveData.status === 'active' && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 mb-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Withdrawn</h3>
                <p className="text-red-300">You have withdrawn from this tiebreaker.</p>
              </div>
            )}

            {/* Bidding Form - Only show if active status and team is active */}
            {isActive && liveData.status === 'active' && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Place Your Bid</h2>

                {/* Bid Lock Warning */}
                {isBidLocked && (
                  <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-amber-300">
                        You're Currently Winning
                      </div>
                      <div className="text-xs text-amber-400/80">
                        Bidding again will require confirmation to prevent accidental increases.
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                    Bid Amount (minimum: £{((liveData.currentHighestBid || liveData.basePrice) + 1).toLocaleString()})
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                    min={(liveData.currentHighestBid || liveData.basePrice) + 1}
                    max={maxBidLimit}
                    step={1000}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold focus:outline-none focus:border-[#E8A800]"
                  />
                </div>

                {/* Quick Bid Buttons */}
                <div className="mb-6">
                  <div className="text-xs text-[#7A7367] mb-2">Quick Add:</div>
                  <div className="grid grid-cols-4 gap-2">
                    {quickBidAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBidAmount(Math.min(bidAmount + amount, maxBidLimit))}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-all"
                      >
                        +£{amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handlePlaceBid}
                    disabled={submitting || bidAmount <= (liveData.currentHighestBid || liveData.basePrice) || bidAmount > maxBidLimit}
                    className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 ${
                      isBidLocked 
                        ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                        : 'bg-[#E8A800] hover:bg-[#E8A800]/90 text-black'
                    }`}
                  >
                    {submitting ? 'Placing Bid...' : isBidLocked ? `⚠️ Bid £${bidAmount.toLocaleString()}` : `Bid £${bidAmount.toLocaleString()}`}
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || isMyBidHighest}
                    className="px-6 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title={isMyBidHighest ? 'Cannot withdraw while winning' : 'Withdraw from tiebreaker'}
                  >
                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>

                {isMyBidHighest && (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">You have the highest bid! Last team standing wins.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bid History */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Bid History</h2>
              <div className="space-y-2">
                {liveData.bidHistory.length === 0 ? (
                  <p className="text-[#7A7367] text-center py-4">No bids yet</p>
                ) : (
                  liveData.bidHistory
                    .filter((bid) => bidHistoryTeamMap.has(bid.teamId))
                    .map((bid) => {
                      const teamData = bidHistoryTeamMap.get(bid.teamId)!
                      
                      return (
                        <div
                          key={bid.id || `${bid.teamId}-${bid.bidAmount}-${new Date(bid.bidTime).getTime()}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div>
                            <div className="font-medium text-white">{teamData.name}</div>
                            <div className="text-xs text-[#7A7367]" suppressHydrationWarning>
                              {new Date(bid.bidTime).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-[#E8A800]">
                            £{bid.bidAmount.toLocaleString()}
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>

          {/* Participants Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Participants</h2>
              <div className="space-y-3">
                {liveData.participants
                  .filter((participant) => participantTeamMap.has(participant.teamId))
                  .sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))
                  .map((participant) => {
                    const teamData = participantTeamMap.get(participant.teamId)!
                    
                    return (
                      <div
                        key={participant.teamId}
                        className={`p-3 rounded-lg border ${
                          participant.status === 'active'
                            ? 'bg-white/5 border-white/10'
                            : 'bg-red-500/5 border-red-500/20 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                            <img
                              src={teamData.logoUrl}
                              alt={teamData.name}
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm">
                              {teamData.name}
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#7A7367]">
                          {participant.status === 'active' ? 'Active' : 'Withdrawn'}
                        </span>
                        {participant.currentBid && (
                          <span className="text-sm font-bold text-[#E8A800]">
                            £{participant.currentBid.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
