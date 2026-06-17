'use client'

import { useState } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { PosterModal } from './SwapReleasePoster'

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

interface Request {
  id: string
  requestingTeamId: string
  requestingTeamName: string
  requestingTeamLogo: string
  targetTeamId: string
  targetTeamName: string
  targetTeamLogo: string
  status: string
  submittedAt: string
  processedAt: string | null
  processedBy: string | null
  rejectionReason: string | null
  swapWindowId: string | null
  swapWindowName: string | null
  players: SwapPlayer[]
}

interface TeamStats {
  teamId: string
  teamName: string
  teamLogo: string
  currentBudget: number
  totalRequests: number
  approvedSwaps: number
  pendingRequests: number
  rejectedRequests: number
  remainingRequests: number
  remainingSwaps: number
}

interface SwapWindowInfo {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  swapLimit: number
}

interface Props {
  seasonId: string
  seasonName: string
  swapWindowOpen: boolean
  requests: Request[]
  teamStats: TeamStats[]
  swapWindows: SwapWindowInfo[]
}

export default function SwapRequestsAdminClient({
  seasonId,
  seasonName,
  swapWindowOpen: initialWindowOpen,
  requests: initialRequests,
  teamStats: initialTeamStats,
  swapWindows: initialSwapWindows = [],
}: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [teamStats, setTeamStats] = useState(initialTeamStats)
  const [swapWindows, setSwapWindows] = useState<SwapWindowInfo[]>(initialSwapWindows)
  const [selectedWindowId, setSelectedWindowId] = useState<string>(
    initialSwapWindows.find(w => w.status === 'ACTIVE')?.id || 'ALL'
  )

  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  useEffect(() => {
    setTeamStats(initialTeamStats)
  }, [initialTeamStats])

  useEffect(() => {
    setSwapWindows(initialSwapWindows)
  }, [initialSwapWindows])

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 15000) // 15 seconds
    return () => clearInterval(interval)
  }, [router])
  const [isTogglingWindow, setIsTogglingWindow] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [showTeamStats, setShowTeamStats] = useState(false)
  const [selectedPosterRequest, setSelectedPosterRequest] = useState<Request | null>(null)
  const [showPosterModal, setShowPosterModal] = useState(false)

  // Filter requests by selected window
  const filteredRequests = selectedWindowId === 'ALL'
    ? requests
    : selectedWindowId 
      ? requests.filter(r => r.swapWindowId === selectedWindowId)
      : requests

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending')
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending')

  const selectedWindow = swapWindows.find(w => w.id === selectedWindowId)

  const toggleWindow = async () => {
    if (!selectedWindow) {
      alert('No swap window selected')
      return
    }
    const isActive = selectedWindow.status === 'ACTIVE'
    const newStatus = isActive ? 'CLOSED' : 'ACTIVE'
    if (!confirm(`Are you sure you want to ${isActive ? 'close' : 'open'} the swap window "${selectedWindow.name}"?`)) {
      return
    }

    setIsTogglingWindow(true)
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/swap-windows/${selectedWindow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle window')
      }

      setSwapWindows(prev => prev.map(w => {
        if (w.id === selectedWindow.id) {
          return { ...w, status: newStatus }
        }
        if (newStatus === 'ACTIVE' && w.id !== selectedWindow.id && w.status === 'ACTIVE') {
          return { ...w, status: 'CLOSED' }
        }
        return w
      }))
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to toggle window')
    } finally {
      setIsTogglingWindow(false)
    }
  }

  const generateWhatsAppMessage = (request: Request) => {
    const swapType = request.players.length / 2
    const requestingPlayers = request.players.filter(p => p.fromTeamId === request.requestingTeamId)
    const targetPlayers = request.players.filter(p => p.fromTeamId === request.targetTeamId)
    
    const requestingAcquires = targetPlayers.map(p => `• *${p.playerName}* (£${p.playerValue.toLocaleString()})`).join('\n')
    const targetAcquires = requestingPlayers.map(p => `• *${p.playerName}* (£${p.playerValue.toLocaleString()})`).join('\n')
    
    return `🚨 *BREAKING DEAL: SWAP AGREEMENT CONFIRMED!* 🚨

A major player swap has been finalized between *${request.requestingTeamName}* and *${request.targetTeamName}*!

🤝 *Here is how the exchange shakes out:*

🟢 *${request.requestingTeamName}* acquires:
${requestingAcquires || '_None_'}

🟢 *${request.targetTeamName}* acquires:
${targetAcquires || '_None_'}

📊 *Trade Snapshot:*
• *Swap Format:* ${swapType}-for-${swapType} Exchange
• *Status:* APPROVED & ROSTERS UPDATED`
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
  }

  const handleApprove = async (request: Request) => {
    const swapType = request.players.length / 2
    if (!confirm(`Approve ${swapType}-for-${swapType} swap between ${request.requestingTeamName} and ${request.targetTeamName}?`)) {
      return
    }

    setProcessingId(request.id)
    try {
      const response = await fetch(`/api/admin/swap-requests/${request.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve request')
      }

      // Update local state
      setRequests(requests.map(r =>
        r.id === request.id
          ? { ...r, status: 'approved', processedAt: new Date().toISOString() }
          : r
      ))

      // Generate WhatsApp message and open modal
      const message = generateWhatsAppMessage(request)
      setWhatsappMessage(message)
      setSelectedPosterRequest({
        ...request,
        status: 'approved'
      })
      setShowPosterModal(true)

      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectModal = (request: Request) => {
    setRejectingRequest(request)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectingRequest) return
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setProcessingId(rejectingRequest.id)
    try {
      const response = await fetch(`/api/admin/swap-requests/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject request')
      }

      // Update local state
      setRequests(requests.map(r =>
        r.id === rejectingRequest.id
          ? { ...r, status: 'rejected', processedAt: new Date().toISOString(), rejectionReason }
          : r
      ))

      setShowRejectModal(false)
      setRejectingRequest(null)
      alert('Request rejected')
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return `£${(amount).toLocaleString()}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Swap Requests</h1>
            <p className="text-gray-400">{seasonName}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href={`/sub-admin/${seasonId}/transfer-windows`}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-[#E8A800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Manage Swap Windows
            </Link>
          </div>
        </div>

        {/* Swap Window Selection & Control */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7367]">Select Swap Window</label>
              {swapWindows.length === 0 ? (
                <div className="text-sm text-[#7A7367]">No swap windows created. Click "Manage Swap Windows" above to create one.</div>
              ) : (
                <select
                  value={selectedWindowId}
                  onChange={e => setSelectedWindowId(e.target.value)}
                  className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-[#E8A800]"
                >
                  <option value="ALL">All Windows</option>
                  {swapWindows.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedWindow && selectedWindowId !== 'ALL' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleWindow}
                  disabled={isTogglingWindow}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-lg disabled:opacity-50 ${
                    selectedWindow.status === 'ACTIVE'
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 hover:bg-[#FFC93A]/30 text-emerald-400 border border-[#E8A800]/30'
                  }`}
                >
                  {isTogglingWindow ? 'Processing...' : selectedWindow.status === 'ACTIVE' ? 'Close Window' : 'Open Window'}
                </button>
                <Link
                  href={`/sub-admin/${seasonId}/transfer-windows`}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all border border-white/10"
                >
                  Edit Window
                </Link>
              </div>
            )}
          </div>

          {selectedWindow && selectedWindowId !== 'ALL' && (
            <div className="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-300">Status:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  selectedWindow.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedWindow.status === 'CLOSED' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {selectedWindow.status}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-300">Duration:</span> {new Date(selectedWindow.startDate).toLocaleDateString()} - {new Date(selectedWindow.endDate).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold text-gray-300">Limit:</span> <span className="text-[#E8A800] font-bold">{selectedWindow.swapLimit} swaps</span> per team
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-1">Pending</div>
          <div className="text-3xl font-black text-yellow-400">{pendingRequests.length}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-1">Approved</div>
          <div className="text-3xl font-black text-emerald-400">
            {filteredRequests.filter(r => r.status === 'approved').length}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-1">Rejected</div>
          <div className="text-3xl font-black text-red-400">
            {filteredRequests.filter(r => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Team Swap Statistics - Expandable */}
      <div className="mb-8">
        <button
          onClick={() => setShowTeamStats(!showTeamStats)}
          className="w-full rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <h2 className="text-lg font-black text-white">Team Swap Statistics</h2>
                <p className="text-sm text-gray-400">View swap usage for all {teamStats?.length || 0} teams</p>
              </div>
            </div>
            <svg
              className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${showTeamStats ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showTeamStats && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamStats?.map(team => (
                <div key={team.teamId} className="rounded-lg bg-[#111111] border border-white/10 p-4">
                  {/* Team Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    {team.teamLogo && (
                      <div className="w-10 h-10 rounded overflow-hidden bg-white/5 flex-shrink-0">
                        <img src={team.teamLogo} alt={team.teamName} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white truncate">{team.teamName}</h3>
                      <p className="text-xs text-gray-400">Budget: {formatCurrency(team.currentBudget)}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total Requests</span>
                      <span className={`text-sm font-bold ${
                        team.totalRequests >= 5 ? 'text-red-400' : 'text-white'
                      }`}>
                        {team.totalRequests}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Completed Swaps</span>
                      <span className={`text-sm font-bold ${
                        team.approvedSwaps >= 5 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {team.approvedSwaps}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Pending</span>
                      <span className="text-sm font-bold text-yellow-400">{team.pendingRequests}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Rejected</span>
                      <span className="text-sm font-bold text-red-400">{team.rejectedRequests}</span>
                    </div>
                  </div>

                  {/* Remaining Slots */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Remaining Requests</span>
                      <span className={`text-sm font-bold ${
                        team.remainingRequests === 0 ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {team.remainingRequests}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Remaining Swaps</span>
                      <span className={`text-sm font-bold ${
                        team.remainingSwaps === 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {team.remainingSwaps}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {(team.totalRequests >= 5 || team.approvedSwaps >= 5) && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        LIMIT REACHED
                      </span>
                    </div>
                  )}
                  {team.totalRequests === 0 && team.approvedSwaps === 0 && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        NO ACTIVITY
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-4">Pending Requests</h2>
          <div className="space-y-4">
            {pendingRequests.map(request => {
              const swapType = request.players.length / 2
              const requestingPlayers = request.players.filter(p => p.fromTeamId === request.requestingTeamId)
              const targetPlayers = request.players.filter(p => p.fromTeamId === request.targetTeamId)

              return (
                <div key={request.id} className="rounded-xl bg-[#111111] border border-yellow-500/30 p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black text-white mb-2">
                        {swapType}-for-{swapType} Swap
                      </h3>
                      <div className="text-sm text-gray-400">{formatDate(request.submittedAt)}</div>
                    </div>
                  </div>

                  {/* Swap Details */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Requesting Team */}
                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {request.requestingTeamLogo && (
                          <div className="w-8 h-8 rounded overflow-hidden">
                            <img src={request.requestingTeamLogo} alt={request.requestingTeamName} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="font-bold text-white">{request.requestingTeamName} gives:</div>
                      </div>
                      <div className="space-y-3">
                        {requestingPlayers.map(player => (
                          <div key={player.id} className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                              <Image
                                src={getPlayerPhotoUrl(`${player.playerPhotoId}.webp`)}
                                alt={player.playerName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-bold text-sm">{player.playerName}</div>
                              <div className="text-xs text-gray-400">{formatCurrency(player.playerValue)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Target Team */}
                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {request.targetTeamLogo && (
                          <div className="w-8 h-8 rounded overflow-hidden">
                            <img src={request.targetTeamLogo} alt={request.targetTeamName} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="font-bold text-white">{request.targetTeamName} gives:</div>
                      </div>
                      <div className="space-y-3">
                        {targetPlayers.map(player => (
                          <div key={player.id} className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                              <Image
                                src={getPlayerPhotoUrl(`${player.playerPhotoId}.webp`)}
                                alt={player.playerName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-bold text-sm">{player.playerName}</div>
                              <div className="text-xs text-gray-400">{formatCurrency(player.playerValue)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="flex-1 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-colors border border-emerald-500/30 disabled:opacity-50"
                    >
                      {processingId === request.id ? 'Processing...' : 'Approve & Execute Swap'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPosterRequest(request)
                        setShowPosterModal(true)
                      }}
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors border border-white/10 flex items-center justify-center gap-2"
                      title="Preview Poster"
                    >
                      <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Poster
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold transition-colors border border-red-500/30 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-black text-white mb-4">Processed Requests</h2>
          <div className="space-y-3">
            {processedRequests.map(request => {
              const swapType = request.players.length / 2
              return (
                <div key={request.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white mb-1">
                        {request.requestingTeamName} ⇄ {request.targetTeamName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {swapType}-for-{swapType} swap
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedPosterRequest(request)
                          setShowPosterModal(true)
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 flex-shrink-0"
                        title="View Poster"
                      >
                        <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {request.status === 'approved' && (
                        <button
                          onClick={() => {
                            const msg = generateWhatsAppMessage(request)
                            navigator.clipboard.writeText(msg)
                            alert('Copied to clipboard!')
                          }}
                          className="p-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-lg transition-colors border border-[#25D366]/30 flex-shrink-0"
                          title="Copy for WhatsApp"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                      )}
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                        {request.processedAt && (
                          <div className="text-xs text-gray-500 mt-1">{formatDate(request.processedAt)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {request.rejectionReason && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="text-xs text-red-400 mb-1">Rejection Reason</div>
                      <div className="text-sm text-gray-300">{request.rejectionReason}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">No Requests</h3>
          <p className="text-gray-400">No swap requests have been submitted yet</p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingRequest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-black text-white mb-4">Reject Swap Request</h3>
            <p className="text-gray-400 mb-4">
              Rejecting swap between <span className="text-white font-bold">{rejectingRequest.requestingTeamName}</span> and{' '}
              <span className="text-white font-bold">{rejectingRequest.targetTeamName}</span>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 mb-4 min-h-[100px]"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === rejectingRequest.id}
                className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold transition-colors border border-red-500/30 disabled:opacity-50"
              >
                {processingId === rejectingRequest.id ? 'Processing...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingRequest(null)
                }}
                disabled={processingId === rejectingRequest.id}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal with WhatsApp Copy */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-emerald-500/30 rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                Swap Approved!
              </h3>
              <p className="text-gray-400 text-sm">
                The player swap has been processed successfully.
              </p>
            </div>

            <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4 border border-white/10 max-h-60 overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{whatsappMessage}</pre>
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
                onClick={() => {
                  setShowSuccessModal(false)
                }}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PosterModal
        isOpen={showPosterModal}
        onClose={() => {
          setShowPosterModal(false)
          setSelectedPosterRequest(null)
        }}
        request={selectedPosterRequest}
        type="swap"
        seasonName={seasonName}
        whatsappMessage={selectedPosterRequest ? generateWhatsAppMessage(selectedPosterRequest) : ''}
        copyToWhatsApp={() => {
          if (selectedPosterRequest) {
            const msg = generateWhatsAppMessage(selectedPosterRequest)
            navigator.clipboard.writeText(msg)
            alert('Copied to clipboard!')
          }
        }}
      />
    </>
  )
}
