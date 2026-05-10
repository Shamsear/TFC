'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { decryptBids } from '@/lib/auction/encryption'

interface Player {
  basePlayerId: string
  position: string
  overallRating: number
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
  encryptedBids: string
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
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(existingBids?.submitted || false)

  // Load existing bids
  useEffect(() => {
    if (existingBids) {
      try {
        const decrypted = decryptBids(existingBids.encryptedBids)
        const parsed = JSON.parse(decrypted)
        const bidMap: Record<string, number> = {}
        parsed.bids.forEach((bid: Bid) => {
          bidMap[bid.base_player_id] = bid.amount
        })
        setBids(bidMap)
      } catch (error) {
        console.error('Failed to decrypt bids:', error)
      }
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

  const filteredPlayers = players.filter(p =>
    p.basePlayer.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalBidAmount = Object.values(bids).reduce((sum, amount) => sum + amount, 0)
  const bidCount = Object.keys(bids).filter(k => bids[k] > 0).length

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
              <div className="text-xl font-bold text-white">
                {bidCount} / {round.maxBidsPerTeam || '∞'}
              </div>
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
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`Min £${round.basePrice?.toLocaleString() || 0}`}
                  value={bids[player.basePlayerId] || ''}
                  onChange={(e) => handleBidChange(player.basePlayerId, e.target.value)}
                  disabled={isSubmitted}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] disabled:opacity-50"
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
      </div>
    </div>
  )
}
