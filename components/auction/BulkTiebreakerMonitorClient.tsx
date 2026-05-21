'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface BulkTiebreakerMonitorClientProps {
  initialData: {
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
        logoUrl: string
      }
    }>
  }
  seasonId: string
}

export default function BulkTiebreakerMonitorClient({
  initialData,
  seasonId
}: BulkTiebreakerMonitorClientProps) {
  const [liveData, setLiveData] = useState(initialData)

  const liveDataRef = useRef(liveData)
  useEffect(() => {
    liveDataRef.current = liveData
  }, [liveData])

  const [timeRemaining, setTimeRemaining] = useState('')
  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Live update real-time SSE stream connection with resilient visibility-change restore & auto-reconnect
  useEffect(() => {
    if (liveData.status === 'completed') return

    let eventSource: EventSource | null = null

    const connectStream = () => {
      if (eventSource) {
        eventSource.close()
      }

      console.log('🔌 Connecting admin monitor to bulk tiebreaker SSE stream...')
      eventSource = new EventSource(
        `/api/admin/bulk-tiebreakers/${initialData.id}/stream?t=${Date.now()}`,
        { withCredentials: true }
      )

      eventSource.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data)
          if (result) {
            setLiveData(result)
            setLastUpdate(new Date())
          }
        } catch (error) {
          console.error('Error parsing SSE event in admin monitor:', error)
        }
      }

      eventSource.onerror = (err) => {
        console.error('🔌 Admin SSE Connection error:', err)
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
        const response = await fetch(`/api/admin/bulk-tiebreakers/${initialData.id}?t=${Date.now()}`, { cache: 'no-store' })
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
              console.log('🔄 Admin Hybrid Poller [500ms]: State changed. Synchronizing liveData...')
              
              setLiveData(newTiebreaker)
              setLastUpdate(new Date())

              if (newTiebreaker.status === 'completed') {
                setIsPolling(false)
              }
            }
          }
        }
      } catch (err) {
        console.error('Admin Hybrid Poller: Failed to fetch fallback updates:', err)
      }
    }, 500)

    // Handle tab visibility change (e.g. tab minimized, user changed tab, or phone locked)
    // When returning, we immediately fetch latest state to catch up, then reconnect SSE cleanly
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Admin Monitor Tab became visible. Instantly synchronizing state and reconnecting stream...')
        
        // 1. Fetch the absolute latest state from the database immediately to bypass any missed events
        try {
          const response = await fetch(`/api/admin/bulk-tiebreakers/${initialData.id}?t=${Date.now()}`, { cache: 'no-store' })
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.tiebreaker) {
              setLiveData(result.tiebreaker)
              setLastUpdate(new Date())
              if (result.tiebreaker.status === 'completed') {
                setIsPolling(false)
                if (eventSource) eventSource.close()
                return
              }
            }
          }
        } catch (err) {
          console.error('Error synchronizing state on visible restore in admin monitor:', err)
        }

        // 2. Re-open a fresh stream connection
        connectStream()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      console.log('🔌 Closing admin bulk tiebreaker SSE stream, removing visibility listener, and clearing 500ms poller.')
      if (eventSource) {
        eventSource.close()
      }
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [initialData.id, liveData.status])

  // Timer
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
        setIsPolling(false)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [liveData.maxEndTime])

  const highestBidder = liveData.participants.find(
    p => p.teamId === liveData.currentHighestTeamId
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/sub-admin/${seasonId}/auction`}
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
                <Image
                  src={liveData.basePlayer.photoUrl}
                  alt={liveData.basePlayer.name}
                  width={64}
                  height={64}
                  unoptimized={true}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white mb-1">
                  Bulk Tiebreaker Monitor
                </h1>
                <p className="text-sm text-[#D4CCBB]">
                  {liveData.basePlayer.name} — Round {liveData.round.roundNumber}
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
              {liveData.status === 'pending' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-amber-300">AWAITING START</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Base Price</div>
              <div className="text-xl font-bold text-white">£{liveData.basePrice.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Current Highest</div>
              <div className="text-xl font-bold text-[#E8A800]">
                £{(liveData.currentHighestBid || liveData.basePrice).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Teams Remaining</div>
              <div className="text-xl font-bold text-white">{liveData.teamsRemaining}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Status</div>
              <div className={`text-xl font-bold ${
                liveData.status === 'pending' ? 'text-amber-400' : 
                liveData.status === 'active' ? 'text-red-400' : 
                liveData.status === 'completed' ? 'text-emerald-400' : 'text-gray-400'
              }`}>
                {liveData.status.charAt(0).toUpperCase() + liveData.status.slice(1)}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Last Update</div>
              <div className="text-sm font-medium text-white" suppressHydrationWarning>
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bid History */}
          <div className="lg:col-span-2">
            {/* Current Leader */}
            {highestBidder && liveData.status !== 'pending' && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <Image
                      src={highestBidder.team.logoUrl}
                      alt={highestBidder.team.name}
                      width={48}
                      height={48}
                      unoptimized={true}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-emerald-400 mb-1">Current Leader</div>
                    <div className="text-xl font-bold text-white">{highestBidder.team.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-400 mb-1">Highest Bid</div>
                    <div className="text-2xl font-black text-[#E8A800]">
                      £{liveData.currentHighestBid?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bid History */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Bid History</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {liveData.bidHistory.length === 0 ? (
                  <p className="text-[#7A7367] text-center py-8">No bids yet</p>
                ) : (
                  liveData.bidHistory.map((bid, index) => (
                    <div
                      key={bid.id ? `bid-${bid.id}` : `bid-fallback-${index}`}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        index === 0
                          ? 'bg-[#E8A800]/10 border-[#E8A800]/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <Image
                            src={bid.team.logoUrl}
                            alt={bid.team.name}
                            width={40}
                            height={40}
                            unoptimized={true}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium text-white">{bid.team.name}</div>
                          <div className="text-xs text-[#7A7367]" suppressHydrationWarning>
                            {new Date(bid.bidTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          index === 0 ? 'text-[#E8A800]' : 'text-white'
                        }`}>
                          £{bid.bidAmount.toLocaleString()}
                        </div>
                        {index === 0 && (
                          <div className="text-xs text-[#E8A800]">Latest</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Participants Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-white mb-4">Participants</h2>
              <div className="space-y-3">
                {liveData.participants
                  .sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))
                  .map((participant, index) => (
                    <div
                      key={participant.id ? `participant-${participant.id}` : `participant-fallback-${index}`}
                      className={`p-4 rounded-lg border transition-all ${
                        participant.status === 'active'
                          ? index === 0 && participant.currentBid
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/5 border-white/10'
                          : 'bg-red-500/5 border-red-500/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <Image
                            src={participant.team.logoUrl}
                            alt={participant.team.name}
                            width={40}
                            height={40}
                            unoptimized={true}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">
                            {participant.team.name}
                          </div>
                          {index === 0 && participant.status === 'active' && participant.currentBid && (
                            <div className="text-xs text-emerald-400">Leading</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          participant.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {participant.status === 'active' ? 'Active' : 'Withdrawn'}
                        </span>
                        {participant.currentBid && (
                          <span className="text-sm font-bold text-[#E8A800]">
                            £{participant.currentBid.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {participant.lastBidTime && (
                        <div className="text-xs text-[#7A7367] mt-2" suppressHydrationWarning>
                          Last bid: {new Date(participant.lastBidTime).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
