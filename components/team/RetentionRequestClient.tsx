'use client'

import { useState, useEffect, useMemo } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'

interface EligiblePlayer {
  id: string
  name: string
  player_id: string | null
  photoUrl: string
  oldSquadValue: number
  position: string
  overallRating: number
  previousSeasonId: string
  previousSeasonName: string
}

interface ExistingRequest {
  id: string
  playerId: string
  playerName: string
  oldSquadValue: number
  notes: string | null
  status: string | null
  submittedAt: string
  processedAt?: string | null
  rejectionReason?: string | null
  basePlayer: {
    id: string
    name: string
    player_id: string | null
  }
  previousSeason: {
    id: string
    name: string
    seasonNumber: number
  }
}

interface Props {
  seasonId: string
  teamId: string
  teamName: string
  seasonName: string
  currentBudget: number
  eligiblePlayers: EligiblePlayer[]
  existingRequests: ExistingRequest[]
  totalRequestsCount: number
  approvedCount: number
  maxRetentions: number
  remainingRequests: number
  remainingApprovals: number
  activeWindow: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
  } | null
  isBanned: boolean
  previousSeason: {
    id: string
    name: string
    seasonNumber: number
  } | null
}

const formatCurrency = (amount: number) => {
  return `£${amount.toLocaleString()}`
}

