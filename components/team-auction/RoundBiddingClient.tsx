'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { normalizeForSearch } from '@/lib/search-utils'
import SearchableSelect from '@/components/ui/SearchableSelect'

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

interface Bid {
  playerId: string
  bidAmount: number
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

interface RoundBiddingClientProps {
  round: Round
  season: Season
  team: Team
  players: Player[]
  initialBids: Bid[]
}

export default function RoundBiddingClient({
  round,
  season,
  team,
  players,
  initialBids
}: RoundBiddingClientProps) {
  const router = useRouter()
  const [bids, setBids] = useState<Map<string, number>>(
    new Map(initialBids.map(b => [b.playerId, b.bidAmount]))
  )
  const [submitted, setSubmitted] = useState(initialBids.some(b => b.submitted))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [reserveInfo, setReserveInfo] = useState<any>(null)

  // Fetch reserve info
  useEffect(() => {
    async function fetchReserveInfo() {
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/team/reserve-info?season_id=${season.id}&round_id=${round.id}&_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setReserveInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch reserve info:', error)
      }
    }
    fetchReserveInfo()
  }, [season.id, round.id])

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

  const handleBidChange = (playerId: string, amount: number) => {
    if (reserveInfo && amount > reserveInfo.maxBid) {
      alert(`Bid £${amount.toLocaleString()} exceeds your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()} (required to maintain squad balance/reserve requirements).`)
      return
    }

    const newBids = new Map(bids)
    if (amount > 0) {
      newBids.set(playerId, amount)
    } else {
      newBids.delete(playerId)
    }
    setBids(newBids)
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      if (reserveInfo) {
        const exceedingBids = Array.from(bids.entries()).filter(([_, amount]) => amount > reserveInfo.maxBid)
        if (exceedingBids.length > 0) {
          const playerNames = exceedingBids.map(([playerId]) => {
            const player = players.find(p => p.id === playerId)
            return player?.name || 'Unknown'
          }).join(', ')
          throw new Error(`Bids for the following players exceed your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()}: ${playerNames}. Please reduce them.`)
        }
      }

      const bidData = Array.from(bids.entries()).map(([playerId, bidAmount]) => ({
        playerId,
        bidAmount
      }))

      const response = await fetch(`/api/auction/rounds/${round.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bids: bidData, submitted: false })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save draft')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (bids.size === 0) {
      alert('Please add at least one bid')
      return
    }

    if (round.maxBidsPerTeam && bids.size > round.maxBidsPerTeam) {
      alert(`Maximum ${round.maxBidsPerTeam} bids allowed`)
      return
    }

    if (!confirm('Are you sure you want to submit your bids? This cannot be undone.')) {
      return
    }

    setSubmitting(true)
    try {
      if (reserveInfo) {
        const exceedingBids = Array.from(bids.entries()).filter(([_, amount]) => amount > reserveInfo.maxBid)
        if (exceedingBids.length > 0) {
          const playerNames = exceedingBids.map(([playerId]) => {
            const player = players.find(p => p.id === playerId)
            return player?.name || 'Unknown'
          }).join(', ')
          throw new Error(`Bids for the following players exceed your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()}: ${playerNames}. Please reduce them.`)
        }
      }

      const bidData = Array.from(bids.entries()).map(([playerId, bidAmount]) => ({
        playerId,
        bidAmount
      }))

      const response = await fetch(`/api/auction/rounds/${round.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bids: bidData, submitted: true })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit bids')
      }

      setSubmitted(true)
      router.refresh()
      router.push('/team/auction')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit bids')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = normalizeForSearch(player.name).includes(normalizeForSearch(searchQuery))
    const matchesPosition = positionFilter === 'all' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const positions = Array.from(new Set(players.map(p => p.position))).sort()
  const totalBidAmount = Array.from(bids.values()).reduce((sum, amount) => sum + amount, 0)
  const remainingBudget = team.budget - totalBidAmount

  const isActive = round.status === 'active'
  const canEdit = isActive && !submitted

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <img
                src={team.logoUrl}
                alt={team.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                Round {round.roundNumber}
              </h1>
              <p className="text-sm sm:text-base text-[#D4CCBB]">
                {round.position || 'All Positions'} — {season.name}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Budget</div>
              <div className="text-lg sm:text-xl font-bold text-white">
                £{team.budget.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Total Bids</div>
              <div className="text-lg sm:text-xl font-bold text-amber-400">
                £{totalBidAmount.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Remaining</div>
              <div className={`text-lg sm:text-xl font-bold ${remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                £{remainingBudget.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Bids Placed</div>
              <div className="text-lg sm:text-xl font-bold text-white">
                {bids.size}{round.maxBidsPerTeam ? ` / ${round.maxBidsPerTeam}` : ''}
              </div>
            </div>
          </div>

          {/* Reserve Information */}
          {reserveInfo && (
            <div className={`mt-4 rounded-lg border p-4 ${
              reserveInfo.phase === 'phase_1' 
                ? 'bg-red-500/10 border-red-500/30'
                : reserveInfo.phase === 'phase_2'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  reserveInfo.phase === 'phase_1' 
                    ? 'bg-red-500/20 text-red-300'
                    : reserveInfo.phase === 'phase_2'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold mb-1 ${
                    reserveInfo.phase === 'phase_1' 
                      ? 'text-red-300'
                      : reserveInfo.phase === 'phase_2'
                      ? 'text-amber-300'
                      : 'text-blue-300'
                  }`}>
                    Budget Reserve - {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
                  </h3>
                  <div className="space-y-1 text-xs text-white/80">
                    <p><strong>Required Reserve:</strong> £{reserveInfo.floorReserve.toLocaleString()}</p>
                    <p><strong>Maximum Bid:</strong> £{reserveInfo.maxBid.toLocaleString()}</p>
                    {reserveInfo.phase === 'phase_2' && reserveInfo.maxRecommendedBid < reserveInfo.maxBid && (
                      <p className="text-amber-300"><strong>Recommended Max:</strong> £{reserveInfo.maxRecommendedBid.toLocaleString()}</p>
                    )}
                    <p className="text-white/60 text-xs mt-1">{reserveInfo.calculation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer */}
          {isActive && timeRemaining && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-300">
                  Time Remaining: {timeRemaining}
                </span>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {submitted && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-emerald-300">
                  Bids submitted successfully
                </span>
              </div>
            </div>
          )}

          {!isActive && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-300">
                  This round is not active
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800]"
            />
          </div>
          <SearchableSelect
            value={positionFilter}
            options={[
              { value: 'all', label: 'All Positions' },
              ...positions.map(pos => ({ value: pos, label: pos }))
            ]}
            onChange={setPositionFilter}
            enableSearch={true}
            className="w-full sm:w-48"
          />
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredPlayers.map(player => {
            const currentBid = bids.get(player.id) || 0
            return (
              <div
                key={player.id}
                className="rounded-xl bg-white/5 border border-white/10 p-4"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{player.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-[#D4CCBB]">
                      <span>{player.position}</span>
                      <span>•</span>
                      <span className="font-bold text-[#E8A800]">{player.overall}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="text-center">
                    <div className="text-[#7A7367]">PAC</div>
                    <div className="font-bold text-white">{player.pace}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#7A7367]">SHO</div>
                    <div className="font-bold text-white">{player.shooting}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#7A7367]">PAS</div>
                    <div className="font-bold text-white">{player.passing}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#7A7367]">DRI</div>
                    <div className="font-bold text-white">{player.dribbling}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#7A7367]">DEF</div>
                    <div className="font-bold text-white">{player.defending}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#7A7367]">PHY</div>
                    <div className="font-bold text-white">{player.physical}</div>
                  </div>
                </div>

                {/* Bid Input */}
                <div className="space-y-2">
                  <label className="text-xs text-[#7A7367]">
                    Bid Amount {round.basePrice && `(Min: £${round.basePrice.toLocaleString()})`}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7367]">£</span>
                      <input
                        type="number"
                        min={round.basePrice || 0}
                        step="1000"
                        value={currentBid || ''}
                        onChange={(e) => handleBidChange(player.id, parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] disabled:opacity-50"
                      />
                    </div>
                    {currentBid > 0 && canEdit && (
                      <button
                        onClick={() => handleBidChange(player.id, 0)}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-4 sticky bottom-6">
            <button
              onClick={handleSaveDraft}
              disabled={saving || bids.size === 0}
              className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || bids.size === 0}
              className="flex-1 px-6 py-4 bg-[#E8A800] hover:bg-[#d49900] text-black rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Bids'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
