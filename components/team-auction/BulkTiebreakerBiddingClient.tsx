'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'

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

  const liveDataRef = useRef(liveData)
  useEffect(() => {
    liveDataRef.current = liveData
  }, [liveData])

  const [isPolling, setIsPolling] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingBidAmount, setPendingBidAmount] = useState(0)
  const [lastBidTime, setLastBidTime] = useState<number | null>(null)
  const [bidLockSeconds, setBidLockSeconds] = useState(0)
  const lastHighestBidRef = useRef(liveData.currentHighestBid)
  const [newBidAnimation, setNewBidAnimation] = useState(false)
  const [reserveInfo, setReserveInfo] = useState<any>(null)
  const [syncTrigger, setSyncTrigger] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      console.log('🔄 Participant: Manually triggering data sync and stream reboot...')
      const response = await fetch(`/api/team/bulk-tiebreakers/${tiebreaker.id}?t=${Date.now()}`, { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.tiebreaker) {
          setLiveData(result.tiebreaker)
          
          if (result.tiebreaker.status !== 'completed') {
            setIsPolling(true)
          }

          // Instantly reboot the SSE connection
          setSyncTrigger(prev => prev + 1)
        }
      }
    } catch (err) {
      console.error('Failed to manually sync bidding data:', err)
    } finally {
      setRefreshing(false)
    }
  }
  
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
        const response = await fetch(`/api/team/reserve-info?season_id=${roundData.season.id}&round_id=${roundData.id}&t=${Date.now()}`, { cache: 'no-store' })
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

  // Live update real-time SSE stream connection with resilient visibility-change restore & auto-reconnect
  useEffect(() => {
    if (liveData.status === 'completed') return

    let eventSource: EventSource | null = null

    const connectStream = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log('🔌 Connecting to bulk tiebreaker SSE stream...')
      eventSource = new EventSource(
        `/api/team/bulk-tiebreakers/${tiebreaker.id}/stream?t=${Date.now()}`,
        { withCredentials: true }
      )

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
            
            // Instantly clear any lingering success message if another team outbids current team
            if (result.currentHighestTeamId && result.currentHighestTeamId !== team.id) {
              setMessage(null)
            }
            
            setLiveData(result)
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error)
        }
      }

      eventSource.onerror = (err) => {
        console.error('🔌 SSE Connection error:', err)
        if (eventSource) {
          eventSource.close()
        }
        // Attempt automatic reconnection after 3 seconds
        setTimeout(() => {
          if (document.visibilityState === 'visible' && liveDataRef.current.status !== 'completed') {
            connectStream()
          }
        }, 3000)
      }
    }

    // Connect initially
    connectStream()

    // 500ms Hybrid Polling fallback safety net
    const pollInterval = setInterval(async () => {
      if (document.visibilityState !== 'visible' || liveDataRef.current.status === 'completed') {
        return
      }

      try {
        const response = await fetch(`/api/team/bulk-tiebreakers/${tiebreaker.id}?t=${Date.now()}`, { cache: 'no-store' })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.tiebreaker) {
            const newTiebreaker = result.tiebreaker
            const current = liveDataRef.current

            // Check if anything meaningful has changed to avoid redundant state updates
            const hasHighestBidChanged = current.currentHighestBid !== newTiebreaker.currentHighestBid
            const hasHighestTeamChanged = current.currentHighestTeamId !== newTiebreaker.currentHighestTeamId
            const hasStatusChanged = current.status !== newTiebreaker.status
            const hasRemainingChanged = current.teamsRemaining !== newTiebreaker.teamsRemaining
            const hasHistoryLenChanged = current.bidHistory.length !== newTiebreaker.bidHistory.length
            
            // Compare participants list
            const hasParticipantsChanged = JSON.stringify(current.participants.map(p => ({ id: p.id, bid: p.currentBid, status: p.status }))) !== 
                                           JSON.stringify(newTiebreaker.participants.map((p: any) => ({ id: p.id, bid: p.currentBid, status: p.status })))

            if (hasHighestBidChanged || hasHighestTeamChanged || hasStatusChanged || hasRemainingChanged || hasHistoryLenChanged || hasParticipantsChanged) {
              console.log('🔄 Hybrid Poller [500ms]: State changed. Synchronizing liveData...')
              
              if (current.currentHighestBid !== newTiebreaker.currentHighestBid) {
                setNewBidAnimation(true)
                setTimeout(() => setNewBidAnimation(false), 1000)
              }

              if (newTiebreaker.currentHighestTeamId && newTiebreaker.currentHighestTeamId !== team.id) {
                setMessage(null)
              }

              setLiveData(newTiebreaker)

              if (newTiebreaker.status === 'completed') {
                setIsPolling(false)
              }
            }
          }
        }
      } catch (err) {
        console.error('Hybrid Poller: Failed to fetch fallback updates:', err)
      }
    }, 500)

    // Handle tab visibility change (e.g. tab minimized, user changed tab, or phone locked)
    // When returning, we immediately fetch latest state to catch up, then reconnect SSE cleanly
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Bidding Tab became visible. Instantly synchronizing state and reconnecting stream...')
        
        // 1. Fetch the absolute latest state from the database immediately to bypass any missed events
        try {
          const response = await fetch(`/api/team/bulk-tiebreakers/${tiebreaker.id}?t=${Date.now()}`, { cache: 'no-store' })
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.tiebreaker) {
              setLiveData(result.tiebreaker)
              if (result.tiebreaker.status === 'completed') {
                setIsPolling(false)
                if (eventSource) eventSource.close()
                return
              }
            }
          }
        } catch (err) {
          console.error('Error synchronizing state on visible restore:', err)
        }

        // 2. Re-open a fresh stream connection
        connectStream()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      console.log('🔌 Closing bulk tiebreaker SSE stream, removing visibility listener, and clearing 500ms poller.')
      if (eventSource) {
        eventSource.close()
      }
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [tiebreaker.id, liveData.status, syncTrigger])

  // Clear success / error messages after 5 seconds to prevent them lingering
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Automatically clear messages when outbid by another team
  useEffect(() => {
    if (liveData.currentHighestTeamId && liveData.currentHighestTeamId !== team.id) {
      setMessage(null)
    }
  }, [liveData.currentHighestTeamId, team.id])

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

    // Save previous state for rollback in case of error
    const previousData = liveData

    try {
      const minBid = (liveData.currentHighestBid || liveData.basePrice) + 1
      if (amount < minBid) {
        throw new Error(`Bid must be at least £${minBid.toLocaleString()}`)
      }

      if (amount > maxBidLimit) {
        throw new Error(`Bid £${amount.toLocaleString()} exceeds your maximum allowed bid of £${maxBidLimit.toLocaleString()} (required to maintain squad balance/reserve requirements).`)
      }

      // 1. PERFORM OPTIMISTIC UPDATE (0ms delay UI update)
      const optimisticBid = {
        id: -Date.now(), // Negative temporary ID to ensure unique key
        teamId: team.id,
        bidAmount: amount,
        bidTime: new Date(),
        team: { name: team.name }
      }

      const updatedParticipants = previousData.participants.map(p => 
        p.teamId === team.id 
          ? { ...p, currentBid: amount, lastBidTime: new Date() } 
          : p
      )

      const updatedBidHistory = [
        optimisticBid,
        ...previousData.bidHistory
      ].slice(0, 20)

      const optimisticData = {
        ...previousData,
        currentHighestBid: amount,
        currentHighestTeamId: team.id,
        participants: updatedParticipants,
        bidHistory: updatedBidHistory
      }

      setLiveData(optimisticData)

      // 2. DISPATCH ASYNC SERVER CALL
      const response = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidAmount: amount })
      })

      const data = await response.json()

      if (!response.ok) {
        // Rollback optimistic state immediately
        setLiveData(previousData)

        // Re-fetch to synchronize state correctly from server
        const refreshResponse = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}?t=${Date.now()}`, { cache: 'no-store' })
        if (refreshResponse.ok) {
          const result = await refreshResponse.json()
          if (result.success && result.tiebreaker) {
            setLiveData(result.tiebreaker)
          }
        }
        throw new Error(data.error || 'Failed to place bid')
      }

      setMessage({ type: 'success', text: `Bid of £${amount.toLocaleString()} placed successfully for ${liveData.basePlayer.name}!` })
      setLastBidTime(Date.now()) // Start 10-second lock
      
      // Instantly apply the authoritative tiebreaker state returned in the POST response
      if (data.success && data.tiebreaker) {
        setLiveData(data.tiebreaker)
      }
    } catch (error: any) {
      // Rollback optimistic state
      setLiveData(previousData)
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

    // Save previous state for rollback in case of error
    const previousData = liveData

    // 1. PERFORM OPTIMISTIC UPDATE
    const optimisticData = {
      ...previousData,
      teamsRemaining: Math.max(0, previousData.teamsRemaining - 1),
      participants: previousData.participants.map(p => 
        p.teamId === team.id ? { ...p, status: 'withdrawn' } : p
      )
    }

    setLiveData(optimisticData)

    try {
      // 2. DISPATCH ASYNC SERVER CALL
      const response = await fetch(`/api/team/bulk-tiebreakers/${liveData.id}/withdraw`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw')
      }

      setMessage({ type: 'success', text: 'Withdrawn successfully' })
      
      // Instantly apply the authoritative tiebreaker state returned in the POST response
      if (data.success && data.tiebreaker) {
        setLiveData(data.tiebreaker)
        
        // If tiebreaker is now completed, stop polling
        if (data.tiebreaker.status === 'completed') {
          setIsPolling(false)
        }
      }
    } catch (error: any) {
      // Rollback optimistic state
      setLiveData(previousData)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setWithdrawing(false)
    }
  }

  const isMyBidHighest = !!liveData.currentHighestTeamId && !!team.id && liveData.currentHighestTeamId === team.id
  const myCurrentParticipation = liveData.participants.find(p => p.teamId === team.id)
  const isActive = myCurrentParticipation ? myCurrentParticipation.status === 'active' : false
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 sm:pt-24 md:pt-28">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <img
                  src={getPhotoUrlFromDb(liveData.basePlayer.photoUrl)}
                  alt={liveData.basePlayer.name}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-1">
                  Bulk Tiebreaker
                </h1>
                <p className="text-xs sm:text-sm text-[#D4CCBB]">
                  {liveData.basePlayer.name} — Round {roundData.roundNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Sync / Reconnect Button */}
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs sm:text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all text-[#D4CCBB] hover:text-white disabled:opacity-50 active:scale-95 cursor-pointer shadow-lg shadow-black/35"
                title="Force Refresh Data & Reconnect Stream"
              >
                <svg className={`w-3 h-3 sm:w-4 sm:h-4 text-[#E8A800] ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 20v-5h-.581m0 0a8.003 8.003 0 11-15.357-2" />
                </svg>
                <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>

              {/* Live Indicator */}
              {liveData.status === 'active' && (
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-red-300">LIVE</span>
                </div>
              )}
              {timeRemaining && (
                <div className="px-2 sm:px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-[10px] sm:text-xs text-purple-400 mb-0.5 sm:mb-1">Time Left</div>
                  <div className="text-sm sm:text-lg font-bold text-purple-300">{timeRemaining}</div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[#7A7367] mb-1">Your Budget</div>
              <div className="text-base sm:text-xl font-bold text-white">£{budget.toLocaleString()}</div>
            </div>
            <div className={`rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4 transition-all ${
              newBidAnimation ? 'ring-2 ring-[#E8A800] scale-105' : ''
            }`}>
              <div className="text-[10px] sm:text-xs text-[#7A7367] mb-1">Current Highest</div>
              <div className="text-base sm:text-xl font-bold text-[#E8A800]">
                £{(liveData.currentHighestBid || liveData.basePrice).toLocaleString()}
              </div>
              {liveData.currentHighestTeamId && (
                <div className="text-[10px] sm:text-xs text-[#D4CCBB] mt-1 truncate">
                  {participantTeamMap.get(liveData.currentHighestTeamId)?.name || 'Unknown Team'}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[#7A7367] mb-1">Teams Remaining</div>
              <div className="text-base sm:text-xl font-bold text-white">{liveData.teamsRemaining}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[#7A7367] mb-1">Your Status</div>
              <div className={`text-base sm:text-xl font-bold ${
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
          <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <span className="flex-1 font-medium">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/5 transition-all flex-shrink-0"
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handlePlaceBid}
                    disabled={submitting || bidAmount <= (liveData.currentHighestBid || liveData.basePrice) || bidAmount > maxBidLimit}
                    className={`flex-1 px-4 sm:px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 text-sm sm:text-base ${
                      isBidLocked 
                        ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                        : 'bg-[#E8A800] hover:bg-[#E8A800]/90 text-black'
                    }`}
                  >
                    {submitting ? 'Placing Bid...' : isBidLocked ? `⚠️ Bid £${bidAmount.toLocaleString()}` : `Bid £${bidAmount.toLocaleString()}`}
                  </button>

                  {/* Secondary Sync Button */}
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="px-4 sm:px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-xs sm:text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all text-[#D4CCBB] hover:text-white disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/35 min-w-[100px] sm:min-w-[120px]"
                    title="Sync Latest Data & Reconnect Stream"
                  >
                    <svg className={`w-4 h-4 text-[#E8A800] ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 20v-5h-.581m0 0a8.003 8.003 0 11-15.357-2" />
                    </svg>
                    <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || isMyBidHighest}
                    className="px-4 sm:px-6 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                    title={isMyBidHighest ? 'Cannot withdraw while winning' : 'Withdraw from tiebreaker'}
                  >
                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>

                {isMyBidHighest && (
                  <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-amber-950/40 via-amber-900/25 to-[#1a1510] border border-amber-500/40 shadow-lg shadow-amber-500/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-lg flex-shrink-0 shadow-md shadow-amber-500/20 animate-bounce">
                        👑
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          Active Leader
                        </h4>
                        <p className="text-xs text-[#D4CCBB] mt-0.5">
                          Your team ({team.name}) holds the highest bid of <span className="font-extrabold text-amber-300 text-sm">£{(liveData.currentHighestBid || 0).toLocaleString()}</span>. You are currently in the lead!
                        </p>
                      </div>
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
                    .map((bid, index) => {
                      const teamData = bidHistoryTeamMap.get(bid.teamId)!
                      
                      return (
                        <div
                          key={bid.id ? `bid-${bid.id}` : `bid-fallback-${bid.teamId}-${bid.bidAmount}-${new Date(bid.bidTime || 0).getTime()}-${index}`}
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
                    const isLeading = participant.teamId === liveData.currentHighestTeamId;
                    
                    return (
                      <div
                        key={participant.teamId}
                        className={`p-3 rounded-lg border transition-all ${
                          participant.status === 'active'
                            ? isLeading
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-white/5 border-white/10'
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
                            {isLeading && participant.status === 'active' && (
                              <div className="text-xs text-emerald-400">Leading</div>
                            )}
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





