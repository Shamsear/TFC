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

interface RoundDetailClientProps {
  round: Round
  teams: Team[]
  auctionResults: AuctionResult[] | null
}

export default function RoundDetailClient({ round, teams, auctionResults }: RoundDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendHours, setExtendHours] = useState(0)
  const [extendMinutes, setExtendMinutes] = useState(30)
  const [extending, setExtending] = useState(false)

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
        method: 'POST'
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
            href={`/sub-admin/${round.season.id}/auction-v2`}
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
            <button
              onClick={handleFinalizeRound}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Finalizing...' : 'Finalize Round'}
            </button>
          )}
          {round.status === 'completed' && (
            <div className="text-emerald-400 font-bold">
              ✓ Round completed
            </div>
          )}
        </div>
      </div>

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
    </>
  )
}
