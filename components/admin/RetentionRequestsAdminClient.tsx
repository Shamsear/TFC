'use client'

import { useState, useMemo } from 'react'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import Image from 'next/image'

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
  team: { id: string; name: string; logoUrl: string }
  basePlayer: { id: string; name: string; player_id: string | null; photoUrl: string }
  previousSeason: { id: string; name: string; seasonNumber: number }
  retentionWindow: { id: string; name: string; status: string } | null
  processor: { id: string; name: string; email: string } | null
}

interface Props {
  seasonId: string
  seasonName: string
  requests: RetentionRequest[]
  activeWindow: {
    id: string; name: string; startDate: string; endDate: string
    status: string; retentionLimit: number
  } | null
}

const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`

const getPhotoUrl = (playerId: string | null): string => {
  if (!playerId) return '/default-player.png'
  return getPlayerPhotoUrl(`${playerId}.webp`)
}

interface TeamGroup {
  teamId: string
  teamName: string
  teamLogo: string
  requests: RetentionRequest[]
  pendingCount: number
  totalValue: number
}

export default function RetentionRequestsAdminClient({
  seasonId, seasonName, requests: initialRequests, activeWindow,
}: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] })
  const [rejectReason, setRejectReason] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  // Group requests by team
  const teamGroups = useMemo(() => {
    const filtered = requests
      .filter(r => filter === 'all' || r.status === filter)
      .filter(r =>
        r.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const map = new Map<string, TeamGroup>()
    for (const req of filtered) {
      if (!map.has(req.team.id)) {
        map.set(req.team.id, {
          teamId: req.team.id,
          teamName: req.team.name,
          teamLogo: req.team.logoUrl,
          requests: [],
          pendingCount: 0,
          totalValue: 0,
        })
      }
      const group = map.get(req.team.id)!
      group.requests.push(req)
      if (req.status === 'pending') {
        group.pendingCount++
        group.totalValue += req.oldSquadValue
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Sort by latest submission time (newest first)
      const aLatest = a.requests.length > 0 ? Math.max(...a.requests.map(r => new Date(r.submittedAt).getTime())) : 0
      const bLatest = b.requests.length > 0 ? Math.max(...b.requests.map(r => new Date(r.submittedAt).getTime())) : 0
      return bLatest - aLatest
    })
  }, [requests, filter, searchQuery])

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length
  const totalPendingValue = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.oldSquadValue, 0)
  const teamsRequested = new Set(requests.map(r => r.team.id)).size

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectTeam = (teamRequests: RetentionRequest[]) => {
    const pendingIds = teamRequests.filter(r => r.status === 'pending').map(r => r.id)
    const allSelected = pendingIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        pendingIds.forEach(id => next.delete(id))
      } else {
        pendingIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const selectAllPending = () => {
    const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.id)
    setSelectedIds(new Set(pendingIds))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const batchApprove = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Approve ${selectedIds.size} retention request(s)? Players will be added to squads and budgets deducted.`)) return

    setProcessing(true)
    try {
      const res = await fetch('/api/admin/retention-requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestIds: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update local state
      setRequests(prev => prev.map(r =>
        selectedIds.has(r.id) ? { ...r, status: 'approved', processedAt: new Date().toISOString() } : r
      ))
      setSelectedIds(new Set())
      alert(data.message || `Approved ${data.approved} request(s)`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const batchReject = async () => {
    if (selectedIds.size === 0 || !rejectReason.trim()) return
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/retention-requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', requestIds: Array.from(selectedIds), reason: rejectReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setRequests(prev => prev.map(r =>
        selectedIds.has(r.id) ? { ...r, status: 'rejected', processedAt: new Date().toISOString(), rejectionReason: rejectReason } : r
      ))
      setSelectedIds(new Set())
      setRejectModal({ open: false, ids: [] })
      setRejectReason('')
      alert(data.message || `Rejected ${data.rejected} request(s)`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null)

  const copyRequest = (req: RetentionRequest) => {
    const text = `${req.playerName} | ${req.team.name} | ${formatCurrency(req.oldSquadValue)} | ${req.status.toUpperCase()} | From ${req.previousSeason.name}`
    navigator.clipboard.writeText(text)
    setCopiedId(req.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const [reverting, setReverting] = useState<string | null>(null)
  const [revertingTeam, setRevertingTeam] = useState<string | null>(null)

  const revertRetention = async (req: RetentionRequest) => {
    if (!confirm(`Revert retention for ${req.playerName}? This will restore £${req.oldSquadValue.toLocaleString()} to the team's budget and remove the player from their squad.`)) return
    setReverting(req.id)
    try {
      const res = await fetch(`/api/admin/retention-requests/${req.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: 'pending', processedAt: null, processedBy: null } : r
      ))
      alert(data.message || 'Retention reverted')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setReverting(null)
    }
  }

  const revertTeamApprovals = async (group: TeamGroup) => {
    const approved = group.requests.filter(r => r.status === 'approved')
    if (approved.length === 0) return
    if (!confirm(`Revert ALL ${approved.length} approved retention(s) for ${group.teamName}? This will restore budgets and remove players from squads.`)) return

    setRevertingTeam(group.teamId)
    try {
      let reverted = 0
      for (const req of approved) {
        const res = await fetch(`/api/admin/retention-requests/${req.id}/revert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) reverted++
      }

      setRequests(prev => prev.map(r =>
        r.team.id === group.teamId && r.status === 'approved'
          ? { ...r, status: 'pending', processedAt: null, processedBy: null }
          : r
      ))
      alert(`Reverted ${reverted} retention(s) for ${group.teamName}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setRevertingTeam(null)
    }
  }

  const copyTeamRequests = (group: TeamGroup) => {
    const approved = group.requests.filter(r => r.status === 'approved')
    const pending = group.requests.filter(r => r.status === 'pending')
    const rejected = group.requests.filter(r => r.status === 'rejected')

    const lines = [
      `🔥 *OFFICIAL RETENTION UPDATE* 🔥`,
      `🏆 *${seasonName.toUpperCase()}*`,
      ``,
      `🔴⚪ *CLUB: ${group.teamName.toUpperCase()}*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ]

    if (approved.length > 0) {
      lines.push(`🔒 *RETAINED PLAYERS*`)
      for (const r of approved) {
        lines.push(``) 
        lines.push(`👤 *${r.playerName}* ➔ ${formatCurrency(r.oldSquadValue)}`)
      }
      lines.push(``)
    }

    if (rejected.length > 0) {
      lines.push(`❌ *RELEASED PLAYERS*`)
      for (const r of rejected) {
        lines.push(``) 
        lines.push(`👤 *${r.playerName}* ➔ ${formatCurrency(r.oldSquadValue)}`)
      }
      lines.push(``)
    }

    if (pending.length > 0) {
      lines.push(`⏳ *PENDING APPROVAL*`)
      for (const r of pending) {
        lines.push(``) 
        lines.push(`👤 *${r.playerName}* ➔ ${formatCurrency(r.oldSquadValue)}`)
      }
      lines.push(``)
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`*Roster Locked & Ready for Battle!* ⚽🔥`)

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedTeamId(group.teamId)
    setTimeout(() => setCopiedTeamId(null), 1500)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back */}
      <div className="mb-4">
        <a href={`/sub-admin/${seasonId}/retention`} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Retention
        </a>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none mb-1">
            Retention Requests
          </h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">{seasonName}</p>
        </div>
        <a href={`/sub-admin/${seasonId}/retention-windows`} className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 text-white rounded-lg font-bold hover:bg-white/[0.06] transition-all text-xs font-mono uppercase">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Windows
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Total</p>
          <p className="text-xl font-black text-white">{requests.length}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Pending</p>
          <p className="text-xl font-black text-yellow-500">{pendingCount}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Approved</p>
          <p className="text-xl font-black text-green-500">{approvedCount}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Rejected</p>
          <p className="text-xl font-black text-red-500">{rejectedCount}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Teams Requested</p>
          <p className="text-xl font-black text-blue-400">{teamsRequested}</p>
        </div>
        <div className="bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase">Pending Value</p>
          <p className="text-xl font-black text-[#E8A800]">{formatCurrency(totalPendingValue)}</p>
        </div>
      </div>

      {/* Toolbar: Filters + Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status Filter */}
        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 font-mono">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${filter === s ? 'bg-[#E8A800] text-black' : 'text-gray-500 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-xs font-mono" />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono">{selectedIds.size} selected</span>
            <button onClick={batchApprove} disabled={processing}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50 font-mono">
              ✓ Approve All
            </button>
            <button onClick={() => setRejectModal({ open: true, ids: Array.from(selectedIds) })} disabled={processing}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50 font-mono">
              ✕ Reject All
            </button>
            <button onClick={clearSelection} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-lg transition-all font-mono">
              Clear
            </button>
          </div>
        )}
        {pendingCount > 0 && selectedIds.size === 0 && (
          <button onClick={selectAllPending}
            className="px-3 py-1.5 bg-[#E8A800]/20 hover:bg-[#E8A800]/30 text-[#E8A800] text-xs font-black rounded-lg transition-all font-mono">
            Select All Pending
          </button>
        )}
      </div>

      {/* Team Groups */}
      {teamGroups.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-400 font-mono text-sm">No retention requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamGroups.map(group => {
            const isExpanded = expandedTeams.has(group.teamId)
            const allPendingSelected = group.requests.filter(r => r.status === 'pending').every(r => selectedIds.has(r.id))
            const someSelected = group.requests.some(r => selectedIds.has(r.id))

            return (
              <div key={group.teamId} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                {/* Team Header */}
                <div
                  onClick={() => toggleTeam(group.teamId)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  {/* Team Select Checkbox */}
                  {group.pendingCount > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelectTeam(group.requests) }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        allPendingSelected ? 'bg-[#E8A800] border-[#E8A800]' : someSelected ? 'bg-[#E8A800]/50 border-[#E8A800]/50' : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {(allPendingSelected || someSelected) && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Team Logo */}
                  {group.teamLogo ? (
                    <Image src={group.teamLogo} alt={group.teamName} width={28} height={28} className="rounded-md object-contain" unoptimized />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {group.teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <span className="font-black text-white text-sm">{group.teamName}</span>

                  <span className="text-[10px] font-mono text-gray-500">{group.requests.length} request{group.requests.length !== 1 ? 's' : ''}</span>

                  {group.pendingCount > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] font-black text-yellow-400 font-mono">
                      {group.pendingCount} pending • {formatCurrency(group.totalValue)}
                    </span>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Copy All Requests */}
                    <button
                      onClick={e => { e.stopPropagation(); copyTeamRequests(group) }}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="Copy all requests"
                    >
                      {copiedTeamId === group.teamId ? (
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>

                    {/* Revert All Approved */}
                    {group.requests.some(r => r.status === 'approved') && (
                      <button
                        onClick={e => { e.stopPropagation(); revertTeamApprovals(group) }}
                        disabled={revertingTeam === group.teamId}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Revert all approved retentions"
                      >
                        {revertingTeam === group.teamId ? (
                          <svg className="w-3.5 h-3.5 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" /></svg>
                        )}
                      </button>
                    )}

                    {/* Expand Arrow */}
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Player Cards (expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    {group.requests.map(req => {
                      const isSelected = selectedIds.has(req.id)
                      return (
                        <div key={req.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                            isSelected ? 'bg-[#E8A800]/10 border-[#E8A800]/30' :
                            req.status === 'approved' ? 'bg-green-500/5 border-green-500/10' :
                            req.status === 'rejected' ? 'bg-red-500/5 border-red-500/10' :
                            'bg-white/[0.02] border-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Checkbox */}
                          {req.status === 'pending' && (
                            <button onClick={() => toggleSelect(req.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                isSelected ? 'bg-[#E8A800] border-[#E8A800]' : 'border-white/20 hover:border-white/40'
                              }`}>
                              {isSelected && <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          )}

                          {/* Player Photo */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            <img src={getPhotoUrl(req.basePlayer.player_id)} alt={req.playerName} className="w-full h-full object-cover" />
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{req.playerName}</p>
                            <p className="text-[10px] text-gray-500 font-mono">From {req.previousSeason.name}</p>
                          </div>

                          {/* Value */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-[#E8A800]">{formatCurrency(req.oldSquadValue)}</p>
                          </div>

                          {/* Status Badge */}
                          <div className={`px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase flex-shrink-0 ${
                            req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {req.status}
                          </div>

                          {/* Copy Button */}
                          {(req.status === 'approved' || req.status === 'rejected') && (
                            <button
                              onClick={() => copyRequest(req)}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                              title="Copy details"
                            >
                              {copiedId === req.id ? (
                                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              )}
                            </button>
                          )}

                          {/* Revert Button (approved only) */}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => revertRetention(req)}
                              disabled={reverting === req.id}
                              className="p-1.5 rounded hover:bg-red-500/10 transition-colors flex-shrink-0 disabled:opacity-50"
                              title="Revert retention"
                            >
                              {reverting === req.id ? (
                                <svg className="w-3.5 h-3.5 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" /></svg>
                              )}
                            </button>
                          )}

                          {/* Time */}
                          <span className="text-[9px] text-gray-600 font-mono flex-shrink-0 hidden sm:block">{formatDate(req.submittedAt)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-black text-white mb-2 font-mono">Reject {rejectModal.ids.length} Request(s)</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Provide a reason for rejection:</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter reason..." autoFocus
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/30 text-sm font-mono resize-none mb-4" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal({ open: false, ids: [] }); setRejectReason('') }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all text-sm font-mono">Cancel</button>
              <button onClick={batchReject} disabled={!rejectReason.trim() || processing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 text-sm font-mono">
                {processing ? 'Rejecting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
