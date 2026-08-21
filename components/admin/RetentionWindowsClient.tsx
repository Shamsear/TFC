'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import TeamLogo from '@/components/team/TeamLogo'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface RetentionWindow {
  id: string
  seasonId: string
  name: string
  startDate: string
  endDate: string
  status: string
  retentionLimit: number
  bannedTeamIds: string | null
  createdAt: string
  updatedAt: string
}

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface IneligibleTeam {
  teamId: string
  teamName: string
  teamLogoUrl: string
  managerName: string
}

interface Props {
  seasonId: string
  seasonName: string
  windows: RetentionWindow[]
  teams: Team[]
  ineligibleTeams?: IneligibleTeam[]
}

export default function RetentionWindowsClient({
  seasonId,
  seasonName,
  windows,
  teams,
  ineligibleTeams = [],
}: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const handleDelete = async (windowId: string) => {
    if (!confirm('Are you sure you want to delete this retention window?')) return

    setDeletingId(windowId)
    try {
      const response = await fetch(`/api/admin/retention-windows/${windowId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete window')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleActivate = async (windowId: string) => {
    setActivatingId(windowId)
    try {
      // Deactivate all currently active windows for this season
      const activeWindows = windows.filter((w) => w.status === 'ACTIVE' && w.id !== windowId)
      for (const w of activeWindows) {
        await fetch(`/api/admin/retention-windows/${w.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'UPCOMING' }),
        })
      }

      // Activate the selected window
      const response = await fetch(`/api/admin/retention-windows/${windowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to activate window')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setActivatingId(null)
    }
  }

  const handleDeactivate = async (windowId: string) => {
    setActivatingId(windowId)
    try {
      const response = await fetch(`/api/admin/retention-windows/${windowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'UPCOMING' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate window')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setActivatingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'UPCOMING':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'CLOSED':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
      default:
        return 'bg-white/10 text-gray-400 border-white/20'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/retention`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Retention
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Retention Windows
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            Manage retention windows and team eligibility for {seasonName}
          </p>
        </div>
        <Link
          href={`/sub-admin/${seasonId}/retention-windows/new`}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-xs sm:text-sm font-mono uppercase"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Window
        </Link>
      </div>

      {/* Ineligible Teams */}
      {ineligibleTeams.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-yellow-400 uppercase tracking-wider font-mono">
                Not Eligible for Retention
              </div>
              <div className="text-[10px] text-gray-500 font-bold font-mono">
                {ineligibleTeams.length} manager{ineligibleTeams.length !== 1 ? 's' : ''} did not participate in the previous season
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ineligibleTeams.map((t) => (
              <div
                key={t.teamId}
                className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/5 border border-yellow-500/15 rounded-lg"
              >
                <TeamLogo logoUrl={t.teamLogoUrl} teamName={t.teamName} size="xs" />
                <span className="text-[11px] text-gray-300 font-mono font-bold">{t.teamName}</span>
                {t.managerName && (
                  <span className="text-[9px] text-gray-500 font-mono">({t.managerName})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Windows List */}
      {windows.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-8 sm:p-12 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No Windows Yet</div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono mb-6">
            Create a retention window to set limits and eligible teams
          </p>
          <Link
            href={`/sub-admin/${seasonId}/retention-windows/new`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-sm font-mono uppercase"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create First Window
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {windows.map((window) => {
            const bannedTeams = window.bannedTeamIds ? JSON.parse(window.bannedTeamIds) : []
            const isActive = window.status === 'ACTIVE'
            const isActivating = activatingId === window.id

            return (
              <div
                key={window.id}
                className={`bg-white/[0.01] border rounded-2xl p-6 backdrop-blur-xl shadow-md transition-all ${
                  isActive ? 'border-green-500/20 hover:border-green-500/30' : 'border-white/5 hover:border-[#E8A800]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg sm:text-xl font-black text-white font-mono truncate">{window.name}</h3>
                      <div className={`px-3 py-1 rounded-lg text-xs font-black font-mono uppercase border flex-shrink-0 ${getStatusColor(window.status)}`}>
                        {window.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Start (IST)</div>
                        <div className="text-xs sm:text-sm text-white font-mono">{formatDate(window.startDate)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">End (IST)</div>
                        <div className="text-xs sm:text-sm text-white font-mono">{formatDate(window.endDate)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Limit</div>
                        <div className="text-xs sm:text-sm text-white font-mono">{window.retentionLimit} per team</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Banned</div>
                        <div className="text-xs sm:text-sm text-white font-mono">{bannedTeams.length} team{bannedTeams.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    {bannedTeams.length > 0 && (
                      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                        <div className="text-[9px] text-red-400 font-extrabold uppercase tracking-widest font-mono mb-2">Banned Teams</div>
                        <div className="flex flex-wrap gap-2">
                          {bannedTeams.map((teamId: string) => {
                            const team = teams.find((t) => t.id === teamId)
                            return team ? (
                              <div key={teamId} className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg">
                                <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                                <span className="text-[11px] text-gray-300 font-mono font-bold">{team.name}</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Activate / Deactivate Button */}
                    {isActive ? (
                      <button
                        onClick={() => handleDeactivate(window.id)}
                        disabled={isActivating}
                        className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-lg transition-all text-xs font-mono disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isActivating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        )}
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(window.id)}
                        disabled={isActivating}
                        className="px-4 py-2 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 font-bold rounded-lg transition-all text-xs font-mono disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isActivating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        Activate
                      </button>
                    )}
                    <Link
                      href={`/sub-admin/${seasonId}/retention-windows/${window.id}/edit`}
                      className="px-4 py-2 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white font-bold rounded-lg transition-all text-xs font-mono text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(window.id)}
                      disabled={deletingId === window.id}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold rounded-lg transition-all text-xs font-mono disabled:opacity-50"
                    >
                      {deletingId === window.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
