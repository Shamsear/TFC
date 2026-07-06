'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'
import BulkTiebreakerManualResolve from './BulkTiebreakerManualResolve'

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
  maxSquadSize?: number
}

export default function BulkTiebreakerMonitorClient({
  initialData,
  seasonId,
  maxSquadSize = 25
}: BulkTiebreakerMonitorClientProps) {
  const [liveData, setLiveData] = useState(initialData)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showManualResolve, setShowManualResolve] = useState(false)

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/admin/bulk-tiebreakers/${initialData.id}?t=${Date.now()}`, { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.tiebreaker) {
          setLiveData(result.tiebreaker)
        }
      }
    } catch (err) {
      console.error('Failed to refresh data:', err)
    } finally {
      setRefreshing(false)
    }
  }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Bulk Tiebreakers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/5 relative p-1 flex-shrink-0">
              <Image
                src={getPhotoUrlFromDb(liveData.basePlayer.photoUrl)}
                alt={liveData.basePlayer.name}
                width={64}
                height={64}
                unoptimized={true}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 uppercase tracking-wider leading-none">
                Bulk Tiebreaker Monitor
              </h1>
              <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                {liveData.basePlayer.name} • Round {liveData.round.roundNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Manual Resolve Button */}
            {liveData.status !== 'completed' && (
              <button
                onClick={() => setShowManualResolve(!showManualResolve)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all text-emerald-400 uppercase tracking-wider font-mono shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showManualResolve ? 'Hide' : 'Manual Resolve'}</span>
              </button>
            )}

            {/* Sync / Reconnect Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold hover:bg-white/[0.04] transition-all text-gray-400 hover:text-white disabled:opacity-50 active:scale-95 cursor-pointer uppercase tracking-wider font-mono shadow-md"
              title="Force Refresh Data & Reconnect Stream"
            >
              <svg className={`w-4 h-4 text-[#E8A800] ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 20v-5h-.581m0 0a8.003 8.003 0 11-15.357-2" />
              </svg>
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Live Indicator */}
            {liveData.status === 'active' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/25 border border-red-500/25 text-[10px] font-extrabold uppercase tracking-widest font-mono text-red-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
            {liveData.status === 'pending' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-500/25 text-[10px] font-extrabold uppercase tracking-widest font-mono text-amber-400">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                <span>AWAITING START</span>
              </div>
            )}
            {timeRemaining && (
              <div className="px-3 py-1.5 rounded-xl bg-purple-500/25 border border-purple-500/25 text-left font-mono">
                <div className="text-[9px] text-purple-400 uppercase tracking-widest font-extrabold mb-0.5">Time Remaining</div>
                <div className="text-xs font-black text-purple-300">{timeRemaining}</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-md overflow-hidden">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Base Price</div>
            <div className="text-lg font-black text-white font-mono">£{liveData.basePrice.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-md overflow-hidden">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Submissions</div>
            <div className="text-lg font-black text-[#E8A800] font-mono">
              {liveData.participants.filter(p => p.submitted).length} / {liveData.participants.filter(p => p.status === 'active').length}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-md overflow-hidden">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Teams Remaining</div>
            <div className="text-lg font-black text-white font-mono">{liveData.teamsRemaining}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-md overflow-hidden">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Status</div>
            <div className={`text-lg font-black font-mono ${
              liveData.status === 'pending' ? 'text-amber-400' : 
              liveData.status === 'active' ? 'text-red-400' : 
              liveData.status === 'completed' ? 'text-emerald-400' : 'text-gray-400'
            }`}>
              {liveData.status.toUpperCase()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-md overflow-hidden">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Winning Bid</div>
            <div className="text-lg font-black text-[#E8A800] font-mono">
              {liveData.status === 'completed' && liveData.currentHighestBid 
                ? `£${liveData.currentHighestBid.toLocaleString()}`
                : 'Sealed'}
            </div>
          </div>
        </div>
      </div>
 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Manual Resolution Section */}
        {showManualResolve && liveData.status !== 'completed' && (
          <div className="mb-6">
            <BulkTiebreakerManualResolve
              tiebreakerId={liveData.id}
              basePrice={liveData.basePrice}
              participants={liveData.participants}
              playerName={liveData.basePlayer.name}
              seasonId={seasonId}
              maxSquadSize={maxSquadSize}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sealed Bids Display (Admin View) */}
          <div className="lg:col-span-2">
            {/* Current Leader (only show if completed) */}
            {highestBidder && liveData.status === 'completed' && (
              <div className="rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 p-6 mb-6 backdrop-blur-xl shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/5 p-1 relative flex-shrink-0">
                    <Image
                      src={highestBidder.team.logoUrl}
                      alt={highestBidder.team.name}
                      width={48}
                      height={48}
                      unoptimized={true}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest font-mono font-extrabold">Winner</div>
                    <div className="text-lg font-extrabold text-white truncate uppercase tracking-tight">{highestBidder.team.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest font-mono font-extrabold">Winning Bid</div>
                    <div className="text-xl sm:text-2xl font-black text-[#E8A800] font-mono">
                      £{liveData.currentHighestBid?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sealed Bids Table */}
            <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
              <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight font-mono">
                {liveData.status === 'completed' ? 'Final Bids' : 'Sealed Bids (Admin View)'}
              </h2>
              {liveData.status === 'active' && (
                <p className="text-xs text-amber-400 mb-4 bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider font-mono">
                  ⚠️ Bids are sealed and hidden from teams until all submit or admin resolves manually.
                </p>
              )}
              <div className="space-y-2">
                {liveData.participants.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 font-bold uppercase tracking-wider font-mono text-xs">No participants</p>
                ) : (
                  liveData.participants
                    .sort((a, b) => (b.newBidAmount || 0) - (a.newBidAmount || 0))
                    .map((participant, index) => (
                      <div
                        key={participant.id ? `participant-${participant.id}` : `participant-fallback-${index}`}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          liveData.status === 'completed' && participant.teamId === liveData.currentHighestTeamId
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : participant.status === 'active'
                            ? 'bg-white/[0.01] border-white/5'
                            : 'bg-red-500/5 border-red-500/20 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/5 relative p-1 flex-shrink-0">
                            <Image
                              src={participant.team.logoUrl}
                              alt={participant.team.name}
                              width={40}
                              height={40}
                              unoptimized={true}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm sm:text-base uppercase tracking-tight flex items-center gap-2">
                              {participant.team.name}
                              {liveData.status === 'completed' && participant.teamId === liveData.currentHighestTeamId && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest font-mono bg-emerald-500/25 text-emerald-400 border border-emerald-500/25">
                                  Winner
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-0.5">
                              {participant.submitted ? (
                                <span className="text-emerald-400">✓ Submitted</span>
                              ) : participant.status === 'active' ? (
                                <span className="text-amber-400">Pending</span>
                              ) : (
                                <span className="text-red-400">Withdrawn</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {participant.newBidAmount ? (
                            <div className={`text-lg font-black font-mono ${
                              liveData.status === 'completed' && participant.teamId === liveData.currentHighestTeamId
                                ? 'text-[#E8A800]'
                                : 'text-white'
                            }`}>
                              £{participant.newBidAmount.toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                              {participant.status === 'active' ? 'Not submitted' : 'Withdrawn'}
                            </div>
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
            <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 sticky top-6 backdrop-blur-xl shadow-md">
              <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight font-mono">Submission Status</h2>
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="text-[10px] text-purple-400 mb-1 uppercase tracking-widest font-mono font-extrabold">Progress</div>
                <div className="text-xl font-black text-white font-mono">
                  {liveData.participants.filter(p => p.submitted).length} / {liveData.participants.filter(p => p.status === 'active').length}
                </div>
                <div className="text-[10px] text-purple-300 mt-1 uppercase tracking-widest font-mono font-extrabold">teams submitted</div>
              </div>
              <div className="space-y-3">
                {liveData.participants
                  .sort((a, b) => {
                    // Sort by submission status first, then by bid amount
                    if (a.submitted !== b.submitted) return a.submitted ? -1 : 1
                    return (b.newBidAmount || 0) - (a.newBidAmount || 0)
                  })
                  .map((participant, index) => {
                    const isLeading = liveData.status === 'completed' && participant.teamId === liveData.currentHighestTeamId
                    return (
                      <div
                        key={participant.id ? `participant-${participant.id}` : `participant-fallback-${index}`}
                        className={`p-4 rounded-xl border transition-all ${
                          participant.status === 'active'
                            ? isLeading
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-white/[0.01] border-white/5'
                            : 'bg-red-500/5 border-red-500/20 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/5 p-1 relative flex-shrink-0">
                            <Image
                              src={participant.team.logoUrl}
                              alt={participant.team.name}
                              width={40}
                              height={40}
                              unoptimized={true}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-white text-xs sm:text-sm truncate uppercase tracking-tight">
                              {participant.team.name}
                            </div>
                            {isLeading && participant.status === 'active' && (
                              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono mt-0.5">Winner</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest font-mono ${
                            participant.submitted
                              ? 'text-emerald-400'
                              : participant.status === 'active'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {participant.submitted ? '✓ Submitted' : participant.status === 'active' ? 'Pending' : 'Withdrawn'}
                          </span>
                          {participant.newBidAmount && liveData.status === 'completed' && (
                            <span className="text-sm font-black text-[#E8A800] font-mono">
                              £{participant.newBidAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {participant.submittedAt && (
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-2" suppressHydrationWarning>
                            Submitted: {new Date(participant.submittedAt).toLocaleTimeString()}
                          </div>
                        )}
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
