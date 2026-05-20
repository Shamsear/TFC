'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  overall: number
  nationality: string
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

interface Selection {
  playerId: string
  priority: number
  submitted: boolean
  player: {
    id: string
    name: string
    photoUrl: string
    position: string
    overall: number
  }
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
  seasonId: string
}

interface Season {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  logoUrl: string
  budget: number
}

interface BulkRoundSelectionClientProps {
  round: Round
  season: Season
  team: Team
  players: Player[]
  initialSelections: Selection[]
  squadSize: number
  minSquadSize: number
  maxSquadSize: number
}

export default function BulkRoundSelectionClient({
  round,
  season,
  team,
  players,
  initialSelections,
  squadSize,
  minSquadSize,
  maxSquadSize
}: BulkRoundSelectionClientProps) {
  const router = useRouter()
  const isBelowMin = squadSize < minSquadSize
  const targetSlots = isBelowMin ? Math.max(0, minSquadSize - squadSize) : Math.max(0, maxSquadSize - squadSize)

  const [selections, setSelections] = useState<string[]>(
    initialSelections.map(s => s.playerId)
  )
  const [submitted, setSubmitted] = useState(initialSelections.some(s => s.submitted))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [squadInfo, setSquadInfo] = useState<any>(null)
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const playersPerPage = 12
  const [showSelectedPlayers, setShowSelectedPlayers] = useState(false)

  // Load starred players
  useEffect(() => {
    fetch(`/api/team/starred-players?seasonId=${season.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.starredPlayerIds) {
          setStarredPlayerIds(new Set(data.starredPlayerIds))
        }
      })
      .catch(err => console.error('Error loading starred players:', err))
  }, [season.id])

  // Toggle star for a player
  const toggleStar = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (starringInProgress.has(playerId)) return
    
    setStarringInProgress(prev => new Set(prev).add(playerId))
    const isCurrentlyStarred = starredPlayerIds.has(playerId)
    
    try {
      if (isCurrentlyStarred) {
        const res = await fetch(`/api/team/starred-players?playerId=${playerId}&seasonId=${season.id}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setStarredPlayerIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(playerId)
            return newSet
          })
        }
      } else {
        const res = await fetch('/api/team/starred-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, seasonId: season.id }),
        })
        if (res.ok) {
          setStarredPlayerIds(prev => new Set(prev).add(playerId))
        }
      }
    } catch (err) {
      console.error('Error toggling star:', err)
    } finally {
      setStarringInProgress(prev => {
        const newSet = new Set(prev)
        newSet.delete(playerId)
        return newSet
      })
    }
  }

  // Fetch squad size info on mount
  useEffect(() => {
    async function fetchSquadInfo() {
      try {
        const response = await fetch(`/api/team/squad-info?season_id=${season.id}`)
        if (response.ok) {
          const data = await response.json()
          setSquadInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch squad info:', error)
      }
    }
    fetchSquadInfo()
  }, [season.id])

  // Calculate time remaining
  useEffect(() => {
    if (round.status !== 'active' || !round.endTime) return

    let isExpired = false;

    const updateTimer = () => {
      if (isExpired) return;

      const now = new Date()
      const end = new Date(round.endTime!)
      const diff = end.getTime() - now.getTime()

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`)
        } else {
          setTimeRemaining(`${seconds}s`)
        }
      } else {
        isExpired = true;
        setTimeRemaining('Processing...')
        window.location.reload()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [round.status, round.endTime])

  const handleToggleSelection = (playerId: string) => {
    setSelections(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else {
        if (prev.length >= targetSlots) {
          return prev
        }
        return [...prev, playerId]
      }
    })
  }

  const handleSaveDraft = async () => {
    setSaving(true)

    try {
      const response = await fetch(`/api/team/bulk-rounds/${round.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: selections,
          submitted: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.errors 
          ? `Validation failed:\n${error.errors.join('\n')}`
          : error.error || 'Failed to save draft'
        throw new Error(errorMessage)
      }

      alert('Draft saved successfully')
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit? You can still edit your selections before the round ends.')) {
      return
    }

    setSubmitting(true)

    try {
      if (selections.length === 0) {
        throw new Error('Please select at least one player')
      }

      const response = await fetch(`/api/team/bulk-rounds/${round.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: selections,
          submitted: true
        })
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.errors 
          ? `Validation failed:\n${error.errors.join('\n')}`
          : error.error || 'Failed to submit selections'
        throw new Error(errorMessage)
      }

      setSubmitted(true)
      alert('Selections submitted successfully!')
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlockSelections = async () => {
    if (!confirm('Are you sure you want to edit your selections? Your submission status will be changed to draft.')) {
      return
    }

    setUnlocking(true)

    try {
      const response = await fetch(`/api/team/bulk-rounds/${round.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: selections,
          submitted: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unlock selections')
      }

      setSubmitted(false)
      alert('Selections unlocked. You can now edit them.')
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUnlocking(false)
    }
  }

  const filteredPlayers = players
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPosition = positionFilter === 'all' || p.position === positionFilter
      return matchesSearch && matchesPosition
    })
    .sort((a, b) => {
      // Sort: starred players first, then by overall rating
      const aStarred = starredPlayerIds.has(a.id)
      const bStarred = starredPlayerIds.has(b.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return b.overall - a.overall
    })

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, positionFilter])

  const positions = Array.from(new Set(players.map(p => p.position))).sort()

  // Pagination Component
  const PaginationControls = () => {
    // Show limited page numbers on mobile
    const getPageNumbers = () => {
      const pages = []
      const maxVisible = 5
      
      if (totalPages <= maxVisible) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show first, last, current, and nearby pages
        if (currentPage <= 3) {
          // Near start
          for (let i = 1; i <= 4; i++) pages.push(i)
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          // Near end
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
        } else {
          // Middle
          pages.push(1)
          pages.push('...')
          pages.push(currentPage - 1)
          pages.push(currentPage)
          pages.push(currentPage + 1)
          pages.push('...')
          pages.push(totalPages)
        }
      }
      return pages
    }

    return (
      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-[#D4CCBB] text-center sm:text-left">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} of {filteredPlayers.length}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ← Prev
            </button>
            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-[#7A7367]">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-sm min-w-[40px] ${
                    currentPage === page
                      ? 'bg-[#E8A800] text-black'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Round {round.roundNumber} - Bulk Selection
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {season.name} {round.position && `— ${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}`}
              </p>
            </div>
            {timeRemaining && (
              <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 mb-1">Time Remaining</div>
                <div className="text-lg font-bold text-emerald-300">{timeRemaining}</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Current Squad</div>
              <div className="text-xl font-bold text-white">
                {squadSize} <span className="text-xs text-[#7A7367] font-normal">({minSquadSize} min / {maxSquadSize} max)</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Selected</div>
              <div className="text-xl font-bold text-white">
                {selections.length} / {targetSlots}
                <span className="text-xs text-[#7A7367] font-normal"> ({isBelowMin ? 'needed' : 'max'})</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Price Each</div>
              <div className="text-xl font-bold text-white">£{round.basePrice?.toLocaleString() || 0}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Status</div>
              <div className={`text-xl font-bold ${submitted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {submitted ? 'Submitted' : 'Draft'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Selected Players Section */}
        {selections.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowSelectedPlayers(!showSelectedPlayers)}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">Your Selections ({selections.length})</h3>
                  <p className="text-xs text-[#D4CCBB]">
                    {selections.length} / {targetSlots} {isBelowMin ? 'needed' : 'max allowed'}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-[#D4CCBB] transition-transform ${showSelectedPlayers ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSelectedPlayers && (
              <div className="mt-4 space-y-3">
                {selections.map((playerId) => {
                  const player = players.find(p => p.id === playerId)
                  if (!player) return null

                  return (
                    <div
                      key={playerId}
                      className="rounded-lg bg-white/5 border border-white/10 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <Image
                            src={player.photoUrl}
                            alt={player.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{player.name}</h4>
                          <p className="text-xs text-[#D4CCBB]">
                            {player.position} • OVR {player.overall}
                          </p>
                        </div>
                        <div className="text-right mr-2">
                          <div className="text-sm font-bold text-white">£{round.basePrice?.toLocaleString() || 0}</div>
                          <div className="text-xs text-[#7A7367]">Base Price</div>
                        </div>
                        {!submitted && (
                          <button
                            onClick={() => handleToggleSelection(playerId)}
                            className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
                            title="Remove selection"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Squad Status Warning/Info */}
        {squadInfo && (() => {
          const isMinEqualsMax = squadInfo.minSquadSize === squadInfo.maxSquadSize;
          const isBelowMin = squadInfo.currentSquadSize < squadInfo.minSquadSize;

          return (
            <div className={`mb-6 rounded-xl border p-6 ${
              isBelowMin
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isBelowMin
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-2 ${
                    isBelowMin ? 'text-amber-300' : 'text-blue-300'
                  }`}>
                    Squad Size Status
                  </h3>
                  <div className="space-y-2 text-sm text-white/80">
                    {isMinEqualsMax ? (
                      <>
                        <p>
                          <strong>Current Squad:</strong> {squadInfo.currentSquadSize} / {squadInfo.minSquadSize} (required)
                        </p>
                        {isBelowMin ? (
                          <>
                            <p className="text-amber-300 font-medium">
                              ⚠️ You must select exactly <strong>{squadInfo.slotsToMin} player{squadInfo.slotsToMin !== 1 ? 's' : ''}</strong> to reach the required squad size.
                            </p>
                            <p className="text-white/60 text-xs">
                              Teams must have exactly {squadInfo.minSquadSize} players in their squad.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-blue-300 font-medium">
                              ✅ Required squad size reached! You have {squadInfo.currentSquadSize} players in your squad.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Current Squad:</strong> {squadInfo.currentSquadSize} / {squadInfo.minSquadSize} (min) - {squadInfo.maxSquadSize} (max)
                        </p>
                        {isBelowMin ? (
                          <>
                            <p className="text-amber-300 font-medium">
                              ⚠️ You must select exactly <strong>{squadInfo.slotsToMin} player{squadInfo.slotsToMin !== 1 ? 's' : ''}</strong> to reach the minimum squad size.
                            </p>
                            <p className="text-white/60 text-xs">
                              Teams must reach the minimum squad size ({squadInfo.minSquadSize} players) before they can optionally acquire up to {squadInfo.maxSquadSize} players.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-blue-300 font-medium">
                              ✅ Minimum squad size reached! You can select 0-{squadInfo.slotsToMax} more player{squadInfo.slotsToMax !== 1 ? 's' : ''} (optional).
                            </p>
                            <p className="text-white/60 text-xs">
                              You've reached the minimum squad size. Additional players are optional up to the maximum of {squadInfo.maxSquadSize} players.
                            </p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800]"
          />
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
          >
            <option value="all">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        {/* Pagination - Top */}
        {filteredPlayers.length > playersPerPage && <PaginationControls />}

        {/* Actions - Top */}
        {round.status === 'active' && (
          <div className="flex gap-4 my-6">
            {!submitted ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selections.length === 0}
                  className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Selections'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUnlockSelections}
                disabled={unlocking}
                className="flex-1 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 font-medium"
              >
                {unlocking ? 'Unlocking...' : 'Edit Selections'}
              </button>
            )}
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {paginatedPlayers.map(player => {
            const isSelected = selections.includes(player.id)
            const limitReached = !isSelected && selections.length >= targetSlots

            return (
              <div
                key={player.id}
                className={`rounded-xl border p-4 transition-all relative ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Star Button */}
                <button
                  onClick={(e) => toggleStar(player.id, e)}
                  disabled={starringInProgress.has(player.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-all disabled:opacity-50"
                  title={starredPlayerIds.has(player.id) ? 'Unstar player' : 'Star player'}
                >
                  {starredPlayerIds.has(player.id) ? (
                    <svg className="w-4 h-4 text-[#E8A800] fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{player.name}</h3>
                    <p className="text-xs text-[#D4CCBB]">
                      {player.position} • OVR {player.overall}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {!limitReached && !submitted && (
                  <button
                    onClick={() => handleToggleSelection(player.id)}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isSelected ? 'Remove' : 'Select'}
                  </button>
                )}
                {limitReached && !submitted && (
                  <div className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#7A7367] text-center text-sm">
                    Selection limit reached
                  </div>
                )}
                {submitted && (
                  <div className="w-full px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center text-sm font-medium">
                    {isSelected ? '✓ Selected' : 'Not Selected'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination - Bottom */}
        {filteredPlayers.length > playersPerPage && (
          <div className="mb-6">
            <PaginationControls />
          </div>
        )}

        {/* Actions */}
        {round.status === 'active' && (
          <div className="flex gap-4">
            {!submitted ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selections.length === 0}
                  className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Selections'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUnlockSelections}
                disabled={unlocking}
                className="flex-1 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 font-medium"
              >
                {unlocking ? 'Unlocking...' : 'Edit Selections'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
