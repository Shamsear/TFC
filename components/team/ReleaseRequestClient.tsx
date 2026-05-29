'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'

interface Player {
  id: string
  name: string
  playerId: string | null
  position: string
  positionGroup: string | null
  overall: number
  club: string
  playingStyle: string | null
  soldPrice: number
}

interface ExistingRequest {
  id: string
  playerId: string
  playerName: string
  refundAmount: number
  notes: string | null
  status: string | null
  submittedAt: string
  processedAt?: string | null
  rejectionReason?: string | null
}

interface Props {
  seasonId: string
  releaseWindowId: string
  teamId: string
  teamName: string
  currentBudget: number
  currentSlots: number
  maxSlots: number
  players: Player[]
  existingRequests: ExistingRequest[]
  allRequests: ExistingRequest[]
  totalRequestsCount: number
  approvedReleasesCount: number
  maxReleases: number
  remainingRequests: number
  remainingApprovals: number
}

// Custom Select Component
function CustomSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  displayValue,
  enableSearch = false
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
  displayValue?: (val: string) => string
  enableSearch?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && enableSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen, enableSearch])

  const filteredOptions = enableSearch && searchQuery
    ? options.filter(option => {
        const searchLower = searchQuery.toLowerCase()
        const optionLower = option.toLowerCase()
        const displayLower = displayValue ? displayValue(option).toLowerCase() : optionLower
        return optionLower.includes(searchLower) || displayLower.includes(searchLower)
      })
    : options

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/5 text-white focus:border-[#E8A800]/30 focus:outline-none transition-all text-xs font-mono text-left cursor-pointer"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/5 shadow-2xl py-2 font-mono scrollbar-none animate-[fadeIn_0.2s_ease-out]">
          {enableSearch && (
            <div className="px-3 pb-2 pt-1 border-b border-white/[0.04]">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter parameters..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none text-[10px] focus:border-[#E8A800]/30 font-mono"
                  onClick={(e) => e.stopPropagation()}
                />
                <svg 
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-[10px] text-gray-600 text-center font-bold uppercase tracking-wider">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option === value
                
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option)
                      setIsOpen(false)
                      setSearchQuery('')
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] cursor-pointer ${
                      isSelected ? 'text-[#E8A800] bg-white/[0.02] font-black' : 'text-gray-400'
                    }`}
                  >
                    <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const formatCurrency = (amount: number) => {
  return `£${(amount).toLocaleString()}`
}

export default function ReleaseRequestClient({
  seasonId,
  releaseWindowId,
  teamId,
  teamName,
  currentBudget,
  currentSlots,
  maxSlots,
  players,
  existingRequests: initialRequests,
  allRequests: initialAllRequests,
  totalRequestsCount: initialTotalCount,
  approvedReleasesCount: initialApprovedCount,
  maxReleases,
  remainingRequests: initialRemainingRequests,
  remainingApprovals: initialRemainingApprovals,
}: Props) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [styleFilter, setStyleFilter] = useState('ALL')
  const [positionGroupFilter, setPositionGroupFilter] = useState('ALL')
  const [existingRequests, setExistingRequests] = useState(initialRequests)
  const [allRequests, setAllRequests] = useState(initialAllRequests)
  const [totalRequestsCount, setTotalRequestsCount] = useState(initialTotalCount)
  const [approvedReleasesCount, setApprovedReleasesCount] = useState(initialApprovedCount)
  const [remainingRequests, setRemainingRequests] = useState(initialRemainingRequests)
  const [remainingApprovals, setRemainingApprovals] = useState(initialRemainingApprovals)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [whatsappText, setWhatsappText] = useState('')
  const [isSelectedListExpanded, setIsSelectedListExpanded] = useState(true)

  // Get unique positions, groups, and styles
  const positions = ['ALL', ...Array.from(new Set(players.map(p => p.position))).sort()]
  const positionGroups = ['ALL', ...Array.from(new Set(players.map(p => p.positionGroup).filter(Boolean) as string[])).sort()]
  const styles = ['ALL', ...Array.from(new Set(players.map(p => p.playingStyle).filter(Boolean) as string[])).sort()]

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Exclude players already in pending requests
      if (existingRequests.some(req => req.playerId === player.id)) {
        return false
      }

      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      const matchesGroup = positionGroupFilter === 'ALL' || player.positionGroup === positionGroupFilter
      const matchesStyle = styleFilter === 'ALL' || player.playingStyle === styleFilter
      
      return matchesSearch && matchesPosition && matchesGroup && matchesStyle
    })
  }, [players, searchQuery, positionFilter, positionGroupFilter, styleFilter, existingRequests])

  // Calculate totals (Pound (£) symbol preserved)
  const selectedPlayersList = players.filter(p => selectedPlayers.has(p.id))
  const totalRefund = selectedPlayersList.reduce((sum, p) => sum + p.soldPrice, 0)
  const slotsFreed = selectedPlayers.size
  const newBudget = currentBudget + totalRefund

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      // Check if adding this player would exceed the REQUEST limit
      if (newSelected.size >= remainingRequests) {
        alert(`You can only submit ${remainingRequests} more release request${remainingRequests !== 1 ? 's' : ''} (${totalRequestsCount}/${maxReleases} requests used)`)
        return
      }
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const handleSubmit = async () => {
    if (selectedPlayers.size === 0) {
      alert('Please select at least one player to release')
      return
    }

    if (selectedPlayers.size > remainingRequests) {
      alert(`You can only submit ${remainingRequests} more release request${remainingRequests !== 1 ? 's' : ''}. You have already submitted ${totalRequestsCount}/${maxReleases} requests.`)
      return
    }

    setIsSubmitting(true)
    try {
      const releases = selectedPlayersList.map(player => ({
        playerId: player.id,
        playerName: player.name,
        refundAmount: player.soldPrice,
        notes: '',
      }))

      const response = await fetch('/api/team/release-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId,
          releaseWindowId,
          releases,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit release request')
      }

      const data = await response.json()
      const message = generateWhatsAppMessage()
      setWhatsappText(message)
      
      setTotalRequestsCount(totalRequestsCount + releases.length)
      setRemainingRequests(remainingRequests - releases.length)
      
      setExistingRequests([...existingRequests, ...data.requests])
      setAllRequests([...allRequests, ...data.requests])
      setSelectedPlayers(new Set())
      setShowSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Failed to submit release request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return
    }

    try {
      const response = await fetch(`/api/team/release-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel request')
      }

      setTotalRequestsCount(totalRequestsCount - 1)
      setRemainingRequests(remainingRequests + 1)
      
      setExistingRequests(existingRequests.filter(req => req.id !== requestId))
      setAllRequests(allRequests.filter(req => req.id !== requestId))
    } catch (error: any) {
      alert(error.message || 'Failed to cancel request')
    }
  }

  const generateWhatsAppMessage = () => {
    const playerList = selectedPlayersList
      .map(p => `${p.name} (£${p.soldPrice.toLocaleString()})`)
      .join('\n')
    
    return `🔴 *Release Request - ${teamName}*\n\n*Players:*\n${playerList}\n\n*Total Refund:* £${totalRefund.toLocaleString()}\n*Slots Freed:* ${slotsFreed}\n*New Budget:* £${newBudget.toLocaleString()}\n*New Slots:* ${currentSlots - slotsFreed}/${maxSlots}`
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-8 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
              Release Request
            </span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
            Select roster assets to submit for contract termination and fund liquidation
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">

        {/* Release Limit Banner - Dual Tracking */}
        <div className={`mb-8 rounded-3xl p-5 sm:p-6 border ${
          remainingRequests === 0 
            ? 'bg-red-950/15 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]' 
            : remainingRequests <= 1 
            ? 'bg-amber-950/10 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)]'
            : 'bg-cyan-950/[0.1] border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                remainingRequests === 0 ? 'bg-red-500/10' : remainingRequests <= 1 ? 'bg-yellow-500/10' : 'bg-cyan-500/10'
              }`}>
                <svg className={`w-6 h-6 ${
                  remainingRequests === 0 ? 'text-red-400' : remainingRequests <= 1 ? 'text-yellow-400' : 'text-cyan-400'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Roster Release Quotas</h3>
                <p className={`text-xs mt-1 font-mono uppercase tracking-wide font-bold ${
                  remainingRequests === 0 ? 'text-red-400' : remainingRequests <= 1 ? 'text-yellow-400' : 'text-cyan-400'
                }`}>
                  {remainingRequests === 0 
                    ? `Season request quotas exhausted`
                    : `${remainingRequests} of ${maxReleases} request slots remaining`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 font-mono">
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Total Requests</div>
                <div className={`text-xl font-black mt-0.5 ${
                  totalRequestsCount >= maxReleases ? 'text-red-400' : 'text-white'
                }`}>
                  {totalRequestsCount} <span className="text-xs text-gray-500 font-normal">/ {maxReleases}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Approved</div>
                <div className={`text-xl font-black mt-0.5 ${
                  approvedReleasesCount >= maxReleases ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {approvedReleasesCount} <span className="text-xs text-gray-500 font-normal">/ {maxReleases}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show message if limit reached */}
        {remainingRequests === 0 && (
          <div className="mb-8 rounded-3xl bg-red-950/15 border border-red-500/20 p-8 text-center shadow-lg">
            <svg className="w-14 h-14 text-red-500/80 mx-auto mb-4 animate-[pulse_2s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono mb-2">Quotas Mapped Out</h2>
            <p className="text-gray-400 text-xs leading-relaxed max-w-md mx-auto font-medium">
              You have submitted the maximum {maxReleases} release requests allowable this season. No further release request payloads will be accepted.
            </p>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#0c0c0e]/95 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">Payload Transmitted!</h3>
                <p className="text-gray-400 text-xs mt-1"> Roster releases queued for administrative authorization</p>
              </div>

              <div className="bg-black/50 border border-white/5 rounded-2xl p-4.5 mb-5 relative">
                <pre className="text-[10px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{whatsappText}</pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToWhatsApp}
                  className="flex-1 px-5 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(37,211,102,0.2)]"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Copy Clip to WhatsApp</span>
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="px-5 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Stats Summary */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#0c0c0e]/80 border border-white/5 p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Manager Budget</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono leading-tight">{formatCurrency(currentBudget)}</div>
          </div>
          <div className="rounded-2xl bg-[#0c0c0e]/80 border border-white/5 p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Squad Assets</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">{currentSlots} <span className="text-xs text-gray-500 font-normal">Players</span></div>
          </div>
          <div className="rounded-2xl bg-[#0c0c0e]/80 border border-white/5 p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB347]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Roster Allocations</div>
            <div className="text-xl sm:text-2xl font-black text-[#FFB347] font-mono leading-tight">
              {currentSlots} <span className="text-xs text-gray-500 font-normal">/ {maxSlots} max</span>
            </div>
          </div>
        </div>

        {/* All Requests - Show all statuses */}
        {allRequests.length > 0 && (
          <div className="mb-8 rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800]" />
              Submission Log
            </h2>
            <div className="space-y-3.5">
              {allRequests.map(req => {
                const isPending = req.status === 'pending'
                const isApproved = req.status === 'approved'
                const isRejected = req.status === 'rejected'
                
                return (
                  <div key={req.id} className={`flex items-center justify-between rounded-2xl p-4.5 border relative overflow-hidden ${
                    isPending ? 'bg-cyan-950/[0.1] border-cyan-500/20' :
                    isApproved ? 'bg-emerald-950/[0.15] border-emerald-500/20' :
                    'bg-red-950/15 border-red-500/20'
                  }`}>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="font-bold text-sm text-white">{req.playerName}</div>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono border ${
                          isPending ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {req.status ? req.status.toUpperCase() : ''}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider">
                        Refund: {formatCurrency(req.refundAmount)}
                        {req.processedAt && ` • Settled: ${new Date(req.processedAt).toLocaleDateString()}`}
                      </div>
                      {isRejected && req.rejectionReason && (
                        <div className="mt-2 text-xs text-red-400/90 font-mono">
                          Rejection Reason: {req.rejectionReason}
                        </div>
                      )}
                    </div>
                    {isPending && (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Players List - Collapsible */}
        {selectedPlayers.size > 0 && (
          <div className="mb-8 rounded-3xl bg-[#E8A800]/5 border border-[#E8A800]/25 overflow-hidden shadow-lg">
            {/* Header - Always Visible */}
            <div 
              className="p-5 cursor-pointer hover:bg-[#E8A800]/10 transition-colors"
              onClick={() => setIsSelectedListExpanded(!isSelectedListExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">Liquidating Assets ({selectedPlayers.size})</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg text-xs text-[#E8A800] font-black font-mono">
                      +{formatCurrency(totalRefund)} Fund
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-[#E8A800] transition-transform duration-300 ${isSelectedListExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expandable Content */}
            {isSelectedListExpanded && (
              <div className="px-6 pb-6">
                {/* Players List */}
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
                  {selectedPlayersList.map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-2xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                            alt={player.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{player.name}</div>
                          <div className="text-[9px] text-gray-500 font-bold font-mono uppercase mt-0.5">{player.position} <span className="text-gray-700">•</span> OVR {player.overall}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className="text-xs font-black text-[#E8A800]">{formatCurrency(player.soldPrice)}</div>
                        </div>
                        <button
                          onClick={() => togglePlayer(player.id)}
                          className="w-7 h-7 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5 p-4.5 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs">
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">Liquidations</div>
                    <div className="text-base font-black text-white mt-1">{selectedPlayers.size} assets</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">Expected Refund</div>
                    <div className="text-base font-black text-[#E8A800] mt-1">{formatCurrency(totalRefund)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">Expected Purse</div>
                    <div className="text-base font-black text-emerald-400 mt-1">{formatCurrency(newBudget)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">Slots Roster</div>
                    <div className="text-base font-black text-white mt-1">{currentSlots} / {maxSlots}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">Projected Slots</div>
                    <div className="text-base font-black text-blue-400 mt-1">{currentSlots - slotsFreed} / {maxSlots}</div>
                  </div>
                </div>

                {/* Warning if exceeds limit */}
                {selectedPlayers.size > remainingRequests && (
                  <div className="mb-5 p-4.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <div className="font-black text-xs text-red-400 uppercase tracking-wider font-mono mb-1">Quota Boundary Violation</div>
                        <div className="text-[10px] text-red-300 font-medium leading-relaxed uppercase">
                          You selected {selectedPlayers.size} players, exceeding the {remainingRequests} request slots available. Deselect {selectedPlayers.size - remainingRequests} candidates to proceed.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedPlayers.size > remainingRequests}
                  className="w-full px-6 py-4 bg-[#E8A800] hover:brightness-110 text-[#0a0a0a] rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(232,168,0,0.2)] hover:scale-[1.01]"
                >
                  {isSubmitting 
                    ? 'Transmitting Contract Releases...' 
                    : selectedPlayers.size > remainingRequests
                    ? `Exceeds quota (${remainingRequests} left)`
                    : 'Submit Release Request'
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono mb-2">Search Name</label>
            <input
              type="text"
              placeholder="Search squad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
            />
          </div>
          <CustomSelect
            label="Filter Position"
            value={positionFilter}
            options={positions}
            onChange={setPositionFilter}
            displayValue={(val) => val === 'ALL' ? 'All Roles' : val}
          />
          <CustomSelect
            label="Filter Sector"
            value={positionGroupFilter}
            options={positionGroups}
            onChange={setPositionGroupFilter}
            displayValue={(val) => val === 'ALL' ? 'All Sectors' : val}
          />
          <CustomSelect
            label="Filter Style"
            value={styleFilter}
            options={styles}
            onChange={setStyleFilter}
            displayValue={(val) => val === 'ALL' ? 'All Styles' : val}
            enableSearch={true}
          />
        </div>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#0c0c0e]/80 border border-white/5 backdrop-blur-2xl">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider font-bold">No assets found matching filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlayers.map(player => {
              const isSelected = selectedPlayers.has(player.id)
              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`rounded-2xl p-4.5 cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-lg flex flex-col justify-between border-2 ${
                    isSelected
                      ? 'bg-[#E8A800]/5 border-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                      : 'bg-[#0c0c0e]/80 border-white/5 hover:border-[#E8A800]/40 hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-15 h-15 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                      <Image
                        src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                        alt={player.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-black text-white text-xs truncate leading-tight mb-1.5">{player.name}</h3>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono font-bold uppercase tracking-wider mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/5">{player.position}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/5">OVR {player.overall}</span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono truncate leading-none">{player.club}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.04] bg-white/[0.005] -mx-4.5 -mb-4.5 p-4.5 rounded-b-2xl">
                    <div>
                      <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Expected Refund</div>
                      <div className="text-base font-black text-[#E8A800] mt-0.5 font-mono">{formatCurrency(player.soldPrice)}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-emerald-500 border border-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
