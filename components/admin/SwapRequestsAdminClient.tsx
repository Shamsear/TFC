'use client'

import { useState } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  players: SwapPlayer[]
}

interface Props {
  seasonId: string
  seasonName: string
  swapWindowOpen: boolean
  requests: Request[]
}

export default function SwapRequestsAdminClient({
  seasonId,
  seasonName,
  swapWindowOpen: initialWindowOpen,
  requests: initialRequests,
}: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [swapWindowOpen, setSwapWindowOpen] = useState(initialWindowOpen)
  const [isTogglingWindow, setIsTogglingWindow] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  const toggleWindow = async () => {
    if (!confirm(`Are you sure you want to ${swapWindowOpen ? 'close' : 'open'} the swap window?`)) {
      return
    }

    setIsTogglingWindow(true)
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/swap-window`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: !swapWindowOpen }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle window')
      }

      setSwapWindowOpen(!swapWindowOpen)
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to toggle window')
    } finally {
      setIsTogglingWindow(false)
    }
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

      alert('Swap approved successfully!')
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
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(2)}M`
    }
    return `£${(amount / 1000).toFixed(0)}K`
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Swap Requests</h1>
            <p className="text-gray-400">{seasonName}</p>
          </div>
          <button
            onClick={toggleWindow}
            disabled={isTogglingWindow}
            className={`px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 ${
              swapWindowOpen
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isTogglingWindow ? 'Processing...' : swapWindowOpen ? 'Close Window' : 'Open Window'}
          </button>
        </div>

        {/* Window Status */}
        <div className={`rounded-xl p-4 ${
          swapWindowOpen
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-gray-500/10 border border-gray-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${swapWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className={`font-bold ${swapWindowOpen ? 'text-emerald-400' : 'text-gray-400'}`}>
              Swap Window {swapWindowOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
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
            {requests.filter(r => r.status === 'approved').length}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-1">Rejected</div>
          <div className="text-3xl font-black text-red-400">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
        </div>
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
                      onClick={() => openRejectModal(request)}
                      disabled={processingId === request.id}
                      className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold transition-colors border border-red-500/30 disabled:opacity-50"
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
    </>
  )
}
