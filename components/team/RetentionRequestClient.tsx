'use client'

import { useState, useEffect } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'

interface EligiblePlayer {
  id: string
  name: string
  player_id: string | null
  photoUrl: string
  oldSquadValue: number
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
  return `£${(amount).toLocaleString()}`
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
  const [sortBy, setSortBy] = useState<'name' | 'value'>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [eligiblePlayers, setEligiblePlayers] = useState(initialEligiblePlayers)
  const [existingRequests, setExistingRequests] = useState(initialRequests)
  const [totalRequestsCount, setTotalRequestsCount] = useState(initialTotalCount)
  const [approvedCount, setApprovedCount] = useState(initialApprovedCount)
  const [remainingRequests, setRemainingRequests] = useState(initialRemainingRequests)
  const [remainingApprovals, setRemainingApprovals] = useState(initialRemainingApprovals)

  const pendingRequests = existingRequests.filter(r => r.status === 'pending')
  const processedRequests = existingRequests.filter(r => r.status !== 'pending')

  // Filter and sort eligible players
  const filteredPlayers = eligiblePlayers
    .filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      } else {
        return sortOrder === 'asc'
          ? a.oldSquadValue - b.oldSquadValue
          : b.oldSquadValue - a.oldSquadValue
      }
    })

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
      setSelectedPlayers(new Set())
      setNotes({})

      // Refresh data
      const refreshResponse = await fetch(`/api/team/retention-requests?seasonId=${seasonId}`)
      const refreshData = await refreshResponse.json()
      
      setExistingRequests(refreshData.requests)
      setTotalRequestsCount(refreshData.totalRequestsCount)
      setApprovedCount(refreshData.approvedCount)
      setRemainingRequests(refreshData.remainingRequests)
      setRemainingApprovals(refreshData.remainingApprovals)

      // Refresh eligible players
      const eligibleResponse = await fetch(`/api/team/retention-requests/eligible-players?seasonId=${seasonId}`)
      const eligibleData = await eligibleResponse.json()
      setEligiblePlayers(eligibleData.eligiblePlayers)

      // Scroll to top to show success message
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                          <Image
                            src={getPlayerPhotoUrl(request.basePlayer.player_id)}
                            alt={request.playerName}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-white">{request.playerName}</p>
                          <p className="text-xs text-gray-500 font-mono">From {request.previousSeason.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#E8A800]">{formatCurrency(request.oldSquadValue)}</p>
                        <p className={`text-xs font-mono uppercase ${
                          request.status === 'approved' ? 'text-green-500' :
                          request.status === 'rejected' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          {request.status}
                        </p>
                      </div>
                    </div>
                    {request.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-400 font-mono">Reason: {request.rejectionReason}</p>
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
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-8 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)] font-mono uppercase">
              Player Retention
            </span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
            Retain players from {previousSeason.name} at their original squad value <span className="text-gray-600">•</span> {seasonName}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-400 text-sm font-mono">{success}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Current Budget</p>
            <p className="text-2xl font-black text-[#E8A800]">{formatCurrency(currentBudget)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Requests Remaining</p>
            <p className="text-2xl font-black text-white">{remainingRequests} / {maxRetentions}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Approved Retentions</p>
            <p className="text-2xl font-black text-green-500">{approvedCount}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Pending Requests</p>
            <p className="text-2xl font-black text-yellow-500">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Window Info */}
        <div className="mb-8 p-4 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[#E8A800] font-mono">{activeWindow.name}</p>
              <p className="text-xs text-gray-400 font-mono">
                {formatDate(activeWindow.startDate)} - {formatDate(activeWindow.endDate)}
              </p>
            </div>
            <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-xs font-black text-green-400 font-mono uppercase">ACTIVE</p>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        {selectedPlayers.size > 0 && (
          <div className="mb-8 p-6 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white font-mono">Selected Players ({selectedPlayers.size})</h3>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-mono uppercase">Total Cost</p>
                <p className="text-2xl font-black text-[#E8A800]">{formatCurrency(totalRetentionCost)}</p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedPlayers.size === 0}
              className="w-full py-3 bg-[#E8A800] hover:bg-[#FFD066] text-black font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider"
            >
              {isSubmitting ? 'Submitting...' : `Submit ${selectedPlayers.size} Retention Request${selectedPlayers.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Eligible Players */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white font-mono">Eligible Players from {previousSeason.name}</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
              />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy as 'name' | 'value')
                  setSortOrder(newSortOrder as 'asc' | 'desc')
                }}
                className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono cursor-pointer"
              >
                <option value="value-desc">Value (High to Low)</option>
                <option value="value-asc">Value (Low to High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-gray-400 font-mono">
                {searchQuery ? 'No players found matching your search' : 'No eligible players available for retention'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlayers.map(player => {
                const isSelected = selectedPlayers.has(player.id)
                const canAfford = currentBudget >= player.oldSquadValue

                return (
                  <div
                    key={player.id}
                    onClick={() => canAfford && togglePlayerSelection(player.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#E8A800]/20 border-[#E8A800] shadow-lg shadow-[#E8A800]/20'
                        : canAfford
                        ? 'bg-white/5 border-white/10 hover:border-[#E8A800]/50 cursor-pointer'
                        : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(player.player_id)}
                          alt={player.name}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-white mb-1">{player.name}</p>
                        <p className="text-xl font-black text-[#E8A800]">{formatCurrency(player.oldSquadValue)}</p>
                        {!canAfford && (
                          <p className="text-xs text-red-400 font-mono mt-1">Insufficient budget</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#E8A800] flex items-center justify-center">
                            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <textarea
                        value={notes[player.id] || ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          setNotes({ ...notes, [player.id]: e.target.value })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add notes (optional)..."
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono resize-none"
                        rows={2}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-white font-mono mb-4">Your Retention Requests</h2>
            
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-yellow-500 font-mono mb-3">Pending Review</h3>
                <div className="space-y-3">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="bg-white/5 border border-yellow-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                            <Image
                              src={getPlayerPhotoUrl(request.basePlayer.player_id)}
                              alt={request.playerName}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white">{request.playerName}</p>
                            <p className="text-xs text-gray-500 font-mono">From {request.previousSeason.name}</p>
                            <p className="text-xs text-gray-600 font-mono">Submitted {formatDate(request.submittedAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#E8A800]">{formatCurrency(request.oldSquadValue)}</p>
                          <p className="text-xs font-mono uppercase text-yellow-500">Pending</p>
                        </div>
                      </div>
                      {request.notes && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-400 font-mono">{request.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-400 font-mono mb-3">Processed</h3>
                <div className="space-y-3">
                  {processedRequests.map(request => (
                    <div key={request.id} className={`bg-white/5 rounded-xl p-4 border ${
                      request.status === 'approved' ? 'border-green-500/20' : 'border-red-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                            <Image
                              src={getPlayerPhotoUrl(request.basePlayer.player_id)}
                              alt={request.playerName}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white">{request.playerName}</p>
                            <p className="text-xs text-gray-500 font-mono">From {request.previousSeason.name}</p>
                            <p className="text-xs text-gray-600 font-mono">
                              Processed {request.processedAt ? formatDate(request.processedAt) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#E8A800]">{formatCurrency(request.oldSquadValue)}</p>
                          <p className={`text-xs font-mono uppercase ${
                            request.status === 'approved' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {request.status}
                          </p>
                        </div>
                      </div>
                      {request.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-xs text-red-400 font-mono">Reason: {request.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
