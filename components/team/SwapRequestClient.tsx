'use client'

import { useState, useMemo } from 'react'
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

interface Props {
  seasonId: string
  myTeamId: string
  myTeamName: string
  myPlayers: Player[]
  availablePlayers: Player[]
  teams: Team[]
  existingRequests: ExistingRequest[]
}

export default function SwapRequestClient({
  seasonId,
  myTeamId,
  myTeamName,
  myPlayers,
  availablePlayers,
  teams,
  existingRequests: initialRequests,
}: Props) {
  const [selectedMyPlayers, setSelectedMyPlayers] = useState<Set<string>>(new Set())
  const [selectedOtherPlayers, setSelectedOtherPlayers] = useState<Set<string>>(new Set())
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<string>('')
  
  const [searchMyPlayers, setSearchMyPlayers] = useState('')
  const [searchOtherPlayers, setSearchOtherPlayers] = useState('')
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [styleFilter, setStyleFilter] = useState('ALL')
  
  const [existingRequests, setExistingRequests] = useState(initialRequests)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [whatsappText, setWhatsappText] = useState('')

  // Get unique positions and styles
  const allPlayers = [...myPlayers, ...availablePlayers]
  const positions = ['ALL', ...Array.from(new Set(allPlayers.map(p => p.position))).sort()]
  const styles = ['ALL', ...Array.from(new Set(allPlayers.map(p => p.playingStyle).filter(Boolean) as string[])).sort()]

  // Filter my players
  const filteredMyPlayers = useMemo(() => {
    return myPlayers.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchMyPlayers.toLowerCase())
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      const matchesStyle = styleFilter === 'ALL' || player.playingStyle === styleFilter
      
      return matchesSearch && matchesPosition && matchesStyle
    })
  }, [myPlayers, searchMyPlayers, positionFilter, styleFilter])

  // Filter other players by selected team
  const filteredOtherPlayers = useMemo(() => {
    return availablePlayers.filter(player => {
      if (selectedTargetTeam && player.teamId !== selectedTargetTeam) {
        return false
      }
      
      const matchesSearch = player.name.toLowerCase().includes(searchOtherPlayers.toLowerCase())
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      const matchesStyle = styleFilter === 'ALL' || player.playingStyle === styleFilter
      
      return matchesSearch && matchesPosition && matchesStyle
    })
  }, [availablePlayers, selectedTargetTeam, searchOtherPlayers, positionFilter, styleFilter])

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
      newSelected.add(playerId)
    }
    setSelectedMyPlayers(newSelected)
  }

  const toggleOtherPlayer = (playerId: string) => {
    const newSelected = new Set(selectedOtherPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
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
    const myPlayersList = mySelectedList.map(p => `${p.name} (£${(p.soldPrice / 1000).toFixed(0)}K)`).join('\n')
    const otherPlayersList = otherSelectedList.map(p => `${p.name} (£${(p.soldPrice / 1000).toFixed(0)}K)`).join('\n')
    
    return `🔄 *Swap Request*\n\n*${myTeamName}* gives:\n${myPlayersList}\n\n*${targetTeamName}* gives:\n${otherPlayersList}\n\n*Type:* ${selectedMyPlayers.size}-for-${selectedOtherPlayers.size} swap`
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(2)}M`
    }
    return `£${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Swap Request</h1>
          <p className="text-gray-400">Select equal number of players from both teams to swap</p>
        </div>

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
                    {req.isMyRequest && (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-2">{req.requestingTeamName} gives:</div>
                      {req.players.filter(p => p.fromTeamId === req.requestingTeamId).map(p => (
                        <div key={p.id} className="text-white">{p.playerName}</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-gray-400 mb-2">{req.targetTeamName} gives:</div>
                      {req.players.filter(p => p.fromTeamId === req.targetTeamId).map(p => (
                        <div key={p.id} className="text-white">{p.playerName}</div>
                      ))}
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
              disabled={!isValidSwap || isSubmitting}
              className="w-full px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Swap Request'}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedTargetTeam}
            onChange={(e) => setSelectedTargetTeam(e.target.value)}
            className="px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]"
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]"
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]"
          >
            {styles.map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

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
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
            <div className="mb-4">
              <h2 className="text-2xl font-black text-white mb-2">Available Players ({selectedOtherPlayers.size} selected)</h2>
              <input
                type="text"
                placeholder="Search available players..."
                value={searchOtherPlayers}
                onChange={(e) => setSearchOtherPlayers(e.target.value)}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]"
              />
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  )
}
