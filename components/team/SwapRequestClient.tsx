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
  status: string
  submittedAt: string
  players: SwapPlayer[]
}

interface Limits {
  totalRequests: number
  completedSwaps: number
  remainingRequests: number
  remainingSwaps: number
  canSubmit: boolean
  maxSwaps?: number
}

interface Props {
  seasonId: string
  swapWindowId?: string
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
  swapWindowId,
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
    if (!selectedTargetTeam) return []

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
          swapWindowId,
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
      
      const message = generateWhatsAppMessage()
      setWhatsappText(message)
      
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

  const getPositionBadgeClass = (pos: string) => {
    const p = pos.toUpperCase()
    if (p.includes('GK')) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    if (p.includes('DEF') || p.includes('CB') || p.includes('LB') || p.includes('RB') || p.includes('LWB') || p.includes('RWB')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    }
    if (p.includes('MID') || p.includes('CM') || p.includes('CDM') || p.includes('CAM') || p.includes('LM') || p.includes('RM')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }
    return 'bg-red-500/10 text-red-400 border border-red-500/20'
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-16 sm:pt-20 relative overflow-hidden font-sans">
      {/* Background spotlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Panel */}
      <div className="relative border-b border-white/[0.06] bg-black/40 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent">
                  Swap Negotiator
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
                Draft 1-for-1 player trade swap proposals. Offer your asset in exchange for players from target clubs.
              </p>
            </div>

            {/* Quota Indicators */}
            <div className="flex gap-3 sm:gap-4 shrink-0">
              <div className={`px-4 py-2.5 rounded-xl border backdrop-blur-md flex flex-col justify-center min-w-[120px] transition-all duration-300 ${
                limits.remainingRequests === 0 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'bg-white/[0.02] border-white/[0.08] text-white'
              }`}>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-0.5">Requests Left</span>
                <span className="font-bold text-lg font-mono">{limits.remainingRequests} / {limits.maxSwaps || 5}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-xl border backdrop-blur-md flex flex-col justify-center min-w-[120px] transition-all duration-300 ${
                limits.remainingSwaps === 0 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'bg-[#E8A800]/5 border-[#E8A800]/20 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.05)]'
              }`}>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-0.5">Swaps Left</span>
                <span className="font-bold text-lg font-mono">{limits.remainingSwaps} / {limits.maxSwaps || 5}</span>
              </div>
            </div>
          </div>

          {/* Guide Details Accordion */}
          <details className="mt-6 group bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors duration-200 rounded-xl overflow-hidden">
            <summary className="p-4 text-sm font-bold text-gray-300 hover:text-white cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
                How to Propose a Player Swap
              </span>
              <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 text-xs sm:text-sm text-gray-400 border-t border-white/[0.04] pt-4 space-y-2">
              <p>Follow these steps to submit a transfer swap proposal:</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-gray-300 font-medium">
                <li>Select a target club from the <strong className="text-cyan-400">Target Team Players</strong> column select box.</li>
                <li>Choose exactly <strong className="text-[#E8A800]">one</strong> player to trade away from your squad.</li>
                <li>Choose exactly <strong className="text-cyan-400">one</strong> player to request in return.</li>
                <li>Review the swap summary panel and hit submit to request admin endorsement.</li>
              </ol>
            </div>
          </details>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#0f0f12] border border-[#E8A800]/20 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(232,168,0,0.15)] relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center mb-6 relative z-10">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-white">Request Submitted!</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Your player swap request has been filed for review.</p>
              </div>

              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-4 mb-6 relative z-10">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">WhatsApp Deal Sheet</div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-[#070708] p-3 rounded border border-white/[0.04]">{whatsappText}</pre>
              </div>

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={copyToWhatsApp}
                  className="flex-1 px-4 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(37,211,102,0.2)] hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Copy Format
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="px-4 py-3 bg-white/[0.06] hover:bg-white/10 text-white rounded-xl font-bold transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Requests / Deal history */}
        {existingRequests.length > 0 && (
          <div className="mb-10 space-y-8">
            {/* Pending Proposals */}
            {existingRequests.filter(req => req.status === 'pending').length > 0 && (
              <div className="rounded-2xl bg-cyan-950/15 border border-cyan-500/20 p-5 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.05)] relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  Pending Negotiation Proposals
                </h2>
                
                <div className="space-y-4">
                  {existingRequests.filter(req => req.status === 'pending').map(req => (
                    <div key={req.id} className="bg-neutral-900/60 border border-white/[0.06] rounded-xl p-4 sm:p-5 hover:border-white/10 transition-colors duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-white/[0.04]">
                        <div>
                          <div className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                            <span>{req.requestingTeamName}</span>
                            <span className="text-cyan-400 font-mono text-sm">⇄</span>
                            <span className="text-gray-300">{req.targetTeamName}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium">
                              {req.players.length / 2}-for-{req.players.length / 2} Trade
                            </span>
                            {req.isMyRequest ? (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">Offered by You</span>
                            ) : (
                              <span className="text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-md">Received Offer</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyRequestToWhatsApp(req)}
                            className="px-3.5 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 border border-[#25D366]/20 hover:scale-[1.02]"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Copy Deal
                          </button>
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all duration-200 border border-red-500/20 hover:scale-[1.02]"
                          >
                            Retract Request
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        {/* Outgoing Asset */}
                        <div className="bg-[#0b0b0e] border border-white/[0.04] p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">{req.requestingTeamName} gives:</div>
                          <div className="space-y-3">
                            {req.players.filter(p => p.fromTeamId === req.requestingTeamId).map(p => (
                              <div key={p.id} className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                                  <Image
                                    src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                    alt={p.playerName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-bold truncate text-sm">{p.playerName}</div>
                                  <div className="text-xs text-gray-400 font-medium font-mono mt-0.5">{formatCurrency(p.playerValue)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Incoming Asset */}
                        <div className="bg-[#0b0b0e] border border-white/[0.04] p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">{req.targetTeamName} gives:</div>
                          <div className="space-y-3">
                            {req.players.filter(p => p.fromTeamId === req.targetTeamId).map(p => (
                              <div key={p.id} className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                                  <Image
                                    src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                    alt={p.playerName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-bold truncate text-sm">{p.playerName}</div>
                                  <div className="text-xs text-gray-400 font-medium font-mono mt-0.5">{formatCurrency(p.playerValue)}</div>
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

            {/* Approved / Completed Trades */}
            {existingRequests.filter(req => req.status === 'approved').length > 0 && (
              <div className="rounded-2xl bg-emerald-950/15 border border-emerald-500/20 p-5 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.05)] relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  Completed Swaps (Done Deals)
                </h2>

                <div className="space-y-4">
                  {existingRequests.filter(req => req.status === 'approved').map(req => (
                    <div key={req.id} className="bg-[#0b0b0d]/80 border border-emerald-500/15 rounded-xl p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-emerald-500/10">
                        <div>
                          <div className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                            <span>{req.requestingTeamName}</span>
                            <span className="text-emerald-400 font-mono text-sm">⇄</span>
                            <span className="text-gray-300">{req.targetTeamName}</span>
                          </div>
                          <div className="text-xs text-emerald-400 font-bold mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Approved by League Admin
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        {/* Given Asset */}
                        <div className="bg-black/30 border border-white/[0.03] p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">{req.requestingTeamName} gave:</div>
                          <div className="space-y-3">
                            {req.players.filter(p => p.fromTeamId === req.requestingTeamId).map(p => (
                              <div key={p.id} className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                                  <Image
                                    src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                    alt={p.playerName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-bold truncate text-sm">{p.playerName}</div>
                                  <div className="text-xs text-gray-400 font-medium font-mono mt-0.5">{formatCurrency(p.playerValue)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Received Asset */}
                        <div className="bg-black/30 border border-white/[0.03] p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">{req.targetTeamName} gave:</div>
                          <div className="space-y-3">
                            {req.players.filter(p => p.fromTeamId === req.targetTeamId).map(p => (
                              <div key={p.id} className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                                  <Image
                                    src={getPlayerPhotoUrl(`${p.playerPhotoId}.webp`)}
                                    alt={p.playerName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-bold truncate text-sm">{p.playerName}</div>
                                  <div className="text-xs text-gray-400 font-medium font-mono mt-0.5">{formatCurrency(p.playerValue)}</div>
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
          </div>
        )}

        {/* Dynamic Interactive Swap Summary Area */}
        {(selectedMyPlayers.size > 0 || selectedOtherPlayers.size > 0) && (
          <div className={`mb-10 rounded-2xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
            isValidSwap
              ? 'bg-[#E8A800]/5 border border-[#E8A800]/20 shadow-[0_0_40px_rgba(232,168,0,0.06)]'
              : 'bg-red-500/5 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.06)]'
          }`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <h3 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-ping" />
              Swap Formulation Board
            </h3>

            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6 mb-6">
              {/* My Offer Player */}
              <div className="flex-1 bg-black/40 border border-white/[0.04] p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-3">Asset to offer:</span>
                  {selectedMyPlayers.size === 0 ? (
                    <div className="text-gray-500 text-xs italic py-4">No player selected from your squad. Choose one below.</div>
                  ) : (
                    mySelectedList.map(p => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${p.playerId || p.id}.webp`)}
                            alt={p.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold truncate text-sm sm:text-base">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPositionBadgeClass(p.position)}`}>
                              {p.position}
                            </span>
                            <span className="text-xs text-gray-400 font-semibold font-mono">OVR {p.overall}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-[#E8A800] font-mono">{formatCurrency(p.soldPrice)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Trade Vector Indicator Arrow */}
              <div className="flex items-center justify-center shrink-0 py-2 lg:py-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] p-[1.5px] shadow-[0_0_20px_rgba(232,168,0,0.2)] flex items-center justify-center animate-pulse">
                  <div className="w-full h-full rounded-full bg-[#070708] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Target Requested Player */}
              <div className="flex-1 bg-black/40 border border-white/[0.04] p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-3">Asset to request:</span>
                  {selectedOtherPlayers.size === 0 ? (
                    <div className="text-gray-500 text-xs italic py-4">No player selected from target club. Select a club and player below.</div>
                  ) : (
                    otherSelectedList.map(p => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${p.playerId || p.id}.webp`)}
                            alt={p.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold truncate text-sm sm:text-base">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPositionBadgeClass(p.position)}`}>
                              {p.position}
                            </span>
                            <span className="text-xs text-gray-400 font-semibold font-mono">OVR {p.overall}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-cyan-400 font-mono">{formatCurrency(p.soldPrice)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Validation alerts and submission block */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.04] pt-4">
              <div className="flex-1">
                {!isValidSwap ? (
                  <div className="text-xs text-red-400 flex items-center gap-1.5 font-medium">
                    <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {selectedMyPlayers.size !== selectedOtherPlayers.size
                      ? 'Select exactly one player from each team for trade negotiation.'
                      : 'All requested assets must belong to the exact same target team.'}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                    <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Trade proposal structure is valid!
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isValidSwap || isSubmitting || !limits.canSubmit}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm ${
                  !limits.canSubmit
                    ? 'bg-gray-500/10 text-gray-500 border border-white/[0.04]'
                    : 'bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] text-black hover:opacity-95 shadow-[0_0_20px_rgba(232,168,0,0.15)] hover:scale-[1.01]'
                }`}
              >
                {isSubmitting ? 'Submitting...' : !limits.canSubmit ? 'Quota Limit Reached' : 'Submit Trade Proposal'}
              </button>
            </div>
          </div>
        )}

        {/* Dual Negotiation Column split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: My Players selection */}
          <div className="bg-[#0b0b0e]/70 border border-white/[0.06] rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E8A800] animate-pulse" />
                  My Squad Roster
                </h2>
                <span className="text-xs text-gray-500 font-bold font-mono">({selectedMyPlayers.size} selected)</span>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">Search and pick the asset you wish to trade away.</p>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your players..."
                  value={searchMyPlayers}
                  onChange={(e) => setSearchMyPlayers(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-[#E8A800]/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E8A800]/30 transition-all duration-300"
                />
                <svg className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3 max-h-[350px] lg:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
              {filteredMyPlayers.map(player => {
                const isSelected = selectedMyPlayers.has(player.id)
                return (
                  <div
                    key={player.id}
                    onClick={() => toggleMyPlayer(player.id)}
                    className={`rounded-xl p-3.5 cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-[#E8A800]/5 border-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                        : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Photo base */}
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black/40 border border-white/[0.08] flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                          alt={player.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      
                      {/* Meta information */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{player.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPositionBadgeClass(player.position)}`}>
                            {player.position}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold font-mono">OVR {player.overall}</span>
                        </div>
                      </div>

                      {/* Right values */}
                      <div className="text-right flex flex-col items-end">
                        <div className="text-sm font-bold text-[#E8A800] font-mono">{formatCurrency(player.soldPrice)}</div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-[#E8A800] rounded-full flex items-center justify-center mt-1 shadow-[0_0_10px_rgba(232,168,0,0.3)] animate-scale-up">
                            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredMyPlayers.length === 0 && (
                <div className="text-center py-12 text-xs text-gray-500 font-medium">No squad players found matching search.</div>
              )}
            </div>
          </div>

          {/* Column 2: Target Team & Players selection */}
          <div className="bg-[#0b0b0e]/70 border border-white/[0.06] rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="mb-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    Target Team Players
                  </h2>
                  <span className="text-xs text-gray-500 font-bold font-mono">({selectedOtherPlayers.size} selected)</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">Select a target squad and select the player you want in return.</p>
              </div>

              {/* Styled select container */}
              <div className="p-[1px] bg-gradient-to-r from-white/[0.08] to-white/[0.02] rounded-xl">
                <SearchableSelect
                  value={selectedTargetTeam}
                  options={[
                    { value: '', label: 'Select Target Team' }, 
                    ...[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(t => ({ value: t.id, label: t.name }))
                  ]}
                  onChange={(val) => {
                    setSelectedTargetTeam(val)
                    setSelectedOtherPlayers(new Set()) // Clear requested player when team shifts
                  }}
                  placeholder="Select Target Team"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search target team players..."
                  value={searchOtherPlayers}
                  onChange={(e) => setSearchOtherPlayers(e.target.value)}
                  disabled={!selectedTargetTeam}
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-cyan-500/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                />
                <svg className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {!selectedTargetTeam ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-white/[0.06] bg-black/[0.05] flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-black text-gray-300">Select Target Club</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[240px] leading-relaxed mx-auto">Choose a target franchise above to explore their roster and request a trade.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] lg:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
                {filteredOtherPlayers.map(player => {
                  const isSelected = selectedOtherPlayers.has(player.id)
                  return (
                    <div
                      key={player.id}
                      onClick={() => toggleOtherPlayer(player.id)}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? 'bg-cyan-500/5 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Photo base */}
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black/40 border border-white/[0.08] flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${player.playerId || player.id}.webp`)}
                            alt={player.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        
                        {/* Meta information */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">{player.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPositionBadgeClass(player.position)}`}>
                              {player.position}
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold font-mono">OVR {player.overall}</span>
                          </div>
                        </div>

                        {/* Right values */}
                        <div className="text-right flex flex-col items-end">
                          <div className="text-sm font-bold text-cyan-400 font-mono">{formatCurrency(player.soldPrice)}</div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center mt-1 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-scale-up">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredOtherPlayers.length === 0 && (
                  <div className="text-center py-12 text-xs text-gray-500 font-medium">No roster players found matching search query.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}} />
    </div>
  )
}
