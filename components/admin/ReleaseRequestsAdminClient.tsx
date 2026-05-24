'use client'

import { useState } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Request {
  id: string
  playerId: string
  playerName: string
  playerPhotoId: string
  refundAmount: number
  notes: string | null
  status: string
  teamId: string
  teamName: string
  teamLogo: string
  currentBudget: number
  newBudget: number
  submittedAt: string
  processedAt: string | null
  processedBy: string | null
  rejectionReason: string | null
}

interface Props {
  seasonId: string
  seasonName: string
  releaseWindowOpen: boolean
  requests: Request[]
}

export default function ReleaseRequestsAdminClient({
  seasonId,
  seasonName,
  releaseWindowOpen: initialWindowOpen,
  requests: initialRequests,
}: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [releaseWindowOpen, setReleaseWindowOpen] = useState(initialWindowOpen)
  const [isTogglingWindow, setIsTogglingWindow] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  // Group pending requests by team
  const pendingByTeam = pendingRequests.reduce((acc, request) => {
    if (!acc[request.teamId]) {
      acc[request.teamId] = {
        teamId: request.teamId,
        teamName: request.teamName,
        teamLogo: request.teamLogo,
        requests: [],
      }
    }
    acc[request.teamId].requests.push(request)
    return acc
  }, {} as Record<string, { teamId: string; teamName: string; teamLogo: string; requests: Request[] }>)

  const teamGroups = Object.values(pendingByTeam)

  const toggleWindow = async () => {
    if (!confirm(`Are you sure you want to ${releaseWindowOpen ? 'close' : 'open'} the release window?`)) {
      return
    }

    setIsTogglingWindow(true)
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/release-window`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: !releaseWindowOpen }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle window')
      }

      setReleaseWindowOpen(!releaseWindowOpen)
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to toggle window')
    } finally {
      setIsTogglingWindow(false)
    }
  }

  const handleApprove = async (request: Request) => {
    if (!confirm(`Approve release of ${request.playerName} from ${request.teamName}?`)) {
      return
    }

    setProcessingId(request.id)
    try {
      const response = await fetch(`/api/admin/release-requests/${request.id}/approve`, {
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

      alert('Release approved successfully!')
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
      const response = await fetch(`/api/admin/release-requests/${rejectingRequest.id}/reject`, {
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
    return `£${amount.toLocaleString()}`
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
            <h1 className="text-3xl font-black text-white mb-2">Release Requests</h1>
            <p className="text-gray-400">{seasonName}</p>
          </div>
          <button
            onClick={toggleWindow}
            disabled={isTogglingWindow}
            className={`px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 ${
              releaseWindowOpen
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isTogglingWindow ? 'Processing...' : releaseWindowOpen ? 'Close Window' : 'Open Window'}
          </button>
        </div>

        {/* Window Status */}
        <div className={`rounded-xl p-4 ${
          releaseWindowOpen
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-gray-500/10 border border-gray-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${releaseWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className={`font-bold ${releaseWindowOpen ? 'text-emerald-400' : 'text-gray-400'}`}>
              Release Window {releaseWindowOpen ? 'OPEN' : 'CLOSED'}
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

      {/* Pending Requests - Grouped by Team */}
      {teamGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-4">Pending Requests</h2>
          <div className="space-y-6">
            {teamGroups.map(group => (
              <div key={group.teamId} className="rounded-xl bg-white/5 border border-white/10 p-6">
                {/* Team Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                  {group.teamLogo && (
                    <div className="w-10 h-10 rounded overflow-hidden bg-white/5">
                      <img src={group.teamLogo} alt={group.teamName} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black text-white">{group.teamName}</h3>
                    <p className="text-sm text-gray-400">{group.requests.length} request{group.requests.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Team's Requests */}
                <div className="space-y-4">
                  {group.requests.map(request => (
                    <div key={request.id} className="rounded-xl bg-[#111111] border border-yellow-500/30 p-4">
                      <div className="flex items-start gap-4">
                        {/* Player Info */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(`${request.playerPhotoId}.webp`)}
                            alt={request.playerName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-black text-white mb-1">{request.playerName}</h4>
                              <div className="text-xs text-gray-400">
                                Submitted: {formatDate(request.submittedAt)}
                              </div>
                            </div>
                          </div>

                          {/* Budget Info */}
                          <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Refund</div>
                              <div className="text-sm font-black text-[#E8A800]">{formatCurrency(request.refundAmount)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Current Budget</div>
                              <div className="text-sm font-black text-white">{formatCurrency(request.currentBudget)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 mb-1">New Budget</div>
                              <div className="text-sm font-black text-emerald-400">{formatCurrency(request.newBudget)}</div>
                            </div>
                          </div>

                          {request.notes && (
                            <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
                              <div className="text-xs text-gray-400 mb-1">Notes</div>
                              <div className="text-sm text-gray-300">{request.notes}</div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={processingId === request.id}
                              className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-colors border border-emerald-500/30 disabled:opacity-50 text-sm"
                            >
                              {processingId === request.id ? 'Processing...' : 'Approve & Release'}
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={processingId === request.id}
                              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold transition-colors border border-red-500/30 disabled:opacity-50 text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-black text-white mb-4">Processed Requests</h2>
          <div className="space-y-3">
            {processedRequests.map(request => (
              <div key={request.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={getPlayerPhotoUrl(`${request.playerPhotoId}.webp`)}
                        alt={request.playerName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-bold text-white">{request.playerName}</div>
                      <div className="text-sm text-gray-400">{request.teamName} • {formatCurrency(request.refundAmount)}</div>
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
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">No Requests</h3>
          <p className="text-gray-400">No release requests have been submitted yet</p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingRequest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-black text-white mb-4">Reject Release Request</h3>
            <p className="text-gray-400 mb-4">
              Rejecting release of <span className="text-white font-bold">{rejectingRequest.playerName}</span> from{' '}
              <span className="text-white font-bold">{rejectingRequest.teamName}</span>
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
