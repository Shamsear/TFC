'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  _count: {
    teamRoundBids: number
    tiebreakers: number
  }
}

interface RoundsListClientProps {
  seasonId: string
  initialRounds: Round[]
  onNavigate?: (message: string) => void
}

export default function RoundsListClient({ seasonId, initialRounds, onNavigate }: RoundsListClientProps) {
  const router = useRouter()
  const [rounds, setRounds] = useState(initialRounds)
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'completed'>('all')
  const [isPolling, setIsPolling] = useState(true)

  // Live polling - refresh data every 5 seconds
  useEffect(() => {
    if (!isPolling) return

    const fetchLiveData = async () => {
      try {
        // Use router.refresh() to trigger server component re-fetch
        router.refresh()
      } catch (error) {
        console.error('Failed to refresh data:', error)
      }
    }

    // Poll every 5 seconds
    const interval = setInterval(fetchLiveData, 5000)
    return () => clearInterval(interval)
  }, [isPolling, router])

  // Update rounds when initialRounds changes (from router.refresh)
  useEffect(() => {
    setRounds(initialRounds)
  }, [initialRounds])

  // Format date consistently for SSR/CSR
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}/${day}/${year}, ${hours}:${minutes}`
  }

  // Format number consistently for SSR/CSR
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const filteredRounds = rounds.filter(round => {
    if (filter === 'all') return true
    return round.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      case 'active':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      case 'completed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'expired_pending_finalization':
      case 'pending_finalization':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      case 'tiebreaker_pending':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'finalizing':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      default:
        return 'bg-white/10 text-white border-white/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'active':
        return 'Active'
      case 'completed':
        return 'Completed'
      case 'expired_pending_finalization':
        return 'Expired (Pending)'
      case 'pending_finalization':
        return 'Pending Finalization'
      case 'tiebreaker_pending':
        return 'Tiebreaker Pending'
      case 'finalizing':
        return 'Finalizing...'
      default:
        return status
    }
  }

  const getRoundTypeLabel = (type: string) => {
    return type === 'bulk' ? 'Bulk' : 'Normal'
  }

  const getRoundTypeColor = (type: string) => {
    return type === 'bulk' 
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  }

  return (
    <div>
      {/* Live Indicator & Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isPolling && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-emerald-300">Live Updates</span>
            </div>
          )}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium text-[#D4CCBB]"
          >
            {isPolling ? 'Pause' : 'Resume'} Updates
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            filter === 'all'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/5 text-[#7A7367] border border-white/10 hover:bg-white/10'
          }`}
        >
          All ({rounds.length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            filter === 'draft'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/5 text-[#7A7367] border border-white/10 hover:bg-white/10'
          }`}
        >
          Draft ({rounds.filter(r => r.status === 'draft').length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            filter === 'active'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/5 text-[#7A7367] border border-white/10 hover:bg-white/10'
          }`}
        >
          Active ({rounds.filter(r => r.status === 'active').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            filter === 'completed'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/5 text-[#7A7367] border border-white/10 hover:bg-white/10'
          }`}
        >
          Completed ({rounds.filter(r => r.status === 'completed').length})
        </button>
      </div>

      {/* Rounds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRounds.map((round) => (
          <Link
            key={round.id}
            href={`/sub-admin/${seasonId}/auction/rounds/${round.id}`}
            onClick={() => onNavigate?.(`Loading Round ${round.roundNumber} details...`)}
            className="block rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white">
                    Round {round.roundNumber}
                  </h3>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getRoundTypeColor(round.roundType)}`}>
                    {getRoundTypeLabel(round.roundType)}
                  </span>
                </div>
                {round.position && (
                  <p className="text-sm text-[#D4CCBB]">
                    Position: {round.position}{round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(round.status)}`}>
                {getStatusLabel(round.status)}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-[#7A7367] mb-1">Team Bids</div>
                <div className="text-lg font-bold text-white">{round._count.teamRoundBids}</div>
              </div>
              <div>
                <div className="text-xs text-[#7A7367] mb-1">Tiebreakers</div>
                <div className="text-lg font-bold text-white">{round._count.tiebreakers}</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              {round.maxBidsPerTeam && (
                <div className="flex justify-between text-[#D4CCBB]">
                  <span>Max Bids:</span>
                  <span className="font-medium text-white">{round.maxBidsPerTeam}</span>
                </div>
              )}
              {round.basePrice && (
                <div className="flex justify-between text-[#D4CCBB]">
                  <span>Base Price:</span>
                  <span className="font-medium text-white">£{formatNumber(round.basePrice)}</span>
                </div>
              )}
              {round.startTime && (
                <div className="flex justify-between text-[#D4CCBB]">
                  <span>Started:</span>
                  <span className="font-medium text-white">
                    {formatDate(round.startTime)}
                  </span>
                </div>
              )}
              {round.endTime && (
                <div className="flex justify-between text-[#D4CCBB]">
                  <span>Ends:</span>
                  <span className="font-medium text-white">
                    {formatDate(round.endTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Indicator */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-[#7A7367]">View Details</span>
              <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {filteredRounds.length === 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <p className="text-[#D4CCBB]">No rounds found with status: {filter}</p>
        </div>
      )}
    </div>
  )
}
