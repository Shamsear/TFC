'use client'

import { useState, useMemo } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import SearchableSelect from '@/components/ui/SearchableSelect'

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
  teamId: string
  teamName: string
  teamLogo?: string
}

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface SwapPlayer {
  id: string
  playerId: string
  playerName: string
  playerPhotoId: string
  fromTeamId: string
  fromTeamName: string
  toTeamId: string
  toTeamName: string
  playerValue: number
}

interface ExistingRequest {
  id: string
  requestingTeamId: string
  requestingTeamName: string
  targetTeamId: string
  targetTeamName: string
  isMyRequest: boolean
  submittedAt: string
  players: SwapPlayer[]
}

interface Limits {
  totalRequests: number
  completedSwaps: number
  remainingRequests: number
  remainingSwaps: number
  canSubmit: boolean
}

interface Props {
  seasonId: string
  myTeamId: string
  myTeamName: string
  myPlayers: Player[]
  availablePlayers: Player[]
  teams: Team[]
  existingRequests: ExistingRequest[]
  limits: Limits
}

export default function SwapRequestClient({
  seasonId,
  myTeamId,
  myTeamName,
  myPlayers,
  availablePlayers,
  teams,
  existingRequests: initialRequests,
  limits,
}: Props) {
  const [selectedMyPlayers, setSelectedMyPlayers] = useState<Set<string>>(new Set())
  const [selectedOtherPlayers, setSelectedOtherPlayers] = useState<Set<string>>(new Set())
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<string>('')
  
  const [searchMyPlayers, setSearchMyPlayers] = useState('')
  const [searchOtherPlayers, setSearchOtherPlayers] = useState('')
  
  const [existingRequests, setExistingRequests] = useState(initialRequests)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [whatsappText, setWhatsappText] = useState('')

  // Filter my players
  const filteredMyPlayers = useMemo(() => {
    return myPlayers.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchMyPlayers.toLowerCase())
      
      return matchesSearch
    })
  }, [myPlayers, searchMyPlayers])

  // Filter other players by selected team
  const filteredOtherPlayers = useMemo(() => {
    if (!selectedTargetTeam) return [] // Require team selection first

    return availablePlayers.filter(player => {
      if (player.teamId !== selectedTargetTeam) {
        return false
      }
      
      const matchesSearch = player.name.toLowerCase().includes(searchOtherPlayers.toLowerCase())
      
      return matchesSearch
    })
  }, [availablePlayers, selectedTargetTeam, searchOtherPlayers])

  // Get selected player lists
  const mySelectedList = myPlayers.filter(p => selectedMyPlayers.has(p.id))
  const otherSelectedList = availablePlayers.filter(p => selectedOtherPlayers.has(p.id))

  // Validation
  const isValidSwap = selectedMyPlayers.size > 0 && 
                      selectedMyPlayers.size === selectedOtherPlayers.size &&
                      otherSelectedList.every(p => p.teamId === otherSelectedList[0]?.teamId)

  const targetTeamId = otherSelectedList[0]?.teamId || ''
  const targetTeamName = otherSelectedList[0]?.teamName || ''

  const toggleMyPlayer = (playerId: string) => {
    const newSelected = new Set(selectedMyPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.clear()
      newSelected.add(playerId)
    }
    setSelectedMyPlayers(newSelected)
  }

  const toggleOtherPlayer = (playerId: string) => {
    const newSelected = new Set(selectedOtherPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.clear()
      newSelected.add(playerId)
    }
    setSelectedOtherPlayers(newSelected)
  }

  const handleSubmit = async () => {
    if (!isValidSwap) {
      alert('Please select equal number of players from both teams')
      return
    }

    setIsSubmitting(true)
    try {
      // Build swap players array
      const swapPlayers = [
        ...mySelectedList.map(p => ({
          playerId: p.id,
          playerName: p.name,
          fromTeamId: myTeamId,
          toTeamId: targetTeamId,
          playerValue: p.soldPrice,
        })),
        ...otherSelectedList.map(p => ({
          playerId: p.id,
          playerName: p.name,
          fromTeamId: p.teamId,
          toTeamId: myTeamId,
          playerValue: p.soldPrice,
        })),
      ]

      const response = await fetch('/api/team/swap-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          requestingTeamId: myTeamId,
          targetTeamId,
          players: swapPlayers,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit swap request')
      }

      const data = await response.json()
      
      // Generate WhatsApp message
      const message = generateWhatsAppMessage()
      setWhatsappText(message)
      
      // Update existing requests
      setExistingRequests([...existingRequests, data.request])
      setSelectedMyPlayers(new Set())
      setSelectedOtherPlayers(new Set())
      setShowSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Failed to submit swap request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this swap request?')) {
      return
    }

    try {
      const response = await fetch(`/api/team/swap-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel request')
      }

      setExistingRequests(existingRequests.filter(req => req.id !== requestId))
    } catch (error: any) {
      alert(error.message || 'Failed to cancel request')
    }
  }

  const generateWhatsAppMessage = () => {
    const myPlayersList = mySelectedList.map(p => `${p.name} (£${(p.soldPrice).toLocaleString()})`).join('\n')
    const otherPlayersList = otherSelectedList.map(p => `${p.name} (£${(p.soldPrice).toLocaleString()})`).join('\n')
    
    return `🔄 *Swap Request*\n\n*${myTeamName}* gives:\n${myPlayersList}\n\n*${targetTeamName}* gives:\n${otherPlayersList}\n\n*Type:* ${selectedMyPlayers.size}-for-${selectedOtherPlayers.size} swap`
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
  }

  const copyRequestToWhatsApp = (req: ExistingRequest) => {
    const myPlayers = req.players.filter(p => p.fromTeamId === req.requestingTeamId)
    const otherPlayers = req.players.filter(p => p.fromTeamId === req.targetTeamId)
    
    const myPlayersList = myPlayers.map(p => `${p.playerName} (£${(p.playerValue).toLocaleString()})`).join('\n')
    const otherPlayersList = otherPlayers.map(p => `${p.playerName} (£${(p.playerValue).toLocaleString()})`).join('\n')
    
    const text = `🔄 *Swap Request*\n\n*${req.requestingTeamName}* gives:\n${myPlayersList}\n\n*${req.targetTeamName}* gives:\n${otherPlayersList}\n\n*Type:* ${myPlayers.length}-for-${otherPlayers.length} swap`
    
    navigator.clipboard.writeText(text)
    alert('Request copied to clipboard! You can now paste it in WhatsApp')
  }

  const formatCurrency = (amount: number) => {
    return `£${(amount).toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-16 sm:pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-4 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-0">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Swap Request
            </span>
          </h1>
          
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-4">
            <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border ${limits.remainingRequests === 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white'}`}>
              <span className="text-xs sm:text-sm text-gray-400 block sm:mb-1">Requests Left</span>
              <span className="font-bold text-sm sm:text-base">{limits.remainingRequests} / 5</span>
            </div>
            <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border ${limits.remainingSwaps === 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white'}`}>
              <span className="text-xs sm:text-sm text-gray-400 block sm:mb-1">Swaps Left</span>
              <span className="font-bold text-sm sm:text-base">{limits.remainingSwaps} / 5</span>
            </div>
          </div>

          <details className="mt-3 sm:mt-4 group bg-[#111111]/80 border border-[#E8A800]/30 rounded-xl">
            <summary className="p-3 sm:p-4 text-sm sm:text-base font-bold text-[#E8A800] cursor-pointer list-none flex items-center justify-between">
              How to Request a Swap
              <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-3 pb-3 sm:px-4 sm:pb-4 text-sm sm:text-base text-gray-300 border-t border-[#E8A800]/10 mt-1 pt-3">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Select the target team from the <strong>Target Team Players</strong> column below.</li>
                <li>Select <strong>one</strong> player from your squad that you want to offer.</li>
                <li>Select <strong>one</strong> player from the target team that you want in return.</li>
                <li>Review the swap summary and submit your request.</li>
              </ol>
            </div>
          </details>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

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
                <p className="text-gray-400 text-sm">Your swap request has been submitted to the admin</p>
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

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <div className="mb-8 rounded-xl bg-blue-500/10 border border-blue-500/30 p-6">
            <h2 className="text-xl font-black text-white mb-4">Pending Swap Requests</h2>
            <div className="space-y-3">
              {existingRequests.map(req => (
                <div key={req.id} className="bg-[#111111] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-white mb-1">
                        {req.requestingTeamName} ⇄ {req.targetTeamName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {req.players.length / 2}-for-{req.players.length / 2} swap
                        {req.isMyRequest && <span className="ml-2 text-emerald-400">(Your Request)</span>}
                        {!req.isMyRequest && <span className="ml-2 text-blue-400">(Received)</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyRequestToWhatsApp(req)}
                        className="px-4 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Copy
                      </button>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-2">{req.requestingTeamName} gives:</div>
                      <div className="space-y-3">
                        {req.players.filter(p => p.fromTeamId === req.requestingTeamId).map(p => (
                          <div key={p.id} className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                              <Image
                                src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                alt={p.playerName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-bold">{p.playerName}</div>
                              <div className="text-xs text-gray-400">{formatCurrency(p.playerValue)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-2">{req.targetTeamName} gives:</div>
                      <div className="space-y-3">
                        {req.players.filter(p => p.fromTeamId === req.targetTeamId).map(p => (
                          <div key={p.id} className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                              <Image
                                src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                alt={p.playerName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-bold">{p.playerName}</div>
                              <div className="text-xs text-gray-400">{formatCurrency(p.playerValue)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swap Summary */}
        {(selectedMyPlayers.size > 0 || selectedOtherPlayers.size > 0) && (
          <div className={`mb-6 rounded-xl p-6 ${
            isValidSwap
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-2">{myTeamName} gives ({selectedMyPlayers.size})</div>
                {mySelectedList.map(p => (
                  <div key={p.id} className="text-white text-sm">{p.name} - {formatCurrency(p.soldPrice)}</div>
                ))}
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-2">{targetTeamName || 'Other Team'} gives ({selectedOtherPlayers.size})</div>
                {otherSelectedList.map(p => (
                  <div key={p.id} className="text-white text-sm">{p.name} - {formatCurrency(p.soldPrice)}</div>
                ))}
              </div>
            </div>
            {!isValidSwap && (
              <div className="text-red-400 text-sm mb-4">
                {selectedMyPlayers.size !== selectedOtherPlayers.size
                  ? '⚠️ Must select equal number of players from both teams'
                  : '⚠️ All selected players from other team must be from the same team'}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValidSwap || isSubmitting || !limits.canSubmit}
              className={`w-full px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                !limits.canSubmit
                  ? 'bg-gray-500/20 text-gray-400'
                  : 'bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a]'
              }`}
            >
              {isSubmitting ? 'Submitting...' : !limits.canSubmit ? 'Limit Reached' : 'Submit Swap Request'}
            </button>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Players */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-white mb-2">My Players ({selectedMyPlayers.size} selected)</h2>
              <input
                type="text"
                placeholder="Search my players..."
                value={searchMyPlayers}
                onChange={(e) => setSearchMyPlayers(e.target.value)}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]"
              />
            </div>
            <div className="space-y-3 max-h-[350px] lg:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredMyPlayers.map(player => {
                const isSelected = selectedMyPlayers.has(player.id)
                return (
                  <div
                    key={player.id}
                    onClick={() => toggleMyPlayer(player.id)}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8A800]/20 border-2 border-[#E8A800]'
                        : 'bg-white/5 border border-white/10 hover:border-[#E8A800]/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                          alt={player.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{player.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-white/10">{player.position}</span>
                          <span>OVR {player.overall}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#E8A800]">{formatCurrency(player.soldPrice)}</div>
                        {isSelected && (
                          <div className="w-6 h-6 bg-[#E8A800] rounded-full flex items-center justify-center mt-1">
                            <svg className="w-4 h-4 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Other Players */}
          <div>
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Target Team Players ({selectedOtherPlayers.size} selected)</h2>
              </div>
              <SearchableSelect
                value={selectedTargetTeam}
                options={[
                  { value: '', label: 'Select Target Team' }, 
                  ...[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(t => ({ value: t.id, label: t.name }))
                ]}
                onChange={setSelectedTargetTeam}
                placeholder="Select Target Team"
              />
              <input
                type="text"
                placeholder="Search available players..."
                value={searchOtherPlayers}
                onChange={(e) => setSearchOtherPlayers(e.target.value)}
                disabled={!selectedTargetTeam}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {!selectedTargetTeam ? (
              <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">Select a Target Team</h3>
                <p className="text-gray-400">Choose a team from the dropdown above to view their squad.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] lg:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredOtherPlayers.map(player => {
                const isSelected = selectedOtherPlayers.has(player.id)
                return (
                  <div
                    key={player.id}
                    onClick={() => toggleOtherPlayer(player.id)}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-white/5 border border-white/10 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                          alt={player.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{player.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <span className="px-2 py-0.5 rounded bg-white/10">{player.position}</span>
                          <span>OVR {player.overall}</span>
                        </div>
                        <div className="text-xs text-gray-500">{player.teamName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-400">{formatCurrency(player.soldPrice)}</div>
                        {isSelected && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
