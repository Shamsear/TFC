'use client'

import { useState } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import TeamLogo from '@/components/team/TeamLogo'

interface RetentionRequest {
  id: string
  playerId: string
  playerName: string
  oldSquadValue: number
  notes: string | null
  status: string
  submittedAt: string
  processedAt: string | null
  rejectionReason: string | null
  team: {
    id: string
    name: string
    logoUrl: string
  }
  basePlayer: {
    id: string
    name: string
    player_id: string | null
    photoUrl: string
  }
  previousSeason: {
    id: string
    name: string
    seasonNumber: number
  }
  retentionWindow: {
    id: string
    name: string
    status: string
  } | null
  processor: {
    id: string
    name: string
    email: string
  } | null
}

interface Props {
  seasonId: string
  seasonName: string
  requests: RetentionRequest[]
  activeWindow: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
    retentionLimit: number
  } | null
}

const formatCurrency = (amount: number) => {
  return `£${(amount).toLocaleString()}`
}

export default function RetentionRequestsAdminClient({
  seasonId,
  seasonName,
  requests: initialRequests,
  activeWindow,
}: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const filteredRequests = requests
    .filter(req => filter === 'all' || req.status === filter)
    .filter(req =>
      req.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.team.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length

  const handleApprove = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this retention request? The player will be added to the team\'s squad and budget will be deducted.')) {
      return
    }

    setProcessingId(requestId)
    try {
      const response = await fetch(`/api/admin/retention-requests/${requestId}/approve`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve request')
      }

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId
            ? { ...req, status: 'approved', processedAt: new Date().toISOString() }
            : req
        )
      )

      alert('Retention request approved successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setProcessingId(selectedRequestId)
    try {
      const response = await fetch(`/api/admin/retention-requests/${selectedRequestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject request')
      }

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === selectedRequestId
            ? { ...req, status: 'rejected', processedAt: new Date().toISOString(), rejectionReason }
            : req
        )
      )

      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedRequestId(null)
      alert('Retention request rejected successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setProcessingId(null)
    }
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
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#E8A800]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-8 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)] font-mono uppercase">
              Retention Requests
            </span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
            Review and process player retention requests <span className="text-gray-600">•</span> {seasonName}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Total Requests</p>
            <p className="text-2xl font-black text-white">{requests.length}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-black text-yellow-500">{pendingCount}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-black text-green-500">{approvedCount}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-2xl font-black text-red-500">{rejectedCount}</p>
          </div>
        </div>

        {/* Active Window Info */}
        {activeWindow && (
          <div className="mb-8 p-4 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#E8A800] font-mono">{activeWindow.name}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {formatDate(activeWindow.startDate)} - {formatDate(activeWindow.endDate)}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">Max retentions per team: {activeWindow.retentionLimit}</p>
              </div>
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-xs font-black text-green-400 font-mono uppercase">{activeWindow.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 font-mono">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  filter === status
                    ? 'bg-[#E8A800] text-black shadow-lg'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search players or teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
          />
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 font-mono">No retention requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div
                key={request.id}
                className={`bg-white/5 rounded-xl p-6 border ${
                  request.status === 'pending'
                    ? 'border-yellow-500/20'
                    : request.status === 'approved'
                    ? 'border-green-500/20'
                    : 'border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Player & Team Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image
                        src={getPlayerPhotoUrl(request.basePlayer.player_id)}
                        alt={request.playerName}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-white text-lg mb-1">{request.playerName}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <TeamLogo logoUrl={request.team.logoUrl} teamName={request.team.name} size="sm" />
                        <p className="text-sm text-gray-400 font-mono">{request.team.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">From {request.previousSeason.name}</p>
                      <p className="text-xs text-gray-600 font-mono">Submitted {formatDate(request.submittedAt)}</p>
                      {request.retentionWindow && (
                        <p className="text-xs text-gray-600 font-mono">Window: {request.retentionWindow.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Value & Actions */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-[#E8A800] mb-2">{formatCurrency(request.oldSquadValue)}</p>
                    <div className={`inline-block px-3 py-1 rounded-lg text-xs font-black font-mono uppercase mb-4 ${
                      request.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        : request.status === 'approved'
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                      {request.status}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-mono"
                        >
                          {processingId === request.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequestId(request.id)
                            setShowRejectModal(true)
                          }}
                          disabled={processingId === request.id}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-mono"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {request.status !== 'pending' && request.processedAt && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 font-mono">Processed {formatDate(request.processedAt)}</p>
                        {request.processor && (
                          <p className="text-xs text-gray-600 font-mono">By {request.processor.name}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {request.notes && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Team Notes</p>
                    <p className="text-sm text-gray-300 font-mono">{request.notes}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {request.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-500 font-mono uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-400 font-mono">{request.rejectionReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-black text-white mb-4 font-mono">Reject Retention Request</h3>
            <p className="text-sm text-gray-400 mb-4 font-mono">Please provide a reason for rejection:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono resize-none mb-4"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setSelectedRequestId(null)
                }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId !== null}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
              >
                {processingId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
