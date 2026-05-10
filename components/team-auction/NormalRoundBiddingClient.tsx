'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Player {
  basePlayerId: string
  position: string
  overallRating: number
  playing_style: string | null
  basePlayer: {
    id: string
    name: string
    photoUrl: string
  }
}

interface Round {
  id: string
  roundNumber: number
  position: string | null
  status: string
  endTime: Date | null
  maxBidsPerTeam: number | null
  basePrice: number | null
  season: {
    id: string
    name: string
  }
}

interface ExistingBids {
  bids: Record<string, number>
  submitted: boolean
  bidCount: number
  lastUpdated: Date
}

interface NormalRoundBiddingClientProps {
  round: Round
  players: Player[]
  budget: number
  squadSize: number
  existingBids: ExistingBids | null
  teamId: string
}

interface Bid {
  base_player_id: string
  player_name: string
  amount: number
}

export default function NormalRoundBiddingClient({
  round,
  players,
  budget,
  squadSize,
  existingBids,
  teamId
}: NormalRoundBiddingClientProps) {
  const router = useRouter()
  const [bids, setBids] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [playingStyleFilter, setPlayingStyleFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(existingBids?.submitted || false)
  const [unlocking, setUnlocking] = useState(false)

  // Load existing bids
  useEffect(() => {
    if (existingBids && existingBids.bids) {
      setBids(existingBids.bids)
    }
  }, [existingBids])

  // Timer
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

  const handleBidChange = (playerId: string, amount: string) => {
    const numAmount = parseInt(amount) || 0
    
    // Check if adding a new bid would exceed max bids
    const currentBidCount = Object.keys(bids).filter(k => bids[k] > 0).length
    const isNewBid = !bids[playerId] || bids[playerId] === 0
    
    if (isNewBid && numAmount > 0 && round.maxBidsPerTeam) {
      if (currentBidCount >= round.maxBidsPerTeam) {
        setErrorModalMessage(`Maximum ${round.maxBidsPerTeam} bids allowed. Remove a bid before adding a new one.`)
        setShowErrorModal(true)
        return
      }
    }
    
    // Check if this amount is already used for another player
    if (numAmount > 0) {
      const duplicateAmount = Object.entries(bids).find(
        ([pid, amt]) => pid !== playerId && amt === numAmount
      )
      
      if (duplicateAmount) {
        const duplicatePlayer = players.find(p => p.basePlayerId === duplicateAmount[0])
        setErrorModalMessage(`Amount £${numAmount.toLocaleString()} is already used for ${duplicatePlayer?.basePlayer.name || 'another player'}. Each bid must be unique.`)
        setShowErrorModal(true)
        return
      }
    }
    
    setBids(prev => ({
      ...prev,
      [playerId]: numAmount
    }))
  }

  const handleRemoveBid = (playerId: string) => {
    setBids(prev => {
      const newBids = { ...prev }
      delete newBids[playerId]
      return newBids
    })
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const bidArray = Object.entries(bids)
        .filter(([_, amount]) => amount > 0)
        .map(([playerId, amount]) => {
          const player = players.find(p => p.basePlayerId === playerId)
          return {
            base_player_id: playerId,
            player_name: player?.basePlayer.name || '',
            amount
          }
        })

      const response = await fetch(`/api/auction/rounds/${round.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bids: bidArray,
          submitted: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save draft')
      }

      setMessage({ type: 'success', text: 'Draft saved successfully' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    // Validate minimum bid amount
    const invalidBids = Object.entries(bids)
      .filter(([_, amount]) => amount > 0 && amount < 10)
      .map(([playerId]) => {
        const player = players.find(p => p.basePlayerId === playerId)
        return player?.basePlayer.name || 'Unknown'
      })

    if (invalidBids.length > 0) {
      setErrorModalMessage(
        `The following ${invalidBids.length === 1 ? 'bid is' : 'bids are'} below the minimum amount of £10:\n\n${invalidBids.join(', ')}\n\nPlease increase ${invalidBids.length === 1 ? 'this bid' : 'these bids'} to at least £10.`
      )
      setShowErrorModal(true)
      return
    }

    if (!confirm('Are you sure you want to submit? You cannot change your bids after submission.')) {
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const bidArray = Object.entries(bids)
        .filter(([_, amount]) => amount > 0)
        .map(([playerId, amount]) => {
          const player = players.find(p => p.basePlayerId === playerId)
          return {
            base_player_id: playerId,
            player_name: player?.basePlayer.name || '',
            amount
          }
        })

      if (bidArray.length === 0) {
        throw new Error('Please place at least one bid')
      }

      const response = await fetch(`/api/auction/rounds/${round.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bids: bidArray,
          submitted: true
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit bids')
      }

      setIsSubmitted(true)
      setMessage({ type: 'success', text: 'Bids submitted successfully!' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlockBids = async () => {
    if (!confirm('Are you sure you want to edit your bids? Your submission status will be changed to draft.')) {
      return
    }

    setUnlocking(true)
    setMessage(null)

    try {
      const bidArray = Object.entries(bids)
        .filter(([_, amount]) => amount > 0)
        .map(([playerId, amount]) => {
          const player = players.find(p => p.basePlayerId === playerId)
          return {
            base_player_id: playerId,
            player_name: player?.basePlayer.name || '',
            amount
          }
        })

      // If no bids in state (decryption failed), just clear the record
      const response = await fetch(`/api/auction/rounds/${round.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bids: bidArray.length > 0 ? bidArray : [],
          submitted: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unlock bids')
      }

      setIsSubmitted(false)
      setMessage({ type: 'success', text: 'Bids unlocked. You can now edit them.' })
      
      // If bids were empty due to decryption error, clear the message
      if (bidArray.length === 0) {
        setBids({})
        setMessage({ type: 'success', text: 'Ready to place new bids.' })
      }
      
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setUnlocking(false)
    }
  }

  const filteredPlayers = players.filter(p =>
    p.basePlayer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (playingStyleFilter === 'all' || p.playing_style === playingStyleFilter)
  )

  // Get unique playing styles for filter
  const playingStyles = Array.from(new Set(players.map(p => p.playing_style).filter(Boolean))) as string[]

  const totalBidAmount = Object.values(bids).reduce((sum, amount) => sum + amount, 0)
  const bidCount = Object.keys(bids).filter(k => bids[k] > 0).length
  const maxBidsReached = round.maxBidsPerTeam ? bidCount >= round.maxBidsPerTeam : false

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Round {round.roundNumber} Bidding
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {round.season.name} {round.position && `— ${round.position}`}
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
              <div className="text-xs text-[#7A7367] mb-1">Budget</div>
              <div className="text-xl font-bold text-white">£{budget.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Bids Placed</div>
              <div className={`text-xl font-bold ${maxBidsReached ? 'text-red-400' : 'text-white'}`}>
                {bidCount} / {round.maxBidsPerTeam || '∞'}
              </div>
              {maxBidsReached && (
                <div className="text-xs text-red-400 mt-1">Max reached</div>
              )}
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Total Bid</div>
              <div className="text-xl font-bold text-white">£{totalBidAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Status</div>
              <div className={`text-xl font-bold ${isSubmitted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isSubmitted ? 'Submitted' : 'Draft'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800]"
          />
        </div>

        {/* Playing Style Filter */}
        {playingStyles.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm text-[#D4CCBB] mb-2">Filter by Playing Style</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPlayingStyleFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  playingStyleFilter === 'all'
                    ? 'bg-[#E8A800] text-black'
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                All ({players.length})
              </button>
              {playingStyles.sort().map(style => {
                const count = players.filter(p => p.playing_style === style).length
                return (
                  <button
                    key={style}
                    onClick={() => setPlayingStyleFilter(style)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      playingStyleFilter === style
                        ? 'bg-[#E8A800] text-black'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {style} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredPlayers.map(player => (
            <div
              key={player.basePlayerId}
              className="rounded-xl bg-white/5 border border-white/10 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  <Image
                    src={player.basePlayer.photoUrl}
                    alt={player.basePlayer.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{player.basePlayer.name}</h3>
                  <p className="text-xs text-[#D4CCBB]">
                    {player.position} • OVR {player.overallRating}
                    {player.playing_style && ` • ${player.playing_style}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`Min £${round.basePrice?.toLocaleString() || 0}`}
                  value={bids[player.basePlayerId] || ''}
                  onChange={(e) => handleBidChange(player.basePlayerId, e.target.value)}
                  disabled={isSubmitted || (maxBidsReached && !bids[player.basePlayerId])}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {bids[player.basePlayerId] > 0 && !isSubmitted && (
                  <button
                    onClick={() => handleRemoveBid(player.basePlayerId)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!isSubmitted && round.status === 'active' && (
          <div className="flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || bidCount === 0}
              className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || bidCount === 0}
              className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Bids'}
            </button>
          </div>
        )}

        {isSubmitted && round.status === 'active' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center">
              ✓ Your bids have been submitted successfully
            </div>
            <button
              onClick={handleUnlockBids}
              disabled={unlocking}
              className="w-full px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 font-medium"
            >
              {unlocking ? 'Unlocking...' : 'Edit Bids'}
            </button>
          </div>
        )}
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border-2 border-red-500/50 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white mb-2">Invalid Bid</h3>
                <p className="text-[#D4CCBB] text-sm leading-relaxed whitespace-pre-line">
                  {errorModalMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-6 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-bold transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
