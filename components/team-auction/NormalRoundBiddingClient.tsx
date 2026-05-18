'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Player {
  basePlayerId: string
  position: string
  position_group?: string | null
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
  position_group?: string | null
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
  teamName?: string
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
  teamId,
  teamName
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
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(existingBids?.submitted || false)
  const [unlocking, setUnlocking] = useState(false)
  const [reserveInfo, setReserveInfo] = useState<any>(null)
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const playersPerPage = 12
  const [showBiddedPlayers, setShowBiddedPlayers] = useState(false)

  // Load starred players
  useEffect(() => {
    fetch(`/api/team/starred-players?seasonId=${round.season.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.starredPlayerIds) {
          setStarredPlayerIds(new Set(data.starredPlayerIds))
        }
      })
      .catch(err => console.error('Error loading starred players:', err))
  }, [round.season.id])

  // Toggle star for a player
  const toggleStar = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (starringInProgress.has(playerId)) return
    
    setStarringInProgress(prev => new Set(prev).add(playerId))
    const isCurrentlyStarred = starredPlayerIds.has(playerId)
    
    try {
      if (isCurrentlyStarred) {
        const res = await fetch(`/api/team/starred-players?playerId=${playerId}&seasonId=${round.season.id}`, {
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
          body: JSON.stringify({ playerId, seasonId: round.season.id }),
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

  // Fetch reserve info
  useEffect(() => {
    async function fetchReserveInfo() {
      try {
        const response = await fetch(`/api/team/reserve-info?season_id=${round.season.id}&round_id=${round.id}`)
        if (response.ok) {
          const data = await response.json()
          setReserveInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch reserve info:', error)
      }
    }
    fetchReserveInfo()
  }, [round.season.id, round.id])

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

    // Check if max bids requirement is met
    if (round.maxBidsPerTeam && bidCount < round.maxBidsPerTeam) {
      setErrorModalMessage(
        `You must place exactly ${round.maxBidsPerTeam} bids to submit.\n\nCurrent bids: ${bidCount}\nRequired: ${round.maxBidsPerTeam}`
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

  const handleCopyToWhatsApp = () => {
    const bidEntries = Object.entries(bids)
      .filter(([_, amount]) => amount > 0)
      .map(([playerId, amount]) => {
        const player = players.find(p => p.basePlayerId === playerId)
        return { name: player?.basePlayer.name || 'Unknown', amount }
      })
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending

    if (bidEntries.length === 0) {
      alert('No bids to copy')
      return
    }

    const positionText = round.position 
      ? `${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}`
      : 'All Positions'

    const message = `*${round.season.name}*

*Round ${round.roundNumber} Bids*

*Position:* ${positionText}
*Team:* ${teamName || 'Your Team'}

*Bids:*
${bidEntries.map((bid, idx) => `${idx + 1}. ${bid.name} - £${bid.amount}`).join('\n')}`

    // Copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
      setShowSuccessModal(true)
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  const filteredPlayers = players
    .filter(p =>
      p.basePlayer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (playingStyleFilter === 'all' || p.playing_style === playingStyleFilter)
    )
    .sort((a, b) => {
      // Sort: starred players first, then by overall rating
      const aStarred = starredPlayerIds.has(a.basePlayer.id)
      const bStarred = starredPlayerIds.has(b.basePlayer.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return b.overallRating - a.overallRating
    })

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, playingStyleFilter])

  // Get unique playing styles for filter
  const playingStyles = Array.from(new Set(players.map(p => p.playing_style).filter(Boolean))) as string[]

  const totalBidAmount = Object.values(bids).reduce((sum, amount) => sum + amount, 0)
  const bidCount = Object.keys(bids).filter(k => bids[k] > 0).length
  const totalBidsInList = Object.keys(bids).filter(k => bids[k] !== undefined).length
  const maxBidsReached = round.maxBidsPerTeam ? bidCount >= round.maxBidsPerTeam : false
  const hasMaxBidsRequired = round.maxBidsPerTeam ? bidCount === round.maxBidsPerTeam : true

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
                Round {round.roundNumber} Bidding
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {round.season.name} {round.position && `— ${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}`}
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

        {/* Bidded Players Section */}
        {totalBidsInList > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowBiddedPlayers(!showBiddedPlayers)}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">Your Bids ({totalBidsInList})</h3>
                  <p className="text-xs text-[#D4CCBB]">
                    {bidCount > 0 ? `Total: £${totalBidAmount.toLocaleString()}` : 'Enter bid amounts'}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-[#D4CCBB] transition-transform ${showBiddedPlayers ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBiddedPlayers && (
              <div className="mt-4 space-y-3">
                {Object.entries(bids)
                  .filter(([playerId]) => bids[playerId] !== undefined)
                  .sort(([, a], [, b]) => (b || 0) - (a || 0))
                  .map(([playerId, amount]) => {
                    const player = players.find(p => p.basePlayerId === playerId)
                    if (!player) return null

                    return (
                      <div
                        key={playerId}
                        className="rounded-lg bg-white/5 border border-white/10 p-4"
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
                            <h4 className="font-bold text-white">{player.basePlayer.name}</h4>
                            <p className="text-xs text-[#D4CCBB]">
                              {player.position} • OVR {player.overallRating}
                              {player.playing_style && ` • ${player.playing_style}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-[#7A7367] mb-1">Bid Amount</label>
                            <input
                              type="number"
                              value={amount || ''}
                              onChange={(e) => {
                                const newAmount = e.target.value
                                // Allow empty string or valid numbers
                                if (newAmount === '') {
                                  setBids(prev => ({ ...prev, [playerId]: 0 }))
                                } else {
                                  const numAmount = parseInt(newAmount) || 0
                                  setBids(prev => ({ ...prev, [playerId]: numAmount }))
                                }
                              }}
                              disabled={round.status !== 'active' || isSubmitted}
                              placeholder="Enter amount"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                          {!isSubmitted && round.status === 'active' && (
                            <button
                              onClick={() => handleRemoveBid(playerId)}
                              className="mt-5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
                              title="Remove bid"
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

        {/* Pagination - Top */}
        {filteredPlayers.length > playersPerPage && <PaginationControls />}

        {/* Actions - Top */}
        {!isSubmitted && round.status === 'active' && (
          <div className="space-y-3 my-6">
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
            {bidCount > 0 && (
              <button
                onClick={handleCopyToWhatsApp}
                className="w-full px-6 py-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Copy to WhatsApp
              </button>
            )}
          </div>
        )}

        {isSubmitted && round.status === 'active' && (
          <div className="space-y-3 my-6">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center">
              ✓ Your bids have been submitted successfully
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleUnlockBids}
                disabled={unlocking}
                className="flex-1 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 font-medium"
              >
                {unlocking ? 'Unlocking...' : 'Edit Bids'}
              </button>
              <button
                onClick={handleCopyToWhatsApp}
                disabled={bidCount === 0}
                className="flex-1 px-6 py-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Copy to WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {paginatedPlayers.map(player => (
            <div
              key={player.basePlayerId}
              className="rounded-xl bg-white/5 border border-white/10 p-4 relative"
            >
              {/* Star Button */}
              <button
                onClick={(e) => toggleStar(player.basePlayer.id, e)}
                disabled={starringInProgress.has(player.basePlayer.id)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-all disabled:opacity-50"
                title={starredPlayerIds.has(player.basePlayer.id) ? 'Unstar player' : 'Star player'}
              >
                {starredPlayerIds.has(player.basePlayer.id) ? (
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
                  disabled={round.status !== 'active' || isSubmitted || (maxBidsReached && !bids[player.basePlayerId])}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {bids[player.basePlayerId] > 0 && !isSubmitted && round.status === 'active' && (
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

        {/* Pagination - Bottom */}
        {filteredPlayers.length > playersPerPage && (
          <div className="mb-6">
            <PaginationControls />
          </div>
        )}

        {/* Actions */}
        {!isSubmitted && round.status === 'active' && (
          <div className="space-y-3">
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
                disabled={submitting || bidCount === 0 || !hasMaxBidsRequired}
                className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Bids'}
              </button>
            </div>
            {bidCount > 0 && (
              <button
                onClick={handleCopyToWhatsApp}
                className="w-full px-6 py-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Copy to WhatsApp
              </button>
            )}
            {!hasMaxBidsRequired && round.maxBidsPerTeam && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm text-center">
                ⚠️ You must place exactly {round.maxBidsPerTeam} bids to submit (Current: {bidCount})
              </div>
            )}
          </div>
        )}

        {isSubmitted && round.status === 'active' && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center">
              ✓ Your bids have been submitted successfully
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleUnlockBids}
                disabled={unlocking}
                className="flex-1 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 font-medium"
              >
                {unlocking ? 'Unlocking...' : 'Edit Bids'}
              </button>
              <button
                onClick={handleCopyToWhatsApp}
                disabled={bidCount === 0}
                className="flex-1 px-6 py-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Copy to WhatsApp
              </button>
            </div>
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border-2 border-[#25D366]/50 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white mb-2">Copied to Clipboard!</h3>
                <p className="text-[#D4CCBB] text-sm leading-relaxed">
                  Your bids have been copied to clipboard. You can now paste them in WhatsApp.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 text-[#25D366] font-bold transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
