'use client'

import { useState } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PosterModal } from './SwapReleasePoster'

interface Request {
  id: string
  playerId: string
  playerName: string
  playerPhotoId: string
  refundAmount: number
  notes: string | null
  status: string | null,
  teamId: string
  teamName: string
  teamLogo: string
  currentBudget: number
  newBudget: number
  submittedAt: string | null,
  processedAt: string | null
  processedBy: string | null
  rejectionReason: string | null
  releaseWindowId: string | null
  releaseWindowName: string | null
}

interface TeamStats {
  teamId: string
  teamName: string
  teamLogo: string
  currentBudget: number
  totalRequests: number
  approvedReleases: number
  pendingRequests: number
  rejectedRequests: number
  remainingRequests: number
  remainingApprovals: number
}

interface ReleaseWindowInfo {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  releaseLimit: number
}

interface Props {
  seasonId: string
  seasonName: string
  releaseWindowOpen: boolean
  requests: Request[]
  teamStats: TeamStats[]
  releaseWindows: ReleaseWindowInfo[]
}

export default function ReleaseRequestsAdminClient({
  seasonId,
  seasonName,
  releaseWindowOpen: initialWindowOpen,
  requests: initialRequests,
  teamStats: initialTeamStats,
  releaseWindows: initialReleaseWindows = [],
}: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [teamStats] = useState(initialTeamStats)
  const [releaseWindows, setReleaseWindows] = useState<ReleaseWindowInfo[]>(initialReleaseWindows)
  const [selectedWindowId, setSelectedWindowId] = useState<string>(
    initialReleaseWindows.find(w => w.status === 'ACTIVE')?.id || 'ALL'
  )
  const [isTogglingWindow, setIsTogglingWindow] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [approvedRequest, setApprovedRequest] = useState<Request | null>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [showTeamStats, setShowTeamStats] = useState(false)
  const [bulkProcessingTeamId, setBulkProcessingTeamId] = useState<string | null>(null)
  const [selectedPosterRequest, setSelectedPosterRequest] = useState<Request | null>(null)
  const [showPosterModal, setShowPosterModal] = useState(false)

  // Filter requests by selected window
  const filteredRequests = selectedWindowId === 'ALL'
    ? requests
    : selectedWindowId 
      ? requests.filter(r => r.releaseWindowId === selectedWindowId)
      : requests

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending')
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending')

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

  const selectedWindow = releaseWindows.find(w => w.id === selectedWindowId)

  const toggleWindow = async () => {
    if (!selectedWindow) {
      alert('No release window selected')
      return
    }
    const isActive = selectedWindow.status === 'ACTIVE'
    const newStatus = isActive ? 'CLOSED' : 'ACTIVE'
    if (!confirm(`Are you sure you want to ${isActive ? 'close' : 'open'} the release window "${selectedWindow.name}"?`)) {
      return
    }

    setIsTogglingWindow(true)
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/release-windows/${selectedWindow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle window')
      }

      setReleaseWindows(prev => prev.map(w => {
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

      // Calculate the new budget after this approval
      const newTeamBudget = request.newBudget

      // Update local state - mark as approved and update budgets for remaining requests
      setRequests(requests.map(r => {
        if (r.id === request.id) {
          // Mark this request as approved
          return { ...r, status: 'approved', processedAt: new Date().toISOString() }
        } else if (r.teamId === request.teamId && r.status === 'pending') {
          // Update budget for other pending requests from the same team
          return {
            ...r,
            currentBudget: newTeamBudget,
            newBudget: newTeamBudget + r.refundAmount,
          }
        }
        return r
      }))

      // Generate WhatsApp message
      const message = generateWhatsAppMessage(request)
      setWhatsappMessage(message)
      setApprovedRequest({
        ...request,
        status: 'approved'
      })
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

  const generateWhatsAppMessage = (request: Request) => {
    return `✅ *Release Approved - ${request.teamName}*

*Player Released:* ${request.playerName}

*Financial Details:*
Refund: £${request.refundAmount.toLocaleString()}
Previous Budget: £${request.currentBudget.toLocaleString()}
New Budget: £${request.newBudget.toLocaleString()}

_Release processed by admin_`
  }

  const generateBulkWhatsAppMessage = (teamName: string, approvedRequests: Request[], finalBudget: number, initialBudget: number) => {
    const playersList = approvedRequests
      .map((req, index) => `${index + 1}. ${req.playerName} (£${req.refundAmount.toLocaleString()})`)
      .join('\n')
    
    const totalRefund = approvedRequests.reduce((sum, req) => sum + req.refundAmount, 0)
    
    return `✅ *Releases Approved - ${teamName}*

*Players Released:*
${playersList}

*Financial Summary:*
Total Refund: £${totalRefund.toLocaleString()}
Previous Budget: £${initialBudget.toLocaleString()}
New Budget: £${finalBudget.toLocaleString()}

*${approvedRequests.length} player${approvedRequests.length !== 1 ? 's' : ''} released*

_All releases processed by admin_`
  }

  const handleApproveAllForTeam = async (teamId: string, teamName: string, teamRequests: Request[]) => {
    if (!confirm(`Approve ALL ${teamRequests.length} release requests for ${teamName}?`)) {
      return
    }

    setBulkProcessingTeamId(teamId)
    const approvedRequests: Request[] = []
    let currentBudget = teamRequests[0].currentBudget
    
    try {
      // Process each request sequentially
      for (const request of teamRequests) {
        const response = await fetch(`/api/admin/release-requests/${request.id}/approve`, {
          method: 'POST',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Failed to approve ${request.playerName}: ${error.error}`)
        }

        // Update budget for next iteration
        currentBudget += request.refundAmount
        approvedRequests.push(request)

        // Update local state for this request
        setRequests(prev => prev.map(r =>
          r.id === request.id
            ? { ...r, status: 'approved', processedAt: new Date().toISOString() }
            : r
        ))
      }

      // Generate combined WhatsApp message
      const message = generateBulkWhatsAppMessage(
        teamName,
        approvedRequests,
        currentBudget,
        teamRequests[0].currentBudget
      )
      setWhatsappMessage(message)
      setApprovedRequest(null) // Use null to indicate bulk approval
      setShowSuccessModal(true)

      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to approve all requests')
      // Refresh to get accurate state
      router.refresh()
    } finally {
      setBulkProcessingTeamId(null)
    }
  }

  const copyToWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage)
    alert('Copied to clipboard! You can now paste it in WhatsApp')
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
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/tools`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Release Requests
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            {seasonName} • Process player releases and refunds
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/sub-admin/${seasonId}/transfer-windows`}
            className="px-6 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all hover:scale-105 text-xs uppercase tracking-wider cursor-pointer"
          >
            Manage Release Windows
          </Link>
        </div>
      </div>

      {/* Release Window Selection & Control */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4 backdrop-blur-xl shadow-md mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Select Release Window</label>
            {releaseWindows.length === 0 ? (
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">No release windows created. Click "Manage Release Windows" above to create one.</div>
            ) : (
              <select
                value={selectedWindowId}
                onChange={e => setSelectedWindowId(e.target.value)}
                className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
              >
                <option value="ALL">All Windows</option>
                {releaseWindows.map(w => (
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
                className={`px-6 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer ${
                  selectedWindow.status === 'ACTIVE'
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isTogglingWindow ? 'Processing...' : selectedWindow.status === 'ACTIVE' ? 'Close Window' : 'Open Window'}
              </button>
              <Link
                href={`/sub-admin/${seasonId}/transfer-windows`}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 uppercase tracking-wider"
              >
                Edit Window
              </Link>
            </div>
          )}
        </div>

        {selectedWindow && selectedWindowId !== 'ALL' && (
          <div className="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedWindow.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                selectedWindow.status === 'CLOSED' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {selectedWindow.status}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span> {new Date(selectedWindow.startDate).toLocaleDateString()} - {new Date(selectedWindow.endDate).toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-400">Limit:</span> <span className="text-[#E8A800] font-bold">{selectedWindow.releaseLimit} releases</span> per team
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-yellow-400/20">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Pending</div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">{pendingRequests.length}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-emerald-400/20">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Approved</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {filteredRequests.filter(r => r.status === 'approved').length}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-red-400/20">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Rejected</div>
          <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">
            {filteredRequests.filter(r => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Team Release Statistics - Expandable */}
      <div className="mb-8">
        <button
          onClick={() => setShowTeamStats(!showTeamStats)}
          className="w-full rounded-2xl bg-white/[0.01] border border-white/5 p-4 hover:bg-white/[0.02] hover:border-white/10 transition-all backdrop-blur-xl shadow-md cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">Team Release Statistics</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">View release usage for all {teamStats.length} teams</p>
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
          <div className="mt-4 rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamStats.map(team => (
                <div key={team.teamId} className="rounded-xl bg-white/[0.01] border border-white/5 p-4 hover:border-white/10 transition-all">
                  {/* Team Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                    {team.teamLogo && (
                      <div className="w-10 h-10 rounded overflow-hidden bg-white/5 flex-shrink-0">
                        <img src={team.teamLogo} alt={team.teamName} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate uppercase tracking-tight">{team.teamName}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Budget: {formatCurrency(team.currentBudget)}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Requests</span>
                      <span className={`text-xs font-bold ${
                        team.totalRequests >= 3 ? 'text-red-400' : 'text-white'
                      }`}>
                        {team.totalRequests}/3
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Approved</span>
                      <span className={`text-xs font-bold ${
                        team.approvedReleases >= 3 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {team.approvedReleases}/3
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pending</span>
                      <span className="text-xs font-bold text-yellow-400">{team.pendingRequests}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Rejected</span>
                      <span className="text-xs font-bold text-red-400">{team.rejectedRequests}</span>
                    </div>
                  </div>

                  {/* Remaining Slots */}
                  <div className="mt-3 pt-3 border-t border-white/5 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Remaining Slots</span>
                      <span className={`text-xs font-bold ${
                        team.remainingRequests === 0 ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {team.remainingRequests}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {team.totalRequests >= 3 && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        LIMIT REACHED
                      </span>
                    </div>
                  )}
                  {team.totalRequests === 0 && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        NO REQUESTS
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Requests - Grouped by Team */}
      {teamGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-4">Pending Requests</h2>
          <div className="space-y-6">
            {teamGroups.map(group => (
              <div key={group.teamId} className="rounded-xl bg-white/5 border border-white/10 p-6">
                {/* Team Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
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
                  
                  {/* Approve All Button */}
                  {group.requests.length > 1 && (
                    <button
                      onClick={() => handleApproveAllForTeam(group.teamId, group.teamName, group.requests)}
                      disabled={bulkProcessingTeamId === group.teamId}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-colors border border-emerald-500/30 disabled:opacity-50 flex items-center gap-2"
                    >
                      {bulkProcessingTeamId === group.teamId ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Approve All ({group.requests.length})
                        </>
                      )}
                    </button>
                  )}
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
                                Submitted: {request.submittedAt ? formatDate(request.submittedAt) : 'N/A'}
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
                              disabled={processingId === request.id || bulkProcessingTeamId === group.teamId}
                              className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-colors border border-emerald-500/30 disabled:opacity-50 text-sm"
                            >
                              {processingId === request.id ? 'Processing...' : 'Approve & Release'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPosterRequest(request)
                                setShowPosterModal(true)
                              }}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors border border-white/10 flex items-center justify-center gap-1.5 text-sm"
                              title="Preview Poster"
                            >
                              <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Poster
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={processingId === request.id || bulkProcessingTeamId === group.teamId}
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
                        {request.status ? request.status.toUpperCase() : ''}
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
                {approvedRequest ? 'Release Approved!' : 'All Releases Approved!'}
              </h3>
              <p className="text-gray-400 text-sm">
                {approvedRequest 
                  ? `${approvedRequest.playerName} has been released from ${approvedRequest.teamName}`
                  : 'All pending releases have been processed successfully'
                }
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
                  setApprovedRequest(null)
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
        type="release"
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
