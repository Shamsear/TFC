'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Round {
  id: string
  roundNumber: number
  roundType: string
  position: string | null
  status: string
  durationSeconds: number
  startTime: Date | null
  endTime: Date | null
  maxBidsPerTeam: number | null
  basePrice: number | null
  finalizationMode: string
  season: {
    id: string
    name: string
    seasonNumber: number
  }
  teamRoundBids: any[]
  tiebreakers: any[]
  _count: {
    teamRoundBids: number
    tiebreakers: number
  }
}

interface Team {
  id: string
  name: string
  logoUrl: string | null
}

interface AuctionResult {
  id: string
  soldPrice: number
  basePlayer: {
    id: string
    name: string
    photoUrl: string
    seasonalPlayerStats: Array<{
      position: string
      overallRating: number
      nationality: string | null
    }>
  }
  team: {
    id: string
    name: string
    logoUrl: string | null
  }
}

interface BulkConflict {
  tiebreakerId: number
  basePlayerId: string
  playerName: string
  photoUrl: string
  position: string
  overallRating: number
  basePrice: number
  status: string
  teams: Array<{
    id: string
    name: string
    logoUrl: string
    participantStatus: string
  }>
  createdAt: Date
}

interface RoundDetailClientProps {
  round: Round
  teams: Team[]
  auctionResults: AuctionResult[] | null
  previewAllocations?: any[] // Preview allocations from finalization state
  bulkConflicts?: BulkConflict[] | null
}

