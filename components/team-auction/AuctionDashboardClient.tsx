'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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

interface BulkTiebreaker {
  id: number
  basePlayer: {
    name: string
    photoUrl: string
  }
  participants: Array<{
    status: string
    currentBid: number | null
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
  tiebreakers: Tiebreaker[]
  bulkTiebreakers: BulkTiebreaker[]
}

export default function AuctionDashboardClient({
  team,
  season,
  budget,
  squadSize,
  rounds,
  teamBids,
  bulkSelections,
  tiebreakers,
  bulkTiebreakers
}: AuctionDashboardClientProps) {
  const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, string>>({})

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
  }, [rounds])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      case 'draft':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      case 'tiebreaker_pending':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
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
      const selection = bulkSelections.find(s => s.roundId === roundId)
      if (!selection) return { label: 'Not Started', color: 'text-gray-400' }
      if (selection.submitted) return { label: 'Submitted', color: 'text-emerald-400' }
      return { label: 'Draft Saved', color: 'text-amber-400' }
    } else {
      const bid = teamBids.find(b => b.roundId === roundId)
      if (!bid) return { label: 'Not Started', color: 'text-gray-400' }
      if (bid.submitted) return { label: `Submitted (${bid.bidCount})`, color: 'text-emerald-400' }
      return { label: `Draft (${bid.bidCount})`, color: 'text-amber-400' }
    }
  }

  const activeRounds = rounds.filter(r => r.status === 'active')
  const upcomingRounds = rounds.filter(r => r.status === 'draft')
  const pendingRounds = rounds.filter(r => 
    r.status === 'expired_pending_finalization' || r.status === 'tiebreaker_pending'
  )
  const completedRounds = rounds.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                Auction
              </h1>
              <p className="text-sm sm:text-base text-[#D4CCBB]">
                {season.name} — Place your bids
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Budget</div>
              <div className="text-lg sm:text-xl font-bold text-white">
                £{budget.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Squad Size</div>
              <div className="text-lg sm:text-xl font-bold text-white">{squadSize}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Active Rounds</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400">
                {activeRounds.length}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Tiebreakers</div>
              <div className="text-lg sm:text-xl font-bold text-purple-400">
                {tiebreakers.length + bulkTiebreakers.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tiebreakers Alert */}
        {(tiebreakers.length > 0 || bulkTiebreakers.length > 0) && (
          <div className="mb-6 rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  Action Required: Tiebreakers
                </h3>
                <p className="text-sm text-purple-200 mb-3">
                  You have {tiebreakers.length + bulkTiebreakers.length} tiebreaker(s) waiting for your bid
                </p>
                <Link
                  href="#tiebreakers"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg font-medium transition-all text-sm"
                >
                  View Tiebreakers
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Active Rounds */}
        {activeRounds.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Active Rounds</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeRounds.map(round => {
                const bidStatus = getBidStatus(round.id, round.roundType)
                return (
                  <Link
                    key={round.id}
                    href={`/team/auction/rounds/${round.id}`}
                    className="block rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">
                          Round {round.roundNumber}
                        </h3>
                        {round.position && (
                          <p className="text-sm text-[#D4CCBB]">{round.position}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(round.status)}`}>
                        {getStatusLabel(round.status)}
                      </span>
                    </div>

                    {timeRemainingMap[round.id] && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-emerald-300">
                            {timeRemainingMap[round.id]} remaining
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${bidStatus.color}`}>
                        {bidStatus.label}
                      </span>
                      <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Tiebreakers */}
        {(tiebreakers.length > 0 || bulkTiebreakers.length > 0) && (
          <div id="tiebreakers" className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Tiebreakers</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tiebreakers.map(tb => (
                <Link
                  key={tb.id}
                  href={`/team/auction/tiebreakers/${tb.id}`}
                  className="block rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={tb.basePlayer.photoUrl}
                        alt={tb.basePlayer.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{tb.basePlayer.name}</h3>
                      <p className="text-sm text-[#D4CCBB]">Round {tb.round.roundNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      tb.teamTiebreakerBids[0]?.submitted ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {tb.teamTiebreakerBids[0]?.submitted ? 'Bid Submitted' : 'Bid Required'}
                    </span>
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
              {bulkTiebreakers.map(tb => (
                <Link
                  key={tb.id}
                  href={`/team/auction/bulk-tiebreakers/${tb.id}`}
                  className="block rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={tb.basePlayer.photoUrl}
                        alt={tb.basePlayer.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{tb.basePlayer.name}</h3>
                      <p className="text-sm text-[#D4CCBB]">Bulk Tiebreaker</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-300">
                      {tb.participants[0]?.status === 'active' ? 'Active' : 'Withdrawn'}
                    </span>
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Rounds */}
        {upcomingRounds.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Upcoming Rounds</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {upcomingRounds.map(round => (
                <div
                  key={round.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 opacity-60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        Round {round.roundNumber}
                      </h3>
                      {round.position && (
                        <p className="text-sm text-[#D4CCBB]">{round.position}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(round.status)}`}>
                      {getStatusLabel(round.status)}
                    </span>
                  </div>
                  <p className="text-sm text-[#7A7367]">
                    This round has not started yet
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Rounds */}
        {completedRounds.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Completed Rounds</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {completedRounds.map(round => (
                <Link
                  key={round.id}
                  href={`/team/auction/rounds/${round.id}/results`}
                  className="block rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        Round {round.roundNumber}
                      </h3>
                      {round.position && (
                        <p className="text-sm text-[#D4CCBB]">{round.position}</p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/30">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7A7367]">
                      View results
                    </span>
                    <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeRounds.length === 0 && upcomingRounds.length === 0 && tiebreakers.length === 0 && bulkTiebreakers.length === 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Active Auctions</h2>
            <p className="text-[#D4CCBB]">
              There are no active auction rounds at the moment. Check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
