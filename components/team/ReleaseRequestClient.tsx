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
  status: string
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
      <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base text-left"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)]">
          {enableSearch && (
            <div className="p-2 border-b border-white/10">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <svg 
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No results found
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
                    className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] ${
                      isSelected ? 'text-[#E8A800] bg-[#E8A800]/5 font-bold' : 'text-gray-300'
                    }`}
                  >
                    <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

  // Calculate totals
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

    // Check if this would exceed the REQUEST limit
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
      
      // Generate WhatsApp message
      const message = generateWhatsAppMessage()
      setWhatsappText(message)
      
      // Update counts
      setTotalRequestsCount(totalRequestsCount + releases.length)
      setRemainingRequests(remainingRequests - releases.length)
      
      // Update existing requests
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

      // Update counts
      setTotalRequestsCount(totalRequestsCount - 1)
      setRemainingRequests(remainingRequests + 1)
      
      // Update request lists
      setExistingRequests(existingRequests.filter(req => req.id !== requestId))
      setAllRequests(allRequests.filter(req => req.id !== requestId))
    } catch (error: any) {
      alert(error.message || 'Failed to cancel request')
    }
  }

  const generateWhatsAppMessage = () => {
    const playerList = selectedPlayersList
      .map(p => `${p.name} ($${p.soldPrice.toLocaleString()})`)
      .join('\n')
    
    return `🔴 *Release Request - ${teamName}*\n\n*Players:*\n${playerList}\n\n*Total Refund:* $${totalRefund.toLocaleString()}\n*Slots Freed:* ${slotsFreed}\n*New Budget:* $${newBudget.toLocaleString()}\n*New Slots:* ${currentSlots - slotsFreed}/${maxSlots}`
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Release Request
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">Select players to request for release</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Release Limit Banner - Dual Tracking */}
        <div className={`mb-6 rounded-xl p-4 sm:p-6 border-2 ${
          remainingRequests === 0 
            ? 'bg-red-500/10 border-red-500/30' 
            : remainingRequests <= 1 
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                remainingRequests === 0 
                  ? 'bg-red-500/20' 
                  : remainingRequests <= 1 
                  ? 'bg-yellow-500/20'
                  : 'bg-blue-500/20'
              }`}>
                <svg className={`w-6 h-6 ${
                  remainingRequests === 0 
                    ? 'text-red-400' 
                    : remainingRequests <= 1 
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Release Request Limits</h3>
                <p className={`text-sm ${
                  remainingRequests === 0 
                    ? 'text-red-400' 
                    : remainingRequests <= 1 
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`}>
                  {remainingRequests === 0 
                    ? `You have used all ${maxReleases} request slots for this season`
                    : `${remainingRequests} of ${maxReleases} request slots remaining`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400">Total Requests</div>
                <div className={`text-2xl font-black ${
                  totalRequestsCount >= maxReleases ? 'text-red-400' : 'text-white'
                }`}>
                  {totalRequestsCount}/{maxReleases}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Approved</div>
                <div className={`text-2xl font-black ${
                  approvedReleasesCount >= maxReleases ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {approvedReleasesCount}/{maxReleases}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show message if limit reached */}
        {remainingRequests === 0 && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-black text-white mb-2">Request Limit Reached</h2>
            <p className="text-gray-400">You have already submitted {maxReleases} release requests this season. No more requests can be submitted.</p>
            <p className="text-gray-500 text-sm mt-2">You have {approvedReleasesCount} approved release{approvedReleasesCount !== 1 ? 's' : ''}.</p>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111111] border border-[#E8A800]/30 rounded-xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400 text-sm">Your release request has been submitted to the admin</p>
              </div>

              <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{whatsappText}</pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToWhatsApp}
                  className="flex-1 px-4 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Copy for WhatsApp
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Stats - Always Visible */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Current Budget</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">${currentBudget.toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Current Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{currentSlots}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Slots</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">{currentSlots}/{maxSlots}</div>
          </div>
        </div>

        {/* All Requests - Show all statuses */}
        {allRequests.length > 0 && (
          <div className="mb-8 rounded-xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xl font-black text-white mb-4">Your Release Requests</h2>
            <div className="space-y-3">
              {allRequests.map(req => {
                const isPending = req.status === 'pending'
                const isApproved = req.status === 'approved'
                const isRejected = req.status === 'rejected'
                
                return (
                  <div key={req.id} className={`flex items-center justify-between rounded-lg p-4 ${
                    isPending ? 'bg-blue-500/10 border border-blue-500/30' :
                    isApproved ? 'bg-emerald-500/10 border border-emerald-500/30' :
                    'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-white">{req.playerName}</div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isPending ? 'bg-blue-500/20 text-blue-400' :
                          isApproved ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Refund: ${req.refundAmount.toLocaleString()}
                        {req.processedAt && ` • Processed: ${new Date(req.processedAt).toLocaleDateString()}`}
                      </div>
                      {isRejected && req.rejectionReason && (
                        <div className="mt-2 text-sm text-red-400">
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </div>
                    {isPending && (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors"
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
          <div className="mb-6 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/30 overflow-hidden">
            {/* Header - Always Visible */}
            <div 
              className="p-4 cursor-pointer hover:bg-[#E8A800]/5 transition-colors"
              onClick={() => setIsSelectedListExpanded(!isSelectedListExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">Selected Players ({selectedPlayers.size})</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-[#E8A800]/20 rounded text-[#E8A800] font-bold">
                      ${totalRefund.toLocaleString()}
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-[#E8A800] transition-transform duration-200 ${isSelectedListExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expandable Content */}
            {isSelectedListExpanded && (
              <div className="px-6 pb-6">
                {/* Players List */}
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                  {selectedPlayersList.map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-[#111111] rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                            alt={player.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{player.name}</div>
                          <div className="text-xs text-gray-400">{player.position} • OVR {player.overall}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#E8A800]">${player.soldPrice.toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => togglePlayer(player.id)}
                          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-[#0a0a0a] rounded-lg">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Players</div>
                    <div className="text-xl font-black text-white">{selectedPlayers.size}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Refund</div>
                    <div className="text-xl font-black text-[#E8A800]">${totalRefund.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">New Budget</div>
                    <div className="text-xl font-black text-emerald-400">${newBudget.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Current Slots</div>
                    <div className="text-xl font-black text-white">{currentSlots}/{maxSlots}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">After Release</div>
                    <div className="text-xl font-black text-blue-400">{currentSlots - slotsFreed}/{maxSlots}</div>
                  </div>
                </div>

                {/* Warning if exceeds limit */}
                {selectedPlayers.size > remainingRequests && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <div className="font-bold text-red-400 mb-1">Request Limit Exceeded</div>
                        <div className="text-sm text-red-300">
                          You have selected {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''}, but only {remainingRequests} request slot{remainingRequests !== 1 ? 's' : ''} remaining. You have already submitted {totalRequestsCount}/{maxReleases} requests. Please deselect {selectedPlayers.size - remainingRequests} player{selectedPlayers.size - remainingRequests !== 1 ? 's' : ''}.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedPlayers.size > remainingRequests}
                  className="w-full px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E8A800]"
                >
                  {isSubmitting 
                    ? 'Submitting...' 
                    : selectedPlayers.size > remainingRequests
                    ? `Exceeds limit (${remainingRequests} slot${remainingRequests !== 1 ? 's' : ''} remaining)`
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
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Search</label>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20"
            />
          </div>
          <CustomSelect
            label="Position"
            value={positionFilter}
            options={positions}
            onChange={setPositionFilter}
            displayValue={(val) => val === 'ALL' ? 'All Positions' : val}
          />
          <CustomSelect
            label="Position Group"
            value={positionGroupFilter}
            options={positionGroups}
            onChange={setPositionGroupFilter}
            displayValue={(val) => val === 'ALL' ? 'All Groups' : val}
          />
          <CustomSelect
            label="Playing Style"
            value={styleFilter}
            options={styles}
            onChange={setStyleFilter}
            displayValue={(val) => val === 'ALL' ? 'All Styles' : val}
            enableSearch={true}
          />
        </div>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
            <p className="text-gray-400">No players found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map(player => {
              const isSelected = selectedPlayers.has(player.id)
              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#E8A800]/20 border-2 border-[#E8A800]'
                      : 'bg-white/5 border border-white/10 hover:border-[#E8A800]/50'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <Image
                        src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                        alt={player.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1 truncate">{player.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <span className="px-2 py-0.5 rounded bg-white/10">{player.position}</span>
                        <span>OVR {player.overall}</span>
                      </div>
                      <div className="text-xs text-gray-500">{player.club}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <div className="text-xs text-gray-400">Refund</div>
                      <div className="text-lg font-black text-[#E8A800]">${player.soldPrice.toLocaleString()}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-[#E8A800] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
