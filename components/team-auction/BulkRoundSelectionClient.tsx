'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeForSearch } from '@/lib/search-utils'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  playing_style: string | null
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
  const [playingStyleFilter, setPlayingStyleFilter] = useState<string>('all')
  const [showStarredOnly, setShowStarredOnly] = useState(false)

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    isError?: boolean
    onConfirm?: () => void
    confirmText?: string
    cancelText?: string
  }>({ isOpen: false, title: '', message: '' })

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }))

  // Load starred players
  useEffect(() => {
    // Clear starred players immediately to prevent showing stale data
    setStarredPlayerIds(new Set())
    
    const timestamp = Date.now()
    fetch(`/api/team/starred-players?seasonId=${season.id}&t=${timestamp}&teamId=${team.id}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        // Verify the data is for the correct team
        if (data.teamId !== team.id) {
          console.error('[BulkRound] ERROR: Received starred players for wrong team!', data.teamId, 'vs', team.id)
          setStarredPlayerIds(new Set())
          return
        }
        
        if (data.starredPlayerIds) {
          setStarredPlayerIds(new Set(data.starredPlayerIds))
        }
      })
      .catch(err => {
        console.error('Error loading starred players:', err)
        setStarredPlayerIds(new Set())
      })
  }, [season.id, team.id])

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
        // Add timestamp to prevent caching
        const response = await fetch(`/api/team/squad-info?season_id=${season.id}&t=${Date.now()}`, {
          cache: 'no-store'
        })
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

      setModalConfig({
        isOpen: true,
        title: 'Draft Saved',
        message: 'Your draft has been saved successfully.'
      })
      router.refresh()
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: error.message,
        isError: true
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = () => {
    if (isBelowMin && selections.length < targetSlots) {
      setModalConfig({
        isOpen: true,
        title: 'Validation Error',
        message: `You must select exactly ${targetSlots} players to reach your minimum squad size.`,
        isError: true
      })
      return
    }

    if (!isBelowMin && selections.length === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please select at least one player to submit.',
        isError: true
      })
      return
    }

    setModalConfig({
      isOpen: true,
      title: 'Confirm Submission',
      message: 'Are you sure you want to submit? You can still edit your selections before the round ends.',
      onConfirm: performSubmit,
      confirmText: 'Submit',
      cancelText: 'Cancel'
    })
  }

  const performSubmit = async () => {
    setSubmitting(true)

    try {
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
      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: 'Selections submitted successfully!'
      })
      router.refresh()
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: error.message,
        isError: true
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlockSelections = () => {
    setModalConfig({
      isOpen: true,
      title: 'Edit Selections',
      message: 'Are you sure you want to edit your selections? Your submission status will be changed to draft.',
      onConfirm: performUnlock,
      confirmText: 'Unlock',
      cancelText: 'Cancel'
    })
  }

  const performUnlock = async () => {
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
      setModalConfig({
        isOpen: true,
        title: 'Unlocked',
        message: 'Selections unlocked. You can now edit them.'
      })
      router.refresh()
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: error.message,
        isError: true
      })
    } finally {
      setUnlocking(false)
    }
  }

  const filteredPlayers = players
    .filter(p => {
      const matchesSearch = normalizeForSearch(p.name).includes(normalizeForSearch(searchQuery))
      const matchesPosition = positionFilter === 'all' || p.position === positionFilter
      const matchesStyle = playingStyleFilter === 'all' || p.playing_style === playingStyleFilter
      const matchesStarred = !showStarredOnly || starredPlayerIds.has(p.id)
      return matchesSearch && matchesPosition && matchesStyle && matchesStarred
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
  }, [searchQuery, positionFilter, playingStyleFilter, showStarredOnly])

  const positions = Array.from(new Set(players.map(p => p.position))).sort()
  const playingStyles = Array.from(new Set(players.map(p => p.playing_style).filter(Boolean))) as string[]

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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 overflow-x-hidden relative">
      {/* Background spotlights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-[#E8A800]/[0.02] rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[700px] h-[700px] bg-cyan-500/[0.02] rounded-full blur-[180px] pointer-events-none z-0" />

      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md mb-6 relative z-10 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1 truncate bg-gradient-to-r from-white via-[#E8A800] to-emerald-400 bg-clip-text text-transparent">
                Round {round.roundNumber} - Bulk Selection
              </h1>
              <p className="text-sm text-[#D4CCBB] font-medium">
                {season.name} {round.position && (
                  <>
                    {' — '}
                    <span className="truncate max-w-[200px] sm:max-w-none inline-block align-bottom px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
                      {round.position}{round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}
                    </span>
                  </>
                )}
              </p>
            </div>
            {timeRemaining && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-glow flex-shrink-0 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider mb-0.5">Remaining</div>
                  <div className="text-base font-extrabold text-emerald-400 tracking-wider font-mono">{timeRemaining}</div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-3 sm:p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-xs text-[#7A7367] mb-1 font-semibold tracking-wide uppercase transition-colors group-hover:text-[#D4CCBB]">Current Squad</div>
              <div className="text-lg sm:text-xl font-black text-white">
                {squadSize} <span className="text-xs text-[#7A7367] font-semibold">
                  {minSquadSize === maxSquadSize ? `(${minSquadSize} req)` : `(${minSquadSize}–${maxSquadSize})`}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-3 sm:p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-xs text-[#7A7367] mb-1 font-semibold tracking-wide uppercase transition-colors group-hover:text-[#D4CCBB]">Selected</div>
              <div className="text-lg sm:text-xl font-black text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.2)]">
                {selections.length} <span className="text-white/40">/</span> {targetSlots}
                <span className="text-xs text-[#7A7367] font-semibold"> ({isBelowMin ? 'needed' : 'max'})</span>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-3 sm:p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-xs text-[#7A7367] mb-1 font-semibold tracking-wide uppercase transition-colors group-hover:text-[#D4CCBB]">Price Each</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]">£{round.basePrice?.toLocaleString() || 0}</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-3 sm:p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-xs text-[#7A7367] mb-1 font-semibold tracking-wide uppercase transition-colors group-hover:text-[#D4CCBB]">Status</div>
              <div className={`text-lg sm:text-xl font-black flex items-center gap-1.5 ${submitted ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]' : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${submitted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                {submitted ? 'Submitted' : 'Draft'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Selected Players Section */}
        {selections.length > 0 && (
          <div className="mb-6 relative z-10">
            <button
              onClick={() => setShowSelectedPlayers(!showSelectedPlayers)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#E8A800]/30 transition-all backdrop-blur-md shadow-lg shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/30 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white tracking-wide">Your Selections ({selections.length})</h3>
                  <p className="text-xs text-[#D4CCBB] font-medium">
                    {selections.length} <span className="text-[#E8A800]">/</span> {targetSlots} {isBelowMin ? 'needed' : 'max allowed'}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-[#D4CCBB] transition-transform duration-300 ${showSelectedPlayers ? 'rotate-180 text-[#E8A800]' : ''}`} 
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

                  // GK: gold, DEF: blue, MID: emerald, FWD: red
                  let posBadgeColor = 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                  if (player.position.includes('GK')) {
                    posBadgeColor = 'border-[#E8A800]/30 text-[#E8A800] bg-[#E8A800]/10'
                  } else if (player.position.includes('DF') || player.position.includes('DEF')) {
                    posBadgeColor = 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                  } else if (player.position.includes('MD') || player.position.includes('MID')) {
                    posBadgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  } else if (player.position.includes('FW') || player.position.includes('FWD') || player.position.includes('ST')) {
                    posBadgeColor = 'border-red-500/30 text-red-400 bg-red-500/10'
                  }

                  return (
                    <div
                      key={playerId}
                      className="rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 p-4 transition-all duration-200 backdrop-blur-md flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 relative group">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm tracking-wide">{player.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${posBadgeColor}`}>
                              {player.position}
                            </span>
                            <span className="text-xs text-[#D4CCBB] font-semibold">
                              OVR {player.overall}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">£{round.basePrice?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-[#7A7367] font-semibold uppercase tracking-wider">Base Price</div>
                        </div>
                        {!submitted && (
                          <button
                            onClick={() => handleToggleSelection(playerId)}
                            className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
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
            <div className={`mb-6 rounded-2xl border p-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 z-10 ${
              isBelowMin
                ? 'bg-amber-500/5 border-amber-500/20 shadow-lg shadow-amber-950/10'
                : 'bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-950/10'
            }`}>
              {/* Radial glow background */}
              <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none -mr-16 -mt-16 ${
                isBelowMin ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`} />

              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isBelowMin
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-extrabold mb-1 tracking-wide uppercase ${
                    isBelowMin ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    Squad Size Status
                  </h3>
                  <div className="space-y-2 text-sm text-[#D4CCBB]">
                    {isMinEqualsMax ? (
                      <>
                        <p className="font-medium text-white">
                          Current Squad: <span className="font-extrabold text-[#E8A800]">{squadInfo.currentSquadSize}</span> <span className="text-[#7A7367]">/</span> <span className="font-bold text-white/90">{squadInfo.minSquadSize} (required)</span>
                        </p>
                        {isBelowMin ? (
                          <>
                            <p className="text-amber-300 font-semibold flex items-center gap-1">
                              ⚠️ You must select exactly <strong>{squadInfo.slotsToMin} player{squadInfo.slotsToMin !== 1 ? 's' : ''}</strong> to reach the required squad size.
                            </p>
                            <p className="text-[#7A7367] text-xs font-medium">
                              Teams must have exactly {squadInfo.minSquadSize} players in their squad.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                              ✓ Required squad size reached! You have {squadInfo.currentSquadSize} players in your squad.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-white">
                          Current Squad: <span className="font-extrabold text-[#E8A800]">{squadInfo.currentSquadSize}</span> <span className="text-[#7A7367]">/</span> <span className="font-bold text-white/90">{squadInfo.minSquadSize} (min) – {squadInfo.maxSquadSize} (max)</span>
                        </p>
                        {isBelowMin ? (
                          <>
                            <p className="text-amber-300 font-semibold flex items-center gap-1.5">
                              ⚠️ You must select exactly <strong>{squadInfo.slotsToMin} player{squadInfo.slotsToMin !== 1 ? 's' : ''}</strong> to reach the minimum squad size.
                            </p>
                            <p className="text-[#7A7367] text-xs font-medium">
                              Teams must reach the minimum squad size ({squadInfo.minSquadSize} players) before they can optionally acquire up to {squadInfo.maxSquadSize} players.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                              ✓ Minimum squad size reached! You can select 0–{squadInfo.slotsToMax} more player{squadInfo.slotsToMax !== 1 ? 's' : ''} (optional).
                            </p>
                            <p className="text-[#7A7367] text-xs font-medium">
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

        {/* Search & Filters */}
        <div className="mb-6 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 relative">
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800] focus:shadow-[0_0_12px_rgba(232,168,0,0.15)] transition-all duration-300 font-medium"
            />
            <svg className="w-5 h-5 absolute left-4 top-3.5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Position Tabs */}
        <div className="mb-5 relative z-10">
          <div className="text-[10px] text-[#7A7367] mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Filter by Position
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setPositionFilter('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 shadow-sm ${
                positionFilter === 'all'
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFC533] text-black hover:shadow-[#E8A800]/25'
                  : 'bg-white/[0.02] border border-white/5 text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              All Positions
            </button>
            {positions.map(pos => {
              const count = players.filter(p => p.position === pos).length
              return (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 shadow-sm ${
                    positionFilter === pos
                      ? 'bg-gradient-to-r from-[#E8A800] to-[#FFC533] text-black hover:shadow-[#E8A800]/25'
                      : 'bg-white/[0.02] border border-white/5 text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {pos} <span className={`text-[10px] font-bold ${positionFilter === pos ? 'text-black/60' : 'text-[#7A7367]'}`}>({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Playing Style Tabs */}
        {playingStyles.length > 0 && (
          <div className="mb-5 relative z-10">
            <div className="text-[10px] text-[#7A7367] mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Filter by Playing Style
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setPlayingStyleFilter('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 shadow-sm ${
                  playingStyleFilter === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:shadow-purple-500/25'
                    : 'bg-white/[0.02] border border-white/5 text-white hover:bg-white/10 hover:border-white/20'
                }`}
              >
                All Styles
              </button>
              {playingStyles.sort().map(style => {
                const count = players.filter(p =>
                  (positionFilter === 'all' || p.position === positionFilter) && p.playing_style === style
                ).length
                return (
                  <button
                    key={style}
                    onClick={() => setPlayingStyleFilter(style)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 shadow-sm ${
                      playingStyleFilter === style
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:shadow-purple-500/25'
                        : 'bg-white/[0.02] border border-white/5 text-white hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {style} <span className={`text-[10px] font-bold ${playingStyleFilter === style ? 'text-white/60' : 'text-[#7A7367]'}`}>({count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Starred Players Filter */}
        <div className="mb-6 relative z-10">
          <label className="flex items-center gap-3 cursor-pointer w-fit group">
            <div className="relative">
              <input
                type="checkbox"
                checked={showStarredOnly}
                onChange={(e) => setShowStarredOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors duration-300 ${showStarredOnly ? 'bg-amber-500/25 border border-amber-500/40' : 'bg-white/5 border border-white/10'}`} />
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-300 flex items-center justify-center ${showStarredOnly ? 'transform translate-x-4 bg-[#E8A800]' : 'bg-gray-500'}`}>
                {showStarredOnly && (
                  <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-[#D4CCBB] group-hover:text-white transition-colors flex items-center gap-1.5">
              Show only starred players
            </span>
          </label>
        </div>

        {/* Pagination - Top */}
        {filteredPlayers.length > playersPerPage && <div className="relative z-10"><PaginationControls /></div>}

        {/* Actions - Top */}
        {round.status === 'active' && (
          <div className="flex gap-4 my-6 relative z-10">
            {!submitted ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-50 font-extrabold uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-black/20"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selections.length === 0}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold uppercase tracking-wider text-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Selections'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUnlockSelections}
                disabled={unlocking}
                className="flex-1 px-6 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 font-extrabold uppercase tracking-wider text-xs cursor-pointer shadow-lg"
              >
                {unlocking ? 'Unlocking...' : 'Edit Selections'}
              </button>
            )}
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6 relative z-10">
          {paginatedPlayers.map(player => {
            const isSelected = selections.includes(player.id)
            const limitReached = !isSelected && selections.length >= targetSlots

            // Position specific colors
            let posBadgeColor = 'border-amber-500/30 text-amber-400 bg-amber-500/5'
            if (player.position.includes('GK')) {
              posBadgeColor = 'border-[#E8A800]/30 text-[#E8A800] bg-[#E8A800]/5'
            } else if (player.position.includes('DF') || player.position.includes('DEF')) {
              posBadgeColor = 'border-blue-500/30 text-blue-400 bg-blue-500/5'
            } else if (player.position.includes('MD') || player.position.includes('MID')) {
              posBadgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
            } else if (player.position.includes('FW') || player.position.includes('FWD') || player.position.includes('ST')) {
              posBadgeColor = 'border-red-500/30 text-red-400 bg-red-500/5'
            }

            return (
              <div
                key={player.id}
                className={`rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden group backdrop-blur-md shadow-lg ${
                  isSelected
                    ? 'bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-950/10'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-black/30 hover:-translate-y-0.5'
                }`}
              >
                {/* Radial glow background on selection */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-[50px] pointer-events-none -mr-10 -mt-10" />
                )}

                {/* Star Button */}
                <button
                  onClick={(e) => toggleStar(player.id, e)}
                  disabled={starringInProgress.has(player.id)}
                  className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/40 hover:bg-black/70 border border-white/5 active:scale-90 transition-all cursor-pointer"
                  title={starredPlayerIds.has(player.id) ? 'Unstar player' : 'Star player'}
                >
                  {starredPlayerIds.has(player.id) ? (
                    <svg className="w-4 h-4 text-[#E8A800] fill-current drop-shadow-[0_0_6px_rgba(232,168,0,0.5)]" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </button>

                <div className="flex items-center gap-3.5 mb-4 relative z-10">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 relative flex-shrink-0">
                    {/* Glowing highlight in background */}
                    <div className={`absolute inset-0 bg-gradient-to-tr transition-opacity duration-300 opacity-20 group-hover:opacity-40 ${
                      isSelected ? 'from-emerald-500 to-transparent' : 'from-[#E8A800] to-transparent'
                    }`} />
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm leading-snug truncate group-hover:text-[#E8A800] transition-colors">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${posBadgeColor}`}>
                        {player.position}
                      </span>
                      {player.playing_style && (
                        <span className="px-2 py-0.5 rounded border border-purple-500/20 text-purple-400 bg-purple-500/5 text-[10px] font-extrabold uppercase tracking-wide">
                          {player.playing_style}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Hexagonal overall rating shield */}
                  <div className="w-11 h-11 relative flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-[#E8A800]/10 border border-[#E8A800]/30 rounded-xl rotate-45 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="relative font-black text-sm text-[#E8A800] font-mono drop-shadow-[0_0_4px_rgba(232,168,0,0.4)]">{player.overall}</span>
                  </div>
                </div>

                <div className="relative z-10">
                  {!limitReached && !submitted && (
                    <button
                      onClick={() => handleToggleSelection(player.id)}
                      className={`w-full px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {isSelected ? 'Remove Selection' : 'Select Player'}
                    </button>
                  )}
                  {limitReached && !submitted && (
                    <div className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[#7A7367] text-center text-xs font-bold uppercase tracking-wider">
                      Selection Limit Reached
                    </div>
                  )}
                  {submitted && (
                    <div className={`w-full px-4 py-2.5 rounded-xl border text-center text-xs font-extrabold uppercase tracking-wider ${
                      isSelected 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/[0.01] border-white/5 text-[#7A7367]'
                    }`}>
                      {isSelected ? '✓ Selected' : 'Not Selected'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination - Bottom */}
        {filteredPlayers.length > playersPerPage && (
          <div className="mb-6 relative z-10">
            <PaginationControls />
          </div>
        )}

        {/* Actions */}
        {round.status === 'active' && (
          <div className="flex gap-4 relative z-10">
            {!submitted ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-50 font-extrabold uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-black/20"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selections.length === 0}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold uppercase tracking-wider text-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Selections'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUnlockSelections}
                disabled={unlocking}
                className="flex-1 px-6 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 font-extrabold uppercase tracking-wider text-xs cursor-pointer shadow-lg"
              >
                {unlocking ? 'Unlocking...' : 'Edit Selections'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300 animate-fadeIn">
          <div className="bg-[#0f0f0f]/90 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Spotlights inside modal */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#E8A800]/5 blur-[35px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[35px] pointer-events-none" />

            <h3 className={`text-lg font-extrabold mb-3 tracking-wide uppercase relative z-10 ${modalConfig.isError ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'text-white'}`}>
              {modalConfig.title}
            </h3>
            <p className="text-[#D4CCBB] text-sm font-semibold mb-6 whitespace-pre-wrap leading-relaxed relative z-10">{modalConfig.message}</p>
            <div className="flex justify-end gap-3 relative z-10">
              {modalConfig.onConfirm ? (
                <>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {modalConfig.cancelText || 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      closeModal()
                      modalConfig.onConfirm!()
                    }}
                    className={`px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer active:scale-95 ${
                      modalConfig.isError 
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30' 
                        : 'bg-gradient-to-r from-[#E8A800] to-[#FFC533] text-black hover:shadow-lg hover:shadow-[#E8A800]/20'
                    }`}
                  >
                    {modalConfig.confirmText || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFC533] text-black hover:shadow-lg hover:shadow-[#E8A800]/20 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
