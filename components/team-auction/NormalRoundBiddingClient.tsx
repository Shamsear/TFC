'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeForSearch } from '@/lib/search-utils'

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
  const [showStarredOnly, setShowStarredOnly] = useState(false)
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
  const hasLoadedInitial = useRef(false)
  const [localEndTime, setLocalEndTime] = useState<string | null>(round.endTime ? new Date(round.endTime).toISOString() : null)
  const [localStatus, setLocalStatus] = useState<string>(round.status)
  const [editBidModal, setEditBidModal] = useState<{ playerId: string; currentAmount: number; player: Player } | null>(null)
  const [editBidAmount, setEditBidAmount] = useState('')

  // Load starred players
  useEffect(() => {
    setStarredPlayerIds(new Set())
    const timestamp = Date.now()
    fetch(`/api/team/starred-players?seasonId=${round.season.id}&t=${timestamp}&teamId=${teamId}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.teamId !== teamId) {
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
  }, [round.season.id, teamName, teamId])

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
        const timestamp = Date.now();
        const response = await fetch(`/api/team/reserve-info?season_id=${round.season.id}&round_id=${round.id}&_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
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
  }, [round.season.id, round.id])

  // Load existing bids
  useEffect(() => {
    setBids(existingBids?.bids || {})
    hasLoadedInitial.current = true
  }, [round.id, teamId, existingBids])

  // Poll live round status
  useEffect(() => {
    const shouldPoll = localStatus === 'active' || round.status !== localStatus
    if (!shouldPoll) return

    const fetchLiveRoundStatus = async () => {
      try {
        const response = await fetch(`/api/auction/rounds/${round.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.round) {
            setLocalEndTime(data.round.endTime ? new Date(data.round.endTime).toISOString() : null)
            if (data.round.status !== 'active' && round.status === 'active') {
              setLocalStatus(data.round.status)
              window.location.reload()
              return
            }
            setLocalStatus(data.round.status)
          }
        }
      } catch (error) {
        console.error('Failed to fetch live round status:', error)
      }
    }

    const interval = setInterval(fetchLiveRoundStatus, 3000)
    return () => clearInterval(interval)
  }, [round.id, round.status, localStatus])

  // Timer countdown
  useEffect(() => {
    if (localStatus !== 'active' || !localEndTime) return
    let isExpired = false;

    const updateTimer = () => {
      if (isExpired) return;
      const now = new Date()
      const end = new Date(localEndTime)
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
  }, [localStatus, localEndTime])

  const handleBidChange = (playerId: string, amount: string) => {
    if (amount === '') {
      handleRemoveBid(playerId)
      return
    }
    const numAmount = parseInt(amount) || 0
    
    if (reserveInfo && numAmount > reserveInfo.maxBid) {
      setErrorModalMessage(`Bid £${numAmount.toLocaleString()} exceeds your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()} (required to maintain squad balance/reserve requirements).`)
      setShowErrorModal(true)
      return
    }
    
    const currentBidCount = Object.keys(bids).filter(k => bids[k] > 0).length
    const isNewBid = !bids[playerId] || bids[playerId] === 0
    
    if (isNewBid && numAmount > 0 && round.maxBidsPerTeam) {
      if (currentBidCount >= round.maxBidsPerTeam) {
        setErrorModalMessage(`Maximum ${round.maxBidsPerTeam} bids allowed. Remove a bid before adding a new one.`)
        setShowErrorModal(true)
        return
      }
    }
    
    if (numAmount === 0) {
      handleRemoveBid(playerId)
    } else {
      setBids(prev => ({
        ...prev,
        [playerId]: numAmount
      }))
    }
  }

  const handleBidBlur = (playerId: string, amount: string) => {
    const numAmount = parseInt(amount) || 0
    if (numAmount > 0) {
      const minAllowed = round.basePrice || 10
      if (numAmount < minAllowed) {
        const player = players.find(p => p.basePlayerId === playerId)
        setErrorModalMessage(`Bid amount for ${player?.basePlayer.name || 'this player'} is below the minimum allowed bid of £${minAllowed.toLocaleString()}.`)
        setShowErrorModal(true)
        return
      }

      const duplicateAmount = Object.entries(bids).find(
        ([pid, amt]) => pid !== playerId && amt === numAmount
      )
      if (duplicateAmount) {
        const duplicatePlayer = players.find(p => p.basePlayerId === duplicateAmount[0])
        setErrorModalMessage(`Amount £${numAmount.toLocaleString()} is already used for ${duplicatePlayer?.basePlayer.name || 'another player'}. Each bid must be unique.`)
        setShowErrorModal(true)
      }
    }
  }

  const handleRemoveBid = (playerId: string) => {
    setBids(prev => {
      const newBids = { ...prev }
      delete newBids[playerId]
      return newBids
    })
  }

  const handleEditBid = (playerId: string, currentAmount: number, player: Player) => {
    setEditBidModal({ playerId, currentAmount, player })
    setEditBidAmount(currentAmount.toString())
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const nonZeroBids = Object.entries(bids).filter(([_, amount]) => amount > 0)
      const amounts = nonZeroBids.map(([_, amount]) => amount)
      const uniqueAmounts = new Set(amounts)
      if (uniqueAmounts.size !== amounts.length) {
        const duplicates = amounts.filter((item, index) => amounts.indexOf(item) !== index)
        const duplicateList = Array.from(new Set(duplicates)).map(amount => `£${amount.toLocaleString()}`).join(', ')
        setErrorModalMessage(`Each bid must have a unique amount. The following amount(s) are duplicated: ${duplicateList}`)
        setShowErrorModal(true)
        setSaving(false)
        return
      }

      if (reserveInfo) {
        const exceedingBids = Object.entries(bids)
          .filter(([_, amount]) => amount > reserveInfo.maxBid)
          .map(([playerId]) => {
            const player = players.find(p => p.basePlayerId === playerId)
            return player?.basePlayer.name || 'Unknown'
          })
        if (exceedingBids.length > 0) {
          throw new Error(`The following bid(s) exceed your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()}: ${exceedingBids.join(', ')}`)
        }
      }

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
        body: JSON.stringify({ bids: bidArray, submitted: false })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors && Array.isArray(error.errors)) {
          const errorMsg = `${error.error || 'Validation failed'}:\n\n${error.errors.join('\n')}`
          setErrorModalMessage(errorMsg)
          setShowErrorModal(true)
          throw new Error(errorMsg)
        }
        throw new Error(error.error || 'Failed to save draft')
      }

      setMessage({ type: 'success', text: 'Draft bids saved successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    const minBidAmount = round.basePrice || 10
    const invalidBids = Object.entries(bids)
      .filter(([_, amount]) => amount > 0 && amount < minBidAmount)
      .map(([playerId]) => {
        const player = players.find(p => p.basePlayerId === playerId)
        return player?.basePlayer.name || 'Unknown'
      })

    if (invalidBids.length > 0) {
      setErrorModalMessage(
        `The following ${invalidBids.length === 1 ? 'bid is' : 'bids are'} below the minimum allowed bid of £${minBidAmount.toLocaleString()}:\n\n${invalidBids.join(', ')}\n\nPlease increase to at least £${minBidAmount.toLocaleString()}.`
      )
      setShowErrorModal(true)
      return
    }

    if (round.maxBidsPerTeam && bidCount < round.maxBidsPerTeam) {
      setErrorModalMessage(
        `You must place exactly ${round.maxBidsPerTeam} bids to submit.\n\nCurrent bids: ${bidCount}\nRequired: ${round.maxBidsPerTeam}`
      )
      setShowErrorModal(true)
      return
    }

    const nonZeroBids = Object.entries(bids).filter(([_, amount]) => amount > 0)
    const amounts = nonZeroBids.map(([_, amount]) => amount)
    const uniqueAmounts = new Set(amounts)
    if (uniqueAmounts.size !== amounts.length) {
      const duplicates = amounts.filter((item, index) => amounts.indexOf(item) !== index)
      const duplicateList = Array.from(new Set(duplicates)).map(amount => `£${amount.toLocaleString()}`).join(', ')
      setErrorModalMessage(`Each bid must have a unique amount. The following amount(s) are duplicated: ${duplicateList}`)
      setShowErrorModal(true)
      return
    }

    if (reserveInfo && reserveInfo.phase === 'phase_1' && reserveInfo.phase2MinBalance && reserveInfo.phase2Rounds) {
      const exceedingBids = Object.entries(bids)
        .filter(([_, amount]) => amount > reserveInfo.maxRecommendedBid)
        .map(([playerId, amount]) => {
          const player = players.find(p => p.basePlayerId === playerId)
          return { name: player?.basePlayer.name || 'Unknown', amount }
        })

      if (exceedingBids.length > 0) {
        const maxExceedingBid = Math.max(...exceedingBids.map(b => b.amount))
        const excess = maxExceedingBid - reserveInfo.maxRecommendedBid
        const skippedRounds = Math.ceil(excess / reserveInfo.phase2MinBalance)
        const participateRounds = Math.max(0, reserveInfo.phase2Rounds - skippedRounds)

        let warningMessage = ""
        if (participateRounds === 0) {
          warningMessage = `⚠️ Warning: Bidding £${maxExceedingBid.toLocaleString()} will leave you with insufficient budget to participate in any Phase 2 rounds. You will have to skip all Phase 2 rounds.\n\n`
        } else {
          const allowedBidForOne = reserveInfo.maxRecommendedBid + (reserveInfo.phase2Rounds - 1) * reserveInfo.phase2MinBalance
          warningMessage = `⚠️ Warning: Bidding £${maxExceedingBid.toLocaleString()} will leave you with sufficient budget to participate in only ${participateRounds} Phase 2 round(s). You will have to skip ${skippedRounds} Phase 2 round(s) (If you want to participate in at least one, you can only bid up to £${allowedBidForOne.toLocaleString()}).\n\n`
        }

        const confirmProceed = confirm(`${warningMessage}Are you sure you want to proceed with this submission?`)
        if (!confirmProceed) return
      }
    }

    if (!confirm('Are you sure you want to submit? You cannot change your bids after submission.')) {
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      if (reserveInfo) {
        const exceedingBids = Object.entries(bids)
          .filter(([_, amount]) => amount > reserveInfo.maxBid)
          .map(([playerId]) => {
            const player = players.find(p => p.basePlayerId === playerId)
            return player?.basePlayer.name || 'Unknown'
          })
        if (exceedingBids.length > 0) {
          throw new Error(`The following bid(s) exceed your maximum allowed bid of £${reserveInfo.maxBid.toLocaleString()}: ${exceedingBids.join(', ')}`)
        }
      }

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
        body: JSON.stringify({ bids: bidArray, submitted: true })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors && Array.isArray(error.errors)) {
          const errorMsg = `${error.error || 'Validation failed'}:\n\n${error.errors.join('\n')}`
          setErrorModalMessage(errorMsg)
          setShowErrorModal(true)
          throw new Error(errorMsg)
        }
        throw new Error(error.error || 'Failed to submit bids')
      }

      setIsSubmitted(true)
      setMessage({ type: 'success', text: 'Bids submitted successfully!' })
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
      .sort((a, b) => b.amount - a.amount)

    if (bidEntries.length === 0) {
      alert('No bids to copy')
      return
    }

    const positionText = round.position 
      ? `${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}`
      : 'All Positions'

    const messageText = `*${round.season.name}*

*Round ${round.roundNumber} Bids*

*Position:* ${positionText}
*Team:* ${teamName || 'Your Team'}

*Bids:*
${bidEntries.map((bid, idx) => `${idx + 1}. ${bid.name} - £${bid.amount.toLocaleString()}`).join('\n')}`

    navigator.clipboard.writeText(messageText).then(() => {
      setShowSuccessModal(true)
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  const filteredPlayers = players
    .filter(p =>
      normalizeForSearch(p.basePlayer.name).includes(normalizeForSearch(searchQuery)) &&
      (playingStyleFilter === 'all' || p.playing_style === playingStyleFilter) &&
      (!showStarredOnly || starredPlayerIds.has(p.basePlayer.id))
    )
    .sort((a, b) => {
      const aStarred = starredPlayerIds.has(a.basePlayer.id)
      const bStarred = starredPlayerIds.has(b.basePlayer.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return b.overallRating - a.overallRating
    })

  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, playingStyleFilter])

  const playingStyles = Array.from(new Set(players.map(p => p.playing_style).filter(Boolean))) as string[]

  const totalBidAmount = Object.values(bids).reduce((sum, amount) => sum + amount, 0)
  const bidCount = Object.keys(bids).filter(k => bids[k] > 0).length
  const totalBidsInList = Object.keys(bids).filter(k => bids[k] !== undefined).length
  const maxBidsReached = round.maxBidsPerTeam ? bidCount >= round.maxBidsPerTeam : false
  const hasMaxBidsRequired = round.maxBidsPerTeam ? bidCount === round.maxBidsPerTeam : true

  const duplicateAmounts = new Set<number>()
  const seenAmounts = new Set<number>()
  Object.values(bids).forEach(amount => {
    if (amount > 0) {
      if (seenAmounts.has(amount)) {
        duplicateAmounts.add(amount)
      }
      seenAmounts.add(amount)
    }
  })

  const getPositionBadgeClass = (pos: string) => {
    const p = pos.toUpperCase()
    if (p.includes('GK')) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    if (p.includes('DEF') || p.includes('CB') || p.includes('LB') || p.includes('RB')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    }
    if (p.includes('MID') || p.includes('CM') || p.includes('CMF') || p.includes('AMF') || p.includes('DMF') || p.includes('LM') || p.includes('RM')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }
    return 'bg-red-500/10 text-red-400 border border-red-500/20'
  }

  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages = []
      const maxVisible = 5
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i)
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
        } else {
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
      <div className="rounded-2xl bg-neutral-900/40 border border-white/10 p-4 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="text-xs text-gray-400 text-center sm:text-left">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} of {filteredPlayers.length}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-white hover:bg-white/[0.08] hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              ← Prev
            </button>
            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-600">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`px-3.5 py-2 rounded-xl font-black transition-all text-xs min-w-[36px] cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#E8A800] text-black shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                      : 'bg-white/[0.02] border border-white/5 text-white hover:bg-white/[0.08] hover:border-white/10'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-white hover:bg-white/[0.08] hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 relative overflow-hidden font-sans">
      {/* Background spotlights */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header Panel */}
      <div className="relative border-b border-white/[0.06] bg-black/40 backdrop-blur-xl z-10 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Bidding Chambers</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-1">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
                  Round {round.roundNumber} Bidding
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 font-mono font-bold uppercase tracking-wider">
                {round.season.name} {round.position && `— ${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}`}
              </p>
            </div>

            {timeRemaining && (
              <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.08)] flex flex-col justify-center min-w-[150px]">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono mb-0.5">Time Remaining</div>
                <div className="text-xl font-bold font-mono text-emerald-300 animate-pulse">{timeRemaining}</div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">Available Purse</div>
              <div className="text-lg font-black text-emerald-400 font-mono">£{budget.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">Bids Placed</div>
              <div className={`text-lg font-black font-mono ${maxBidsReached ? 'text-red-400' : 'text-white'}`}>
                {bidCount} / {round.maxBidsPerTeam || '∞'}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">Total Bid Value</div>
              <div className="text-lg font-black text-[#E8A800] font-mono">£{totalBidAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">Submission Status</div>
              <div className={`text-lg font-black uppercase tracking-wider text-xs ${isSubmitted ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                {isSubmitted ? 'Submitted' : 'Draft'}
              </div>
            </div>
          </div>

          {/* Reserve Warning Cabinet */}
          {reserveInfo && (
            <div className={`mt-6 rounded-2xl border p-5 backdrop-blur-xl relative overflow-hidden ${
              reserveInfo.phase === 'phase_1' 
                ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                : reserveInfo.phase === 'phase_2'
                ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                : 'bg-blue-500/5 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  reserveInfo.phase === 'phase_1' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : reserveInfo.phase === 'phase_2'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${
                    reserveInfo.phase === 'phase_1' ? 'text-red-400' : reserveInfo.phase === 'phase_2' ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    Purse Reserve Endorsement — {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
                  </h3>
                  
                  <div className="mt-3.5 space-y-2 text-xs text-gray-300 font-medium">
                    <p>Required Floor Reserve: <strong className="text-white font-mono">£{reserveInfo.floorReserve.toLocaleString()}</strong></p>
                    <p>Maximum Single Player Bid Cap: <strong className="text-[#E8A800] font-mono">£{reserveInfo.maxBid.toLocaleString()}</strong></p>
                    
                    {reserveInfo.phase === 'phase_1' && reserveInfo.phase2MinBalance && reserveInfo.phase2Rounds && (
                      <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2 font-mono">
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Phase 2 Skippability Options:</p>
                        <p className="text-emerald-400">
                          • Endorse all Phase 2 rounds: Bid limit £{reserveInfo.maxRecommendedBid.toLocaleString()}
                        </p>
                        {Array.from({ length: reserveInfo.phase2Rounds - 1 }).map((_, i) => {
                          const pRounds = reserveInfo.phase2Rounds! - 1 - i
                          const allowedBid = reserveInfo.maxRecommendedBid + (i + 1) * reserveInfo.phase2MinBalance!
                          return (
                            <p key={pRounds} className="text-amber-400">
                              • Skip {i + 1} rounds (participate in {pRounds}): Bid limit £{allowedBid.toLocaleString()}
                            </p>
                          )
                        })}
                        <p className="text-red-400">
                          • Skip all Phase 2 rounds: Bid limit £{reserveInfo.maxBid.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {reserveInfo.phase === 'phase_2' && (
                      <>
                        <p>Recommended Max Bid: <strong className="text-amber-400 font-mono">£{reserveInfo.maxRecommendedBid.toLocaleString()}</strong></p>
                        {reserveInfo.breakdown.phase2Reserve !== undefined && reserveInfo.breakdown.phase3Reserve !== undefined && (
                          <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2 font-mono">
                            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Reserve Breakdown Details:</p>
                            <p className="text-emerald-400">
                              • Participate in all remaining Phase 2: Reserve £{reserveInfo.reserve.toLocaleString()} = {reserveInfo.breakdown.phase2Reserve > 0 ? `Phase 2 (£${reserveInfo.breakdown.phase2Reserve.toLocaleString()})` : ''}{reserveInfo.breakdown.phase2Reserve > 0 && reserveInfo.breakdown.phase3Reserve > 0 ? ' + ' : ''}{reserveInfo.breakdown.phase3Reserve > 0 ? `Phase 3 (£${reserveInfo.breakdown.phase3Reserve.toLocaleString()})` : ''}
                            </p>
                            <p className="text-red-400">
                              • Skip remaining Phase 2: Reserve £{reserveInfo.floorReserve.toLocaleString()} (Phase 3 only)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-gray-500 mt-2 font-mono leading-relaxed">{reserveInfo.calculation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border font-mono text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Collapsible active bids board */}
        {totalBidsInList > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowBiddedPlayers(!showBiddedPlayers)}
              className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-neutral-900/40 border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer backdrop-blur-xl"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/25 flex items-center justify-center flex-shrink-0 text-[#E8A800]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-black text-white text-sm">Your Active Bids ({totalBidsInList})</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                    {bidCount > 0 ? `Cumulative Commit: £${totalBidAmount.toLocaleString()}` : 'Enter bidding sums below'}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showBiddedPlayers ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBiddedPlayers && (
              <div className="mt-3.5 space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
                {Object.entries(bids)
                  .filter(([_, amount]) => amount > 0)
                  .map(([playerId, amount]) => {
                    const player = players.find(p => p.basePlayerId === playerId)
                    return { playerId, amount, player }
                  })
                  .filter(item => item.player !== undefined)
                  .sort((a, b) => b.amount - a.amount)
                  .map(({ playerId, amount, player }) => {
                    if (!player) return null

                    return (
                      <div
                        key={playerId}
                        className="rounded-2xl bg-[#0b0b0e]/70 border border-white/[0.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-white/10 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/[0.08] flex-shrink-0">
                            <img
                              src={player.basePlayer.photoUrl}
                              alt={player.basePlayer.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{player.basePlayer.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPositionBadgeClass(player.position)}`}>
                                {player.position}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono font-semibold">OVR {player.overallRating}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t border-white/[0.04] sm:border-t-0">
                          <div className="font-mono">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-0.5">Your Bid Amount</span>
                            <div className={`text-base font-black ${duplicateAmounts.has(amount) ? 'text-red-400' : 'text-[#E8A800]'}`}>
                              £{amount.toLocaleString()}
                            </div>
                            {duplicateAmounts.has(amount) && (
                              <div className="text-[9px] text-red-400 font-bold uppercase tracking-wide mt-1">⚠️ Duplicate bid amount</div>
                            )}
                          </div>
                          
                          {!isSubmitted && round.status === 'active' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditBid(playerId, amount, player)}
                                className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveBid(playerId)}
                                className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all cursor-pointer"
                                title="Remove bid"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-white/[0.04] pb-4">
            <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">Available Player Market</h2>
            {(searchQuery !== '' || playingStyleFilter !== 'all' || showStarredOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setPlayingStyleFilter('all')
                  setShowStarredOnly(false)
                }}
                className="px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all flex items-center gap-1.5 w-fit cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="space-y-5">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search base players by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-[#E8A800]/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E8A800]/30 transition-all duration-300"
              />
              <svg className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Playing Style Filter Pill Buttons */}
            {playingStyles.length > 0 && (
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-2">Filter by Playing Style</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPlayingStyleFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      playingStyleFilter === 'all'
                        ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-[0_0_12px_rgba(232,168,0,0.2)]'
                        : 'bg-white/[0.02] border-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/10'
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          playingStyleFilter === style
                            ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-[0_0_12px_rgba(232,168,0,0.2)]'
                            : 'bg-white/[0.02] border-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/10'
                        }`}
                      >
                        {style} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Starred Players checkbox toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer w-fit select-none group">
                <input
                  type="checkbox"
                  checked={showStarredOnly}
                  onChange={(e) => setShowStarredOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-gray-400 group-hover:text-white font-semibold transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#E8A800]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Isolate Bookmarked Stars Only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Pagination controls top */}
        {filteredPlayers.length > playersPerPage && <div className="mb-6"><PaginationControls /></div>}

        {/* Global Action Bar */}
        {!isSubmitted && round.status === 'active' && (
          <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl mb-6 space-y-3.5">
            <div className="flex gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/15 hover:border-white/30 text-white hover:bg-white/[0.06] transition-all disabled:opacity-40 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                {saving ? 'Saving Draft...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || bidCount === 0 || !hasMaxBidsRequired}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_25px_rgba(232,168,0,0.15)] hover:scale-[1.01]"
              >
                {submitting ? 'Transmitting Bids...' : 'Submit Bids'}
              </button>
            </div>
            {bidCount > 0 && (
              <button
                onClick={handleCopyToWhatsApp}
                className="w-full px-5 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(37,211,102,0.05)]"
              >
                Copy Format to WhatsApp
              </button>
            )}
            {!hasMaxBidsRequired && round.maxBidsPerTeam && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider font-mono text-center animate-pulse">
                ⚠️ Bid requirement: Exactly {round.maxBidsPerTeam} bids required (Currently {bidCount} placed)
              </div>
            )}
          </div>
        )}

        {isSubmitted && round.status === 'active' && (
          <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl mb-6 space-y-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono text-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              ✓ Bids successfully submitted and sealed in the draft vault
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleUnlockBids}
                disabled={unlocking}
                className="flex-1 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/25 transition-all disabled:opacity-40 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                {unlocking ? 'Unlocking Bids...' : 'Unlock & Edit Bids'}
              </button>
              <button
                onClick={handleCopyToWhatsApp}
                disabled={bidCount === 0}
                className="flex-1 px-5 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-all disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(37,211,102,0.05)]"
              >
                Copy Format to WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Available Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-6">
          {paginatedPlayers.map(player => (
            <div
              key={player.basePlayerId}
              className="rounded-2xl bg-[#0b0b0d]/80 border border-white/5 hover:border-white/20 transition-all duration-300 p-4.5 relative overflow-hidden group shadow-lg flex flex-col justify-between"
            >
              {/* Star bookmark Button */}
              <button
                onClick={(e) => toggleStar(player.basePlayer.id, e)}
                disabled={starringInProgress.has(player.basePlayer.id)}
                className="absolute top-3.5 right-3.5 z-10 p-2 rounded-xl bg-black/60 border border-white/[0.08] hover:bg-black/80 hover:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
                title={starredPlayerIds.has(player.basePlayer.id) ? 'Unstar player' : 'Star player'}
              >
                {starredPlayerIds.has(player.basePlayer.id) ? (
                  <svg className="w-4 h-4 text-[#E8A800] fill-current animate-scale-up" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>

              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-white/[0.08] flex-shrink-0 relative">
                    <img
                      src={player.basePlayer.photoUrl}
                      alt={player.basePlayer.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <h3 className="font-black text-white text-sm truncate leading-tight mb-1">{player.basePlayer.name}</h3>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono font-bold uppercase tracking-wider">
                      <span className={`px-1.5 py-0.5 rounded ${getPositionBadgeClass(player.position)}`}>
                        {player.position}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/5">
                        OVR {player.overallRating}
                      </span>
                    </div>
                    {player.playing_style && (
                      <div className="text-[10px] text-gray-500 font-mono truncate mt-1">{player.playing_style}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3.5 border-t border-white/[0.04]">
                  <div className="flex-1">
                    <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-1">Bid Offer</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-mono">£</span>
                      <input
                        type="number"
                        placeholder={`Min £${round.basePrice?.toLocaleString() || 0}`}
                        value={bids[player.basePlayerId] || ''}
                        onChange={(e) => handleBidChange(player.basePlayerId, e.target.value)}
                        onBlur={(e) => handleBidBlur(player.basePlayerId, e.target.value)}
                        disabled={round.status !== 'active' || isSubmitted || (maxBidsReached && !bids[player.basePlayerId])}
                        className={`w-full pl-6 pr-3 py-2 rounded-xl bg-black/40 text-xs font-mono text-white placeholder-gray-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed border ${
                          duplicateAmounts.has(bids[player.basePlayerId])
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/[0.08] focus:border-[#E8A800]/50'
                        }`}
                      />
                    </div>
                    {duplicateAmounts.has(bids[player.basePlayerId]) && (
                      <div className="text-[8px] text-red-400 font-bold uppercase tracking-wider font-mono mt-1">⚠️ Duplicate bid amount</div>
                    )}
                  </div>
                  
                  {bids[player.basePlayerId] > 0 && !isSubmitted && round.status === 'active' && (
                    <button
                      onClick={() => handleRemoveBid(player.basePlayerId)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination controls bottom */}
        {filteredPlayers.length > playersPerPage && <div className="mb-6"><PaginationControls /></div>}

        {/* Actions bottom */}
        {!isSubmitted && round.status === 'active' && (
          <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl mb-6 space-y-3.5">
            <div className="flex gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/15 hover:border-white/30 text-white hover:bg-white/[0.06] transition-all disabled:opacity-40 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                {saving ? 'Saving Draft...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || bidCount === 0 || !hasMaxBidsRequired}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_25px_rgba(232,168,0,0.15)] hover:scale-[1.01]"
              >
                {submitting ? 'Transmitting Bids...' : 'Submit Bids'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error dialog Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0f0f12] border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-400">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">Invalid Bid Propose</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed whitespace-pre-line font-medium uppercase font-mono">
                  {errorModalMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-5 py-3 rounded-xl bg-red-500/15 border border-red-500/20 hover:bg-red-500/25 text-red-400 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Understand & Adjust
            </button>
          </div>
        </div>
      )}

      {/* Edit Bid dialog Modal */}
      {editBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0f0f12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">Modify Active Bid</h3>
            <p className="text-xs text-gray-400 mt-1 mb-5 leading-normal uppercase">
              Update draft bid for {editBidModal.player.basePlayer.name}
            </p>
            <div className="mb-6">
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">New Bid Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">£</span>
                <input
                  type="number"
                  min="0"
                  value={editBidAmount}
                  onChange={(e) => setEditBidAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-black/40 border border-white/[0.08] focus:border-[#E8A800]/50 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]/30 transition-all duration-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                onClick={() => setEditBidModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleBidChange(editBidModal.playerId, editBidAmount)
                  handleBidBlur(editBidModal.playerId, editBidAmount)
                  setEditBidModal(null)
                }}
                className="px-4 py-2.5 rounded-xl bg-[#E8A800] text-black font-black hover:opacity-90 transition-all cursor-pointer shadow-[0_0_15px_rgba(232,168,0,0.2)]"
              >
                Confirm Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success copy dialog Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0f0f12] border border-emerald-500/20 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">Copied to Clipboard!</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed uppercase">
                  Your active bids have been formatted and copied to clipboard. You can now paste the results into WhatsApp!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-500/25 text-emerald-400 text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  )
}
