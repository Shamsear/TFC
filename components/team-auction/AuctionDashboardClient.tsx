'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface Season {
  id: string
  name: string
  seasonNumber: number
}

interface Round {
  id: string
  roundNumber: number
  position: string | null
  position_group?: string | null
  roundType: string
  status: string
  startTime: Date | null
  endTime: Date | null
  maxBidsPerTeam: number | null
  basePrice: number | null
}

interface TeamBid {
  roundId: string
  submitted: boolean
  bidCount: number
  lastUpdated: Date
}

interface BulkSelection {
  roundId: string
  submitted: boolean
  lastUpdated: Date
}

interface Tiebreaker {
  id: string
  basePlayer: {
    name: string
    photoUrl: string
  }
  round: {
    roundNumber: number
  }
  teamTiebreakerBids: Array<{
    submitted: boolean
    newBidAmount: number | null
  }>
}

interface PendingTiebreaker {
  id: string
  basePlayer: {
    name: string
    photoUrl: string
  }
  round: {
    roundNumber: number
  }
  teamTiebreakerBids: Array<{
    teamId: string
    team: {
      name: string
      logoUrl: string
    }
  }>
}

interface BulkTiebreaker {
  id: number
  basePlayer: {
    name: string
    photoUrl: string
  }
  round: {
    roundNumber: number
  }
  participants: Array<{
    status: string
    currentBid: number | null
  }>
}

interface PendingBulkTiebreaker {
  id: number
  basePlayer: {
    name: string
    photoUrl: string
  }
  round: {
    roundNumber: number
  }
  participants: Array<{
    teamId: string
    status: string
    team: {
      name: string
      logoUrl: string
    }
  }>
}

interface AuctionDashboardClientProps {
  team: Team
  season: Season
  budget: number
  squadSize: number
  rounds: Round[]
  teamBids: TeamBid[]
  bulkSelections: BulkSelection[]
  activeTiebreakers: Tiebreaker[]
  pendingTiebreakers: PendingTiebreaker[]
  activeBulkTiebreakers: BulkTiebreaker[]
  pendingBulkTiebreakers: PendingBulkTiebreaker[]
}

