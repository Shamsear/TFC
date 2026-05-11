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
}

export default function BulkRoundSelectionClient({
  round,
  season,
  team,
  players,
  initialSelections,
  squadSize,
  minSquadSize
}: BulkRoundSelectionClientProps) {
  const router = useRouter()
  const [selections, setSelections] = useState<string[]>(
    initialSelections
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.playerId)
  )
  const [submitted, setSubmitted] = useState(initialSelections.some(s => s.submitted))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [timeRemaining, setTimeRemaining] = useState('')

  // Calculate time remaining
  useEffect(() => {
    if (round.status !== 'active' || !round.endTime) return

    const updateTimer = () => {
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
        setTimeRemaining('Expired')
        router.refresh()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [round.status, round.endTime, router])

  const handleToggleSelection = (playerId: string) => {
    setSelections(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else {
        // Calculate how many more players needed to reach minimum squad size
        const slotsNeeded = minSquadSize - squadSize
        
        // Don't allow more selections than needed (this shouldn't happen with disabled buttons)
        if (slotsNeeded > 0 && prev.length >= slotsNeeded) {
          return prev
        }
        return [...prev, playerId]
      }
    })
  }

  const handleReorder = (playerId: string, direction: 'up' | 'down') => {
    const index = selections.indexOf(playerId)
    if (index === -1) return

    const newSelections = [...selections]
    if (direction === 'up' && index > 0) {
      [newSelections[index], newSelections[index - 1]] = [newSelections[index - 1], newSelections[index]]
    } else if (direction === 'down' && index < newSelections.length - 1) {
      [newSelections[index], newSelections[index + 1]] = [newSelections[index + 1], newSelections[index]]
    }
    setSelections(newSelections)
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
    if (!confirm('Are you sure you want to submit? You cannot change your selections after submission.')) {
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

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPosition = positionFilter === 'all' || p.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const positions = Array.from(new Set(players.map(p => p.position))).sort()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Round {round.roundNumber} - Bulk Selection
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {season.name} {round.position && `— ${round.position}`}
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
              <div className="text-xl font-bold text-white">{squadSize} / {minSquadSize}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Selected</div>
              <div className="text-xl font-bold text-white">
                {selections.length} / {Math.max(0, minSquadSize - squadSize)}
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
        {/* Selected Players */}
        {selections.length > 0 && (
          <div className="mb-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Your Selections (Priority Order)
            </h2>
            <div className="space-y-2">
              {selections.map((playerId, index) => {
                const player = players.find(p => p.id === playerId)
                if (!player) return null

                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="text-lg font-bold text-[#E8A800] w-8">
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={player.photoUrl}
                        alt={player.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white">{player.name}</div>
                      <div className="text-xs text-[#D4CCBB]">
                        {player.position} • OVR {player.overall}
                      </div>
                    </div>
                    {!submitted && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReorder(playerId, 'up')}
                          disabled={index === 0}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleReorder(playerId, 'down')}
                          disabled={index === selections.length - 1}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleSelection(playerId)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredPlayers.map(player => {
            const isSelected = selections.includes(player.id)
            const priority = isSelected ? selections.indexOf(player.id) + 1 : null
            const slotsNeeded = minSquadSize - squadSize
            const limitReached = !isSelected && selections.length >= slotsNeeded

            return (
              <div
                key={player.id}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
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
                  {isSelected && priority && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                      #{priority}
                    </div>
                  )}
                </div>

                {!limitReached && (
                  <button
                    onClick={() => handleToggleSelection(player.id)}
                    disabled={submitted}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isSelected ? 'Remove' : 'Select'}
                  </button>
                )}
                {limitReached && (
                  <div className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#7A7367] text-center text-sm">
                    Selection limit reached
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        {!submitted && round.status === 'active' && (
          <div className="flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || selections.length === 0}
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
          </div>
        )}
      </div>
    </div>
  )
}