// Fix: always append .webp for CDN photo URLs
const getPhotoUrl = (playerId: string | null): string => {
  if (!playerId) return '/default-player.png'
  const id = playerId.includes('.') ? playerId : `${playerId}.webp`
  return getPlayerPhotoUrl(id)
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      }
    }
    setTimeLeft(calc())
    const interval = setInterval(() => setTimeLeft(calc()), 1000)
    return () => clearInterval(interval)
  }, [endDate])

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
        <span className="text-xs font-black text-red-400 font-mono uppercase">Window Closed</span>
      </div>
    )
  }

  const segments = [
    { value: timeLeft.days, label: 'D' },
    { value: timeLeft.hours, label: 'H' },
    { value: timeLeft.minutes, label: 'M' },
    { value: timeLeft.seconds, label: 'S' },
  ]

  return (
    <div className="flex items-center gap-1.5">
      {segments.map((seg, i) => (
        <div key={seg.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-black/40 border border-[#E8A800]/30 flex items-center justify-center">
              <span className="text-lg sm:text-xl font-black text-[#E8A800] font-mono tabular-nums">
                {String(seg.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[8px] text-gray-500 font-mono mt-0.5">{seg.label}</span>
          </div>
          {i < segments.length - 1 && (
            <span className="text-[#E8A800] font-bold text-sm mb-3">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function RetentionRequestClient({
  seasonId,
  teamId,
  teamName,
  seasonName,
  currentBudget,
  eligiblePlayers: initialEligiblePlayers,
  existingRequests: initialRequests,
  totalRequestsCount: initialTotalCount,
  approvedCount: initialApprovedCount,
  maxRetentions,
  remainingRequests: initialRemainingRequests,
  remainingApprovals: initialRemainingApprovals,
  activeWindow,
  isBanned,
  previousSeason,
}: Props) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<{ [playerId: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'rating'>('rating')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [positionFilter, setPositionFilter] = useState('ALL')

  const [eligiblePlayers, setEligiblePlayers] = useState(initialEligiblePlayers)
  const [existingRequests, setExistingRequests] = useState(initialRequests)
  const [totalRequestsCount, setTotalRequestsCount] = useState(initialTotalCount)
  const [approvedCount, setApprovedCount] = useState(initialApprovedCount)
  const [remainingRequests, setRemainingRequests] = useState(initialRemainingRequests)
  const [remainingApprovals, setRemainingApprovals] = useState(initialRemainingApprovals)

  const pendingRequests = existingRequests.filter(r => r.status === 'pending')
  const processedRequests = existingRequests.filter(r => r.status !== 'pending')

  // Position filter options derived from data
  const positions = useMemo(() => {
    const posSet = new Set(eligiblePlayers.map(p => p.position))
    return ['ALL', ...Array.from(posSet).sort()]
  }, [eligiblePlayers])

  // Filter and sort eligible players
  const filteredPlayers = useMemo(() => eligiblePlayers
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      return matchesSearch && matchesPosition
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortBy === 'rating') {
        return sortOrder === 'asc' ? a.overallRating - b.overallRating : b.overallRating - a.overallRating
      } else {
        return sortOrder === 'asc' ? a.oldSquadValue - b.oldSquadValue : b.oldSquadValue - a.oldSquadValue
      }
    }), [eligiblePlayers, searchQuery, positionFilter, sortBy, sortOrder])

  const togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      if (newSelected.size >= remainingRequests) {
        setError(`You can only submit ${remainingRequests} more retention request${remainingRequests !== 1 ? 's' : ''}`)
        return
      }
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
    setError(null)
  }

  const totalRetentionCost = Array.from(selectedPlayers).reduce((sum, playerId) => {
    const player = eligiblePlayers.find(p => p.id === playerId)
    return sum + (player?.oldSquadValue || 0)
  }, 0)

  const handleSubmit = async () => {
    if (selectedPlayers.size === 0) {
      setError('Please select at least one player to retain')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const retentions = Array.from(selectedPlayers).map(playerId => {
        const player = eligiblePlayers.find(p => p.id === playerId)!
        return {
          playerId,
          playerName: player.name,
          oldSquadValue: player.oldSquadValue,
          notes: notes[playerId] || null,
        }
      })

      const response = await fetch('/api/team/retention-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId,
          retentions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit retention requests')
      }

      setSuccess(`Successfully submitted ${selectedPlayers.size} retention request${selectedPlayers.size !== 1 ? 's' : ''}!`)

      // Build new pending requests from selected players for immediate display
      const now = new Date().toISOString()
      const newPendingRequests: ExistingRequest[] = Array.from(selectedPlayers).map(playerId => {
        const player = eligiblePlayers.find(p => p.id === playerId)!
        return {
          id: `temp-${playerId}`,
          playerId,
          playerName: player.name,
          oldSquadValue: player.oldSquadValue,
          notes: notes[playerId] || null,
          status: 'pending',
          submittedAt: now,
          processedAt: null,
          rejectionReason: null,
          basePlayer: {
            id: player.id,
            name: player.name,
            player_id: player.player_id,
          },
          previousSeason: {
            id: player.previousSeasonId,
            name: player.previousSeasonName,
            seasonNumber: 0,
          },
        }
      })

      // Update state immediately
      setExistingRequests(prev => [...newPendingRequests, ...prev])
      setTotalRequestsCount(prev => prev + selectedPlayers.size)
      setRemainingRequests(prev => Math.max(0, prev - selectedPlayers.size))
      setSelectedPlayers(new Set())
      setNotes({})

      // Remove retained players from eligible list
      setEligiblePlayers(prev => prev.filter(p => !selectedPlayers.has(p.id)))

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
    })
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-black text-red-500 mb-2 font-mono">Access Denied</h2>
            <p className="text-gray-400 font-mono">Your team is not allowed to use the retention feature this season.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!activeWindow) {
    return (
      <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-black text-gray-300 mb-2 font-mono">No Active Retention Window</h2>
            <p className="text-gray-400 font-mono">There is currently no active retention window for {seasonName}.</p>
            {existingRequests.length > 0 && (
              <p className="text-gray-500 text-sm mt-4 font-mono">You can view your previous requests below.</p>
            )}
          </div>

          {existingRequests.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-black text-white mb-4 font-mono">Your Retention Requests</h3>
              <div className="space-y-3">
                {existingRequests.map(request => (
                  <div key={request.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Image
                          src={getPhotoUrl(request.basePlayer.player_id)}
                          alt={request.playerName}
                          width={40}
                          height={40}
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{request.playerName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">From {request.previousSeason.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#E8A800] text-sm">{formatCurrency(request.oldSquadValue)}</p>
                        <p className={`text-[10px] font-mono uppercase ${
                          request.status === 'approved' ? 'text-green-500' :
                          request.status === 'rejected' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          {request.status}
                        </p>
                      </div>
                    </div>
                    {request.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-[10px] text-red-400 font-mono">Reason: {request.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!previousSeason) {
    return (
      <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-black text-gray-300 mb-2 font-mono">No Previous Season</h2>
            <p className="text-gray-400 font-mono">No previous season found to retain players from.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#E8A800]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-6 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent font-mono uppercase">
              Player Retention
            </span>
          </h1>
          <p className="text-gray-400 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider">
            Retain players from {previousSeason.name} at their original squad value <span className="text-gray-600">•</span> {seasonName}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-400 text-sm font-mono">{success}</p>
          </div>
        )}

        {/* Window Info + Countdown */}
        <div className="mb-6 p-4 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#E8A800] font-mono">{activeWindow.name}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                {formatDate(activeWindow.startDate)} — {formatDate(activeWindow.endDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CountdownTimer endDate={activeWindow.endDate} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">Budget</p>
            <p className="text-lg font-black text-[#E8A800]">{formatCurrency(currentBudget)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">Remaining</p>
            <p className="text-lg font-black text-white">{remainingRequests} / {maxRetentions}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">Approved</p>
            <p className="text-lg font-black text-green-500">{approvedCount}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">Pending</p>
            <p className="text-lg font-black text-yellow-500">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Your Submitted Requests — shown at the top so teams see them immediately */}
        {existingRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-black text-white font-mono mb-3">Your Retention Requests</h2>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-yellow-500 font-mono uppercase tracking-wider mb-2">Pending Review ({pendingRequests.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="bg-white/[0.03] border border-yellow-500/15 rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={getPhotoUrl(request.basePlayer.player_id)} alt={request.playerName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{request.playerName}</p>
                          <p className="text-[10px] text-gray-500 font-mono">From {request.previousSeason.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#E8A800] text-sm">{formatCurrency(request.oldSquadValue)}</p>
                          <p className="text-[9px] font-mono uppercase text-yellow-500">Pending</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider mb-2">Processed ({processedRequests.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {processedRequests.map(request => (
                    <div key={request.id} className={`bg-white/[0.03] rounded-xl p-3 border ${request.status === 'approved' ? 'border-green-500/15' : 'border-red-500/15'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={getPhotoUrl(request.basePlayer.player_id)} alt={request.playerName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{request.playerName}</p>
                          <p className="text-[10px] text-gray-500 font-mono">From {request.previousSeason.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#E8A800] text-sm">{formatCurrency(request.oldSquadValue)}</p>
                          <p className={`text-[9px] font-mono uppercase ${request.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>{request.status}</p>
                        </div>
                      </div>
                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-[10px] text-red-400 font-mono">{request.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selection Summary + Submit */}
        {selectedPlayers.size > 0 && (
          <div className="mb-6 p-4 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white font-mono">Selected ({selectedPlayers.size})</h3>
              <p className="text-lg font-black text-[#E8A800]">{formatCurrency(totalRetentionCost)}</p>
            </div>
            {/* Selected player chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              {Array.from(selectedPlayers).map(playerId => {
                const player = eligiblePlayers.find(p => p.id === playerId)
                if (!player) return null
                return (
                  <div key={playerId} className="flex items-center gap-2.5 px-3 py-2.5 bg-black/30 border border-[#E8A800]/40 rounded-xl h-[60px]">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={getPhotoUrl(player.player_id)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white font-bold font-mono block truncate">{player.name}</span>
                      <span className="text-[10px] text-[#E8A800] font-mono">{formatCurrency(player.oldSquadValue)}</span>
                    </div>
                    <button
                      onClick={() => togglePlayerSelection(playerId)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedPlayers.size === 0}
              className="w-full py-2.5 bg-[#E8A800] hover:bg-[#FFD066] text-black font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider text-sm"
            >
              {isSubmitting ? 'Submitting...' : `Submit ${selectedPlayers.size} Retention${selectedPlayers.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Eligible Players */}
        <div className="mb-6">
          {/* Search + Filters Row */}
          <div className="flex flex-col gap-3 mb-4">
            <h2 className="text-lg font-black text-white font-mono">Eligible Players</h2>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                placeholder="Search players by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
              />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]/30 text-xs font-mono cursor-pointer min-w-[120px]"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos === 'ALL' ? 'All Positions' : pos}</option>
                ))}
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy as 'name' | 'value' | 'rating')
                  setSortOrder(newSortOrder as 'asc' | 'desc')
                }}
                className="px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]/30 text-xs font-mono cursor-pointer min-w-[140px]"
              >
                <option value="rating-desc">Rating ↓</option>
                <option value="rating-asc">Rating ↑</option>
                <option value="value-desc">Value ↓</option>
                <option value="value-asc">Value ↑</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Showing {filteredPlayers.length} of {eligiblePlayers.length} players
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <p className="text-gray-400 font-mono text-sm">
                {searchQuery || positionFilter !== 'ALL' ? 'No players match your filters' : 'No eligible players for retention'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredPlayers.map(player => {
                const isSelected = selectedPlayers.has(player.id)
                const canAfford = currentBudget >= player.oldSquadValue

                return (
                  <div
                    key={player.id}
                    onClick={() => canAfford && togglePlayerSelection(player.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#E8A800]/15 border-[#E8A800] shadow-lg shadow-[#E8A800]/10 cursor-pointer'
                        : canAfford && remainingRequests > 0
                        ? 'bg-white/[0.03] border-white/10 hover:border-[#E8A800]/40 hover:bg-white/[0.05] cursor-pointer'
                        : 'bg-white/[0.02] border-white/5 opacity-30 cursor-not-allowed'
                    }`}
                  >
                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-[#E8A800] border-[#E8A800]' : 'border-white/20'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Player photo (small) */}
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={getPhotoUrl(player.player_id)} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Name + Position */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm leading-tight truncate">{player.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-[#E8A800] font-mono">{player.position}</span>
                        {player.overallRating > 0 && (
                          <span className="text-[10px] text-gray-500 font-mono">• {player.overallRating} OVR</span>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-[#E8A800]">{formatCurrency(player.oldSquadValue)}</p>
                      {!canAfford && <p className="text-[8px] text-red-400 font-mono">No budget</p>}
                      {canAfford && remainingRequests <= 0 && !isSelected && <p className="text-[8px] text-gray-500 font-mono">Max</p>}
                    </div>

                    {/* Notes input when selected */}
                    {isSelected && (
                      <div className="absolute left-0 right-0 bottom-[-32px] z-10">
                        <input
                          type="text"
                          value={notes[player.id] || ''}
                          onChange={(e) => {
                            e.stopPropagation()
                            setNotes({ ...notes, [player.id]: e.target.value })
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Notes (optional)..."
                          className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-[10px] font-mono"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