export default function AuctionDashboardClient({
  team,
  season,
  budget,
  squadSize,
  rounds,
  teamBids,
  bulkSelections,
  activeTiebreakers,
  pendingTiebreakers,
  activeBulkTiebreakers,
  pendingBulkTiebreakers
}: AuctionDashboardClientProps) {
  const router = useRouter()
  const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, string>>({})
  const [isPolling, setIsPolling] = useState(true)
  const [showPendingTiebreakers, setShowPendingTiebreakers] = useState(false)
  const [liveData, setLiveData] = useState({
    rounds,
    teamBids,
    bulkSelections,
    activeTiebreakers,
    pendingTiebreakers,
    activeBulkTiebreakers,
    pendingBulkTiebreakers,
    budget,
    squadSize
  })

  // Live polling - refresh data every 5 seconds
  useEffect(() => {
    if (!isPolling) return

    const fetchLiveData = async () => {
      try {
        router.refresh()
      } catch (error) {
        console.error('Failed to refresh data:', error)
      }
    }

    const interval = setInterval(fetchLiveData, 5000)
    return () => clearInterval(interval)
  }, [isPolling, router])

  // Update live data when props change (from router.refresh)
  useEffect(() => {
    setLiveData({
      rounds,
      teamBids,
      bulkSelections,
      activeTiebreakers,
      pendingTiebreakers,
      activeBulkTiebreakers,
      pendingBulkTiebreakers,
      budget,
      squadSize
    })
  }, [rounds, teamBids, bulkSelections, activeTiebreakers, pendingTiebreakers, activeBulkTiebreakers, pendingBulkTiebreakers, budget, squadSize])

  // Calculate time remaining for active rounds
  useEffect(() => {
    const updateTimers = () => {
      const newMap: Record<string, string> = {}
      
      rounds.forEach(round => {
        if (round.status === 'active' && round.endTime) {
          const now = new Date()
          const end = new Date(round.endTime)
          const diff = end.getTime() - now.getTime()
          
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            
            if (hours > 0) {
              newMap[round.id] = `${hours}h ${minutes}m`
            } else if (minutes > 0) {
              newMap[round.id] = `${minutes}m ${seconds}s`
            } else {
              newMap[round.id] = `${seconds}s`
            }
          } else {
            newMap[round.id] = 'Expired'
          }
        }
      })
      
      setTimeRemainingMap(newMap)
    }

    updateTimers()
    const interval = setInterval(updateTimers, 1000)
    
    return () => clearInterval(interval)
  }, [liveData.rounds, rounds])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'draft':
        return 'bg-white/[0.04] text-gray-400 border-white/5'
      case 'tiebreaker_pending':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'draft':
        return 'Coming Soon'
      case 'tiebreaker_pending':
        return 'Tiebreaker'
      case 'expired_pending_finalization':
        return 'Finalizing'
      default:
        return status
    }
  }

  const getBidStatus = (roundId: string, roundType: string) => {
    if (roundType === 'bulk') {
      const selection = liveData.bulkSelections.find(s => s.roundId === roundId)
      if (!selection) return { label: 'No Selections Placed', color: 'text-gray-500' }
      if (selection.submitted) return { label: 'Submitted', color: 'text-emerald-400' }
      return { label: 'Draft Saved', color: 'text-amber-400' }
    } else {
      const bid = liveData.teamBids.find(b => b.roundId === roundId)
      if (!bid) return { label: 'No Bids Placed', color: 'text-gray-500' }
      if (bid.submitted) return { label: `Submitted (${bid.bidCount} players)`, color: 'text-emerald-400' }
      return { label: `Draft (${bid.bidCount} players)`, color: 'text-amber-400' }
    }
  }

  const getPositionColor = (pos: string | null) => {
    if (!pos) return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    switch (pos.toUpperCase()) {
      case 'GK': return 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
      case 'CB': return 'bg-blue-500/10 border-blue-500/25 text-blue-400'
      case 'LB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'RB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'DMF': return 'bg-green-600/10 border-green-600/25 text-green-500'
      case 'CMF': return 'bg-green-500/10 border-green-500/25 text-green-400'
      case 'LMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'RMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'AMF': return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
      case 'SS': return 'bg-orange-500/10 border-orange-500/25 text-orange-400'
      case 'LWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'RWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'CF': return 'bg-red-500/10 border-red-500/25 text-red-400'
      default: return 'bg-gray-500/10 border-gray-500/25 text-gray-400'
    }
  }

  const activeRounds = liveData.rounds.filter(r => r.status === 'active')
  const upcomingRounds = liveData.rounds.filter(r => r.status === 'draft')
  const pendingRounds = liveData.rounds.filter(r => 
    r.status === 'expired_pending_finalization' || r.status === 'tiebreaker_pending'
  )
  const completedRounds = liveData.rounds.filter(r => r.status === 'completed')

  // Count action items
  const activeActionItemsCount = liveData.activeTiebreakers.length + liveData.activeBulkTiebreakers.length
  const pendingActionItemsCount = liveData.pendingTiebreakers.length + liveData.pendingBulkTiebreakers.length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.02] blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/10 p-1 flex-shrink-0 group shadow-lg hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent opacity-50" />
              <img
                src={team.logoUrl}
                alt={team.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                  Draft Room
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {season.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Live Indicator */}
            {isPolling && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Live</span>
              </div>
            )}
            
            {/* Pause/Resume button */}
            <button
              onClick={() => setIsPolling(!isPolling)}
              className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all text-xs font-bold text-[#D4CCBB] flex items-center gap-2 transform active:scale-95 cursor-pointer shadow-md"
              title={isPolling ? 'Pause real-time updates' : 'Resume real-time updates'}
            >
              {isPolling ? (
                <>
                  <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                  </svg>
                  <span>Sync Active</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-400">Sync Paused</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Quick Stats Banner Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Stat 1: Budget */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Available Budget</div>
            <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight">
              £{liveData.budget.toLocaleString()}
            </div>
          </div>

          {/* Stat 2: Squad Size */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Drafted Squad</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {liveData.squadSize} <span className="text-xs font-semibold text-gray-500">players</span>
            </div>
          </div>

          {/* Stat 3: Active Rounds */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Active Rounds</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight">
              {activeRounds.length} <span className="text-xs font-semibold text-gray-500">open</span>
            </div>
          </div>

          {/* Stat 4: Action Items */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Action Required</div>
            <div className={`text-xl sm:text-2xl font-black tracking-tight ${activeActionItemsCount > 0 ? 'text-purple-400' : 'text-gray-400'}`}>
              {activeActionItemsCount} <span className="text-xs font-semibold text-gray-500">tasks</span>
            </div>
          </div>
        </div>

        {/* Tiebreakers Alert Callout */}
        {activeActionItemsCount > 0 && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/[0.02] to-transparent border border-purple-500/20 p-5 sm:p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl animate-[pulse_3s_infinite_ease-in-out]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400 shadow-inner">
                <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">
                  Critical Tiebreakers Discovered
                </h3>
                <p className="text-xs sm:text-sm text-purple-200 leading-relaxed mb-4">
                  Your bid matches other managers! Submit your new tiebreaker bids immediately to secure your targeted players.
                </p>
                <Link
                  href="#active-tiebreakers"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl font-extrabold text-xs transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] cursor-pointer active:scale-95"
                >
                  Resolve Tiebreakers Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Active Rounds Section */}
        {activeRounds.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Active Auction Rounds
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {activeRounds.map(round => {
                const bidStatus = getBidStatus(round.id, round.roundType)
                const roundPath = round.roundType === 'bulk' 
                  ? `/team/auction/bulk-rounds/${round.id}`
                  : `/team/auction/rounds/${round.id}`
                return (
                  <Link
                    key={round.id}
                    href={roundPath}
                    className="block relative rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/40 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] transition-all duration-300 p-5 sm:p-6 group shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.01] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Live Round
                          </span>
                          <span className="text-[10px] font-black text-gray-400 bg-white/[0.03] border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {round.roundType}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                          Round {round.roundNumber}
                        </h3>
                        {round.position && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider ${getPositionColor(round.position)}`}>
                              {round.position}{round.position_group && round.position_group !== 'ALL' ? ` • ${round.position_group}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(round.status)}`}>
                        {getStatusLabel(round.status)}
                      </span>
                    </div>

                    {timeRemainingMap[round.id] && (
                      <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 flex items-center gap-2 group-hover:bg-emerald-500/[0.05] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                          {timeRemainingMap[round.id]} remaining
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3.5">
                      <span className={`text-xs font-black uppercase tracking-wider ${bidStatus.color}`}>
                        {bidStatus.label}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8A800] group-hover:translate-x-1 transition-transform">
                        <span>Place Bids</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Tiebreakers Section */}
        {(activeTiebreakers.length > 0 || activeBulkTiebreakers.length > 0) && (
          <div id="active-tiebreakers" className="mb-10">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              Active Draft Tiebreakers
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {liveData.activeTiebreakers.map(tb => (
                <Link
                  key={tb.id}
                  href={`/team/auction/tiebreakers/${tb.id}`}
                  className="block relative rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all duration-300 p-5 group shadow-xl"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    {/* Player Frame */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-purple-500/30 transition-colors shadow-inner">
                      <img
                        src={getPhotoUrlFromDb(tb.basePlayer.photoUrl)}
                        alt={tb.basePlayer.name}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Standard Tiebreaker
                        </span>
                        <span className="text-[9px] font-black text-gray-500 uppercase">
                          Round {tb.round.roundNumber}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-purple-400 transition-colors leading-tight truncate">
                        {tb.basePlayer.name}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider animate-pulse flex-shrink-0">
                      LIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4 relative z-10">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      tb.teamTiebreakerBids[0]?.submitted ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {tb.teamTiebreakerBids[0]?.submitted ? '✓ Bid Placed' : '⚡ Action Required'}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                      <span>Resolve</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}

              {liveData.activeBulkTiebreakers.map(tb => (
                <Link
                  key={tb.id}
                  href={`/team/auction/bulk-tiebreakers/${tb.id}`}
                  className="block relative rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all duration-300 p-5 group shadow-xl"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    {/* Player Frame */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-purple-500/30 transition-colors shadow-inner">
                      <img
                        src={getPhotoUrlFromDb(tb.basePlayer.photoUrl)}
                        alt={tb.basePlayer.name}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Bulk Tiebreaker
                        </span>
                        <span className="text-[9px] font-black text-gray-500 uppercase">
                          Round {tb.round.roundNumber}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-purple-400 transition-colors leading-tight truncate">
                        {tb.basePlayer.name}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider animate-pulse flex-shrink-0">
                      LIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4 relative z-10">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                      {tb.participants[0]?.status === 'active' ? '⚡ Active Participant' : 'Withdrawn'}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                      <span>Resolve</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tiebreakers (Awaiting Admin) Collapsible Banner */}
        {(pendingTiebreakers.length > 0 || pendingBulkTiebreakers.length > 0) && (
          <div className="mb-8">
            <button
              onClick={() => setShowPendingTiebreakers(!showPendingTiebreakers)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-amber-500/20 hover:bg-white/[0.03] transition-all duration-300 shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors shadow-inner flex-shrink-0">
                  <svg className="w-5.5 h-5.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-amber-400 transition-colors">
                    Pending Tiebreakers ({pendingActionItemsCount})
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Awaiting league admin authorization to start bidding</p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-amber-400 transition-transform duration-300 ${showPendingTiebreakers ? 'rotate-185' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPendingTiebreakers && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 animate-[fadeIn_0.3s_ease-out]">
                {liveData.pendingTiebreakers.map(tb => (
                  <Link
                    key={tb.id}
                    href={`/team/auction/tiebreakers/${tb.id}/preview`}
                    className="block relative rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-amber-500/20 hover:border-amber-500/40 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.06)] transition-all duration-300 p-5 group shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      {/* Player Frame */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-amber-500/30 transition-colors">
                        <img
                          src={getPhotoUrlFromDb(tb.basePlayer.photoUrl)}
                          alt={tb.basePlayer.name}
                          loading="eager"
                          decoding="async"
                          className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Standard
                          </span>
                          <span className="text-[9px] font-black text-gray-500 uppercase">
                            Round {tb.round.roundNumber}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors leading-tight truncate">
                          {tb.basePlayer.name}
                        </h3>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider flex-shrink-0">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {tb.teamTiebreakerBids.length} Contested Franchises
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                        <span>Preview</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}

                {liveData.pendingBulkTiebreakers.map(tb => (
                  <Link
                    key={tb.id}
                    href={`/team/auction/bulk-tiebreakers/${tb.id}/preview`}
                    className="block relative rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-amber-500/20 hover:border-amber-500/40 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.06)] transition-all duration-300 p-5 group shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      {/* Player Frame */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-amber-500/30 transition-colors">
                        <img
                          src={getPhotoUrlFromDb(tb.basePlayer.photoUrl)}
                          alt={tb.basePlayer.name}
                          loading="eager"
                          decoding="async"
                          className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Bulk Tiebreaker
                          </span>
                          <span className="text-[9px] font-black text-gray-500 uppercase">
                            Round {tb.round.roundNumber}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors leading-tight truncate">
                          {tb.basePlayer.name}
                        </h3>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider flex-shrink-0">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {tb.participants.length} Contested Franchises
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                        <span>Preview</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Rounds Section */}
        {upcomingRounds.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4 tracking-tight">
              Upcoming Rounds
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {upcomingRounds.map(round => (
                <div
                  key={round.id}
                  className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 sm:p-6 opacity-45 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Round {round.roundNumber}
                      </h3>
                      {round.position && (
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wider ${getPositionColor(round.position)}`}>
                            {round.position}{round.position_group && round.position_group !== 'ALL' ? ` • ${round.position_group}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border border-white/10 bg-white/[0.03] text-gray-400 uppercase tracking-wider">
                      Locked
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Awaiting Draft Chamber Activation
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Rounds Section */}
        {completedRounds.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4 tracking-tight">
              Completed Rounds
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {completedRounds.map(round => {
                const resultsPath = round.roundType === 'bulk'
                  ? `/team/auction/bulk-rounds/${round.id}/results`
                  : `/team/auction/rounds/${round.id}/results`
                return (
                  <Link
                    key={round.id}
                    href={resultsPath}
                    className="block relative rounded-2xl bg-[#0d0d0d]/30 backdrop-blur-sm border border-white/5 hover:border-[#E8A800]/30 hover:bg-white/[0.01] hover:shadow-lg transition-all duration-300 p-5 group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-gray-300 group-hover:text-white transition-colors">
                          Round {round.roundNumber}
                        </h3>
                        {round.position && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wider ${getPositionColor(round.position)} opacity-60`}>
                              {round.position}{round.position_group && round.position_group !== 'ALL' ? ` • ${round.position_group}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border border-white/5 bg-white/[0.02] text-gray-400 uppercase tracking-wider flex-shrink-0">
                        Archived
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3.5">
                      <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
                        Results Finalized
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8A800] group-hover:translate-x-1 transition-transform">
                        <span>Review Results</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State Screen */}
        {activeRounds.length === 0 && upcomingRounds.length === 0 && activeTiebreakers.length === 0 && activeBulkTiebreakers.length === 0 && (
          <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 sm:p-16 text-center backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/[0.01] blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-xl flex items-center justify-center text-[#E8A800] mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Draft Chamber Inactive</h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                There are no live draft rounds, auctions, or unresolved tiebreaker claims scheduled right now. Check back soon!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