export default function RoundDetailClient({ round, teams, auctionResults, previewAllocations, bulkConflicts }: RoundDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendHours, setExtendHours] = useState(0)
  const [extendMinutes, setExtendMinutes] = useState(30)
  const [extending, setExtending] = useState(false)
  const [previewResults, setPreviewResults] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [editForm, setEditForm] = useState({
    maxBidsPerTeam: round.maxBidsPerTeam || 0,
    basePrice: round.basePrice || 0,
    finalizationMode: round.finalizationMode
  })

  // Live polling - refresh data every 3 seconds for active/pending rounds
  useEffect(() => {
    // Only poll for rounds that are active or have pending actions
    const shouldPoll = isPolling && (
      round.status === 'active' || 
      round.status === 'pending_finalization' ||
      round.status === 'tiebreaker_pending' ||
      round.status === 'finalizing'
    )

    if (!shouldPoll) return

    const fetchLiveData = async () => {
      try {
        router.refresh()
      } catch (error) {
        console.error('Failed to refresh data:', error)
      }
    }

    // Poll every 3 seconds for real-time updates
    const interval = setInterval(fetchLiveData, 3000)
    return () => clearInterval(interval)
  }, [isPolling, round.status, router])

  // Calculate time remaining for active rounds
  useEffect(() => {
    if (round.status === 'active' && round.endTime) {
      const calculateTimeRemaining = () => {
        const now = Date.now()
        const end = new Date(round.endTime!).getTime()
        const remaining = Math.max(0, end - now)
        setTimeRemaining(remaining)
        
        // Auto-refresh when timer expires
        if (remaining === 0) {
          router.refresh()
        }
      }

      // Calculate immediately
      calculateTimeRemaining()

      // Update every second
      const interval = setInterval(calculateTimeRemaining, 1000)

      return () => clearInterval(interval)
    }
  }, [round.status, round.endTime, router])

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleStartRound = async () => {
    if (!confirm('Are you sure you want to start this round? Teams will be able to place bids.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/start`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start round')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeRound = async () => {
    if (!confirm('Are you sure you want to finalize this round? This will process all bids and cannot be undone.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to finalize round')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStopRound = async () => {
    if (!confirm('Are you sure you want to stop this round early? This will end the round immediately and allow finalization.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to stop round')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewResults = async () => {
    if (!confirm('Start preview finalization? This will create real tiebreakers that teams must resolve, but results will stay hidden until you make them public.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preview: true, force: true })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start preview finalization')
      }

      const data = await response.json()
      
      if (data.tieDetected) {
        alert(`Tiebreakers created! Teams must submit bids before you can see final results.\n\nTiebreakers: ${data.tiebreakers?.length || 0}`)
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeFromPreview = async () => {
    if (!confirm('Apply results and make them public? This will finalize the round and teams will see the allocations.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to finalize round')
      }

      setShowPreviewModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMakePublic = async () => {
    if (!confirm('Make results public? Teams will be able to see the final allocations.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/make-public`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to make results public')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/export`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export results')
      }

      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Round_${round.roundNumber}_Results.xlsx`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleExtendTime = async () => {
    if (extendHours === 0 && extendMinutes === 0) {
      setError('Please add at least 1 minute')
      return
    }

    setExtending(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hours: extendHours,
          minutes: extendMinutes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to extend round time')
      }

      setShowExtendModal(false)
      setExtendHours(0)
      setExtendMinutes(30)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExtending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
      case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  const submittedBids = round.teamRoundBids.filter((bid: any) => bid.submitted).length
  const totalTeams = teams.length

  // Format duration in hours and minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  // Format date and time
  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Not started'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/sub-admin/${round.season.id}/auction`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Rounds
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Round {round.roundNumber}
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {round.season.name} • {round.position || 'All Positions'} • {round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            {isPolling && (round.status === 'active' || round.status === 'pending_finalization' || round.status === 'tiebreaker_pending' || round.status === 'finalizing') && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-300">Live</span>
              </div>
            )}
            <button
              onClick={() => setIsPolling(!isPolling)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium text-[#D4CCBB]"
              title={isPolling ? 'Pause live updates' : 'Resume live updates'}
            >
              {isPolling ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            <div className={`px-4 py-2 rounded-lg border font-bold text-sm ${getStatusColor(round.status)}`}>
              {round.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Live Timer for Active Rounds */}
        {round.status === 'active' && timeRemaining !== null && (
          <div className="mt-4 rounded-xl bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 border-2 border-[#E8A800]/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E8A800] flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-[#D4CCBB] mb-1">Time Remaining</div>
                  <div className={`text-2xl sm:text-3xl font-black ${timeRemaining < 3600000 ? 'text-red-400' : 'text-[#FFB347]'}`}>
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowExtendModal(true)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#E8A800]/50 text-white font-bold text-sm transition-all"
                >
                  + Add Time
                </button>
                <div className="text-right">
                  <div className="text-xs text-[#D4CCBB] mb-1">Ends At</div>
                  <div className="text-sm font-bold text-white">
                    {formatDateTime(round.endTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Bids Submitted</div>
          <div className="text-3xl font-black text-white">{submittedBids}/{totalTeams}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Tiebreakers</div>
          <div className="text-3xl font-black text-[#FFB347]">{round._count.tiebreakers}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Duration</div>
          <div className="text-3xl font-black text-[#E8A800]">{formatDuration(round.durationSeconds)}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Base Price</div>
          <div className="text-3xl font-black text-emerald-400">
            ${(round.basePrice || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </div>
        </div>
      </div>

      {/* Edit Round Settings */}
      {(round.status === 'draft' || round.status === 'active') && (
        <div className="mb-8">
          <button
            onClick={() => setShowEditSettings(!showEditSettings)}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white">Edit Round Settings</h3>
                <p className="text-xs text-[#D4CCBB]">
                  Modify bids limit, base price, and finalization mode
                </p>
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-[#D4CCBB] transition-transform ${showEditSettings ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showEditSettings && (
            <div className="mt-4 rounded-lg bg-white/5 border border-white/10 p-6">
              <form onSubmit={async (e) => {
                e.preventDefault()
                
                if (!confirm('Are you sure you want to update these settings?')) {
                  return
                }

                setEditingSettings(true)
                setError('')

                try {
                  const response = await fetch(`/api/admin/rounds/${round.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editForm)
                  })

                  if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to update settings')
                  }

                  setShowEditSettings(false)
                  router.refresh()
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setEditingSettings(false)
                }
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                      Max Bids Per Team
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.maxBidsPerTeam}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        maxBidsPerTeam: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      0 = unlimited bids
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                      Base Price (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.basePrice}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        basePrice: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                      Finalization Mode
                    </label>
                    <select
                      value={editForm.finalizationMode}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        finalizationMode: e.target.value
                      }))}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
                    >
                      <option value="auto">Auto (Immediate)</option>
                      <option value="manual">Manual (Preview First)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {editForm.finalizationMode === 'auto' 
                        ? 'Results finalize automatically when timer ends'
                        : 'Preview results before making them public'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSettings(false)
                      setEditForm({
                        maxBidsPerTeam: round.maxBidsPerTeam || 0,
                        basePrice: round.basePrice || 0,
                        finalizationMode: round.finalizationMode
                      })
                    }}
                    disabled={editingSettings}
                    className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingSettings}
                    className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
                  >
                    {editingSettings ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Finalization Mode Info */}
      {round.finalizationMode === 'manual' && ['draft', 'active'].includes(round.status) && (
        <div className="rounded-xl bg-blue-500/10 border-2 border-blue-500/30 p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-blue-300">Manual Preview Mode</h3>
              <p className="text-sm text-blue-200">
                When the timer ends, you'll be able to preview results before making them public
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline - Show when round is active or completed */}
      {(round.status === 'active' || round.status === 'completed') && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-black text-white mb-4">Round Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-2">Start Time</div>
              <div className="text-lg font-bold text-emerald-400">{formatDateTime(round.startTime)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-2">End Time</div>
              <div className="text-lg font-bold text-[#FFB347]">{formatDateTime(round.endTime)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
        <h2 className="text-xl font-black text-white mb-4">Round Actions</h2>
        <div className="flex flex-wrap gap-4">
          {round.status === 'draft' && (
            <button
              onClick={handleStartRound}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Round'}
            </button>
          )}
          {round.status === 'active' && (
            <>
              <button
                onClick={handlePreviewResults}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Preview Finalization'}
              </button>
              <button
                onClick={handleStopRound}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Stopping...' : 'Stop & Finalize Now'}
              </button>
            </>
          )}
          {(round.status === 'expired_pending_finalization' || round.status === 'pending_finalization') && (
            <>
              {round.finalizationMode === 'manual' ? (
                <button
                  onClick={handlePreviewResults}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Preview Results'}
                </button>
              ) : (
                <button
                  onClick={handleFinalizeRound}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Finalizing...' : 'Finalize Round'}
                </button>
              )}
            </>
          )}
          {round.status === 'tiebreaker_pending' && (
            <div className="text-purple-400 font-bold">
              ⏳ Waiting for tiebreaker resolution...
            </div>
          )}
          {round.status === 'preview_finalized' && (
            <>
              <div className="flex-1 text-blue-400 font-bold">
                👁️ Preview Mode - Results hidden from teams
              </div>
              <button
                onClick={handleExportToExcel}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-500/50 text-white font-bold transition-all"
              >
                📊 Export to Excel
              </button>
              <button
                onClick={handleMakePublic}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Make Results Public'}
              </button>
            </>
          )}
          {round.status === 'completed' && (
            <>
              <div className="flex-1 text-emerald-400 font-bold">
                ✓ Round completed
              </div>
              <button
                onClick={handleExportToExcel}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-500/50 text-white font-bold transition-all"
              >
                📊 Export to Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Tiebreakers - Show when tiebreaker_pending */}
      {round.status === 'tiebreaker_pending' && round.tiebreakers && round.tiebreakers.length > 0 && (
        <div className="rounded-xl bg-purple-500/10 border-2 border-purple-500/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-purple-300">Active Tiebreakers</h2>
              <p className="text-sm text-purple-200">Teams must submit new bids to resolve ties</p>
            </div>
          </div>
          <div className="space-y-4">
            {round.tiebreakers
              .filter((tb: any) => tb.status === 'active')
              .map((tiebreaker: any) => {
                const player = tiebreaker.basePlayer
                const playerStats = player?.seasonalPlayerStats?.[0]
                const submittedBids = tiebreaker.teamTiebreakerBids?.filter((bid: any) => bid.submitted).length || 0
                const totalBids = tiebreaker.teamTiebreakerBids?.length || 0
                
                return (
                  <div key={tiebreaker.id} className="rounded-lg bg-black/30 border border-purple-500/20 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {player?.photoUrl && (
                          <img 
                            src={player.photoUrl} 
                            alt={player.name} 
                            className="w-12 h-12 rounded-lg object-cover bg-white/5"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-player.png'
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-white text-lg">{player?.name || 'Unknown Player'}</span>
                            {playerStats && (
                              <>
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                                  {playerStats.position}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold">
                                  OVR {playerStats.overallRating}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            Original bid: £{tiebreaker.originalAmount.toLocaleString()} • {tiebreaker.tiedTeamsCount} teams tied
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          submittedBids === totalBids 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {submittedBids}/{totalBids} Submitted
                        </div>
                      </div>
                    </div>
                    
                    {/* Team bid status */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-purple-500/20">
                      <div className="text-xs text-gray-400 mb-2">Team Bid Status:</div>
                      {tiebreaker.teamTiebreakerBids?.map((bid: any) => {
                        const team = teams.find(t => t.id === bid.teamId)
                        return (
                          <div key={bid.id} className="flex items-center justify-between p-2 rounded bg-black/20">
                            <div className="flex items-center gap-2">
                              {team?.logoUrl && (
                                <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded" />
                              )}
                              <span className="text-sm font-bold text-white">{team?.name || bid.teamId}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                Old: £{bid.oldBidAmount.toLocaleString()}
                              </span>
                              {bid.submitted ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-emerald-400">
                                    New: £{bid.newBidAmount?.toLocaleString() || '—'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                    ✓ Submitted
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Bulk Round Conflicts - Show when tiebreaker_pending for bulk rounds */}
      {round.status === 'tiebreaker_pending' && round.roundType === 'bulk' && bulkConflicts && bulkConflicts.length > 0 && (
        <div className="rounded-xl bg-orange-500/10 border-2 border-orange-500/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-orange-300">Bulk Tiebreakers</h2>
              <p className="text-sm text-orange-200">
                {bulkConflicts.filter(c => c.status === 'pending').length} pending • 
                {bulkConflicts.filter(c => c.status === 'active').length} active • 
                {bulkConflicts.filter(c => c.status === 'completed').length} completed
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bulkConflicts.map((conflict) => {
              const isPending = conflict.status === 'pending'
              const isActive = conflict.status === 'active'
              const isCompleted = conflict.status === 'completed'
              
              return (
                <div key={conflict.tiebreakerId} className={`rounded-lg border p-4 ${
                  isPending ? 'bg-yellow-500/5 border-yellow-500/20' :
                  isActive ? 'bg-purple-500/5 border-purple-500/20' :
                  'bg-emerald-500/5 border-emerald-500/20'
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <img 
                      src={conflict.photoUrl} 
                      alt={conflict.playerName} 
                      className="w-16 h-16 rounded-lg object-cover bg-white/5"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-player.png'
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-black text-white text-lg mb-1">{conflict.playerName}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          isPending ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          isActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {conflict.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold border border-orange-500/30">
                          {conflict.position}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold">
                          OVR {conflict.overallRating}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Base Price: £{conflict.basePrice} • {conflict.teams.length} teams
                      </div>
                    </div>
                  </div>
                  
                  {/* Participating teams */}
                  <div className="space-y-2 mb-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2">Participating Teams:</div>
                    {conflict.teams.map(team => (
                      <div key={team.id} className="flex items-center gap-2 p-2 rounded bg-black/20">
                        {team.logoUrl && (
                          <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded" />
                        )}
                        <span className="text-sm font-bold text-white flex-1">{team.name}</span>
                        {team.participantStatus !== 'active' && (
                          <span className="text-xs text-gray-400">({team.participantStatus})</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Action buttons */}
                  {isPending && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Start tiebreaker for ${conflict.playerName}? Teams will be able to bid.`)) return
                        
                        setLoading(true)
                        setError('')
                        
                        try {
                          const response = await fetch(`/api/admin/bulk-tiebreakers/${conflict.tiebreakerId}/start`, {
                            method: 'POST'
                          })
                          
                          if (!response.ok) {
                            const error = await response.json()
                            throw new Error(error.error || 'Failed to start tiebreaker')
                          }
                          
                          router.refresh()
                        } catch (err: any) {
                          setError(err.message)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? 'Starting...' : '▶ Start Tiebreaker'}
                    </button>
                  )}
                  
                  {(isActive || isCompleted) && (
                    <a
                      href={`/sub-admin/${round.season.id}/auction/bulk-tiebreakers/${conflict.tiebreakerId}`}
                      className="block w-full px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all text-center font-medium"
                    >
                      {isActive ? '👁 Monitor Tiebreaker' : '✓ View Results'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview Results - Show for preview_finalized rounds (admin only) */}
      {round.status === 'preview_finalized' && previewAllocations && previewAllocations.length > 0 && (
        <div className="rounded-xl bg-blue-500/10 border-2 border-blue-500/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-300">Preview Results (Admin Only)</h2>
              <p className="text-sm text-blue-200">These results are NOT visible to teams yet</p>
            </div>
          </div>
          <div className="space-y-3">
            {previewAllocations.map((alloc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-blue-500/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-white text-lg">{alloc.playerName}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                      {alloc.acquisitionType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">Team {alloc.teamId}</div>
                  {alloc.acquisitionNotes && (
                    <div className="text-xs text-gray-500 mt-1">{alloc.acquisitionNotes}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    £{alloc.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auction Results - Show for completed rounds */}
      {round.status === 'completed' && auctionResults && auctionResults.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-black text-white mb-4">Auction Results</h2>
          <div className="space-y-3">
            {auctionResults.map((result) => {
              const playerStats = result.basePlayer.seasonalPlayerStats[0]
              return (
                <div key={result.id} className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-white/10">
                  <div className="flex items-center gap-4 flex-1">
                    {result.basePlayer.photoUrl && (
                      <img 
                        src={result.basePlayer.photoUrl} 
                        alt={result.basePlayer.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-white/5"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-player.png'
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-white text-lg">{result.basePlayer.name}</span>
                        {playerStats && (
                          <>
                            <span className="px-2 py-0.5 rounded bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold border border-[#E8A800]/30">
                              {playerStats.position}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold">
                              OVR {playerStats.overallRating}
                            </span>
                          </>
                        )}
                      </div>
                      {playerStats?.nationality && (
                        <div className="text-xs text-gray-400">{playerStats.nationality}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Sold To</div>
                      <div className="flex items-center gap-2">
                        {result.team.logoUrl && (
                          <img 
                            src={result.team.logoUrl} 
                            alt={result.team.name} 
                            className="w-6 h-6 rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="font-bold text-white">{result.team.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Price</div>
                      <div className="text-xl font-black text-emerald-400">
                        ${result.soldPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Bids Status */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-xl font-black text-white mb-4">Team Bid Status</h2>
        <div className="space-y-2">
          {teams.map(team => {
            const teamBid = round.teamRoundBids.find((bid: any) => bid.teamId === team.id)
            return (
              <div key={team.id} className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center gap-3">
                  {team.logoUrl && (
                    <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded" />
                  )}
                  <span className="font-bold text-white">{team.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {teamBid ? (
                    <>
                      <span className="text-sm text-gray-400">{teamBid.bidCount} bids</span>
                      {teamBid.submitted ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold border border-yellow-500/30">
                          In Progress
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-bold border border-gray-500/30">
                      Not Started
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Extend Time Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-black text-white mb-4">Extend Round Time</h3>
            <p className="text-[#D4CCBB] text-sm mb-6">
              Add extra time to this round. The end time will be updated immediately.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={extendHours}
                  onChange={(e) => setExtendHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-[#E8A800]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-[#E8A800]/50"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExtendModal(false)
                  setError('')
                }}
                disabled={extending}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTime}
                disabled={extending || (extendHours === 0 && extendMinutes === 0)}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-bold transition-all disabled:opacity-50"
              >
                {extending ? 'Extending...' : 'Extend Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results Modal */}
      {showPreviewModal && previewResults && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">Preview Results</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {previewResults.tieDetected && previewResults.ties && (
              <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="text-lg font-bold text-purple-300 mb-2">⚠️ Tiebreakers Required</h4>
                <p className="text-sm text-[#D4CCBB] mb-4">
                  The following players have tied bids. Tiebreakers will be created when you finalize.
                </p>
                <div className="space-y-2">
                  {previewResults.ties.map((tie: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/30 border border-purple-500/20">
                      <div className="font-bold text-white">{tie.playerName}</div>
                      <div className="text-sm text-gray-400">
                        Amount: £{tie.amount.toLocaleString()} • Teams: {tie.tiedTeams.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResults.allocations && previewResults.allocations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4">Allocations ({previewResults.allocations.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {previewResults.allocations.map((alloc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <div className="font-bold text-white">{alloc.playerName}</div>
                        <div className="text-sm text-gray-400">Team {alloc.teamId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-emerald-400">
                          £{alloc.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{alloc.acquisitionType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResults.conflicts && previewResults.conflicts.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <h4 className="text-lg font-bold text-orange-300 mb-2">⚠️ Conflicts (Bulk Round)</h4>
                <p className="text-sm text-[#D4CCBB] mb-4">
                  Multiple teams bid on these players. Create bulk tiebreakers to resolve.
                </p>
                <div className="space-y-2">
                  {previewResults.conflicts.map((conflict: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/30 border border-orange-500/20">
                      <div className="font-bold text-white">{conflict.playerName}</div>
                      <div className="text-sm text-gray-400">
                        Teams: {conflict.teamIds.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Close Preview
              </button>
              <button
                onClick={handleFinalizeFromPreview}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Finalizing...' : 'Finalize & Make Public'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
