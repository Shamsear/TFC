'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeForSearch } from '@/lib/search-utils'

interface Team {
  id: string
  name: string
  logoUrl: string | null
}

interface Round {
  id: string
  roundNumber: number
  roundType: string
  position: string | null
  position_group: string | null
  status: string
  basePrice: number | null
  season: {
    id: string
    name: string
    seasonNumber: number
  }
}

interface TeamBidData {
  teamId: string
  playerIds: string[]
  submitted: boolean
  submittedAt: Date | null
  bidCount: number
  invalidCount: number
  hasInvalidBids: boolean
}

interface TeamBidsClientProps {
  round: Round
  teams: Team[]
  teamBidsData: TeamBidData[]
  validationStats: {
    totalBids: number
    invalidBids: number
    teamsWithInvalidBids: number
  }
}

export default function TeamBidsClient({ round, teams, teamBidsData, validationStats }: TeamBidsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'not-submitted' | 'invalid'>('all')
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null)
  const [cleaningTeam, setCleaningTeam] = useState<string | null>(null)
  const [togglingTeam, setTogglingTeam] = useState<string | null>(null)

  const handleDeleteBids = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete all bids for ${teamName}?\n\nThis will allow them to submit new bids. This action cannot be undone.`)) {
      return
    }

    setDeletingTeam(teamId)

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/team-bids/${teamId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete bids')
      }

      alert('Bids deleted successfully. The team can now submit new bids.')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setDeletingTeam(null)
    }
  }

  const handleCleanInvalidBids = async (teamId: string, teamName: string, invalidCount: number) => {
    if (!confirm(`Remove ${invalidCount} invalid bid(s) for ${teamName}?\n\nValid bids will be kept. The team will need to review and resubmit.`)) {
      return
    }

    setCleaningTeam(teamId)

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/team-bids/${teamId}/clean-invalid`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clean invalid bids')
      }

      const data = await response.json()
      alert(data.message)
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setCleaningTeam(null)
    }
  }

  const handleToggleSubmit = async (teamId: string, teamName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'unsubmit' : 'submit'
    const message = currentStatus 
      ? `Mark ${teamName}'s bids as NOT submitted?\n\nThis will allow them to edit their bids again.`
      : `Mark ${teamName}'s bids as submitted?\n\nThis will lock their bids.`
    
    if (!confirm(message)) {
      return
    }

    setTogglingTeam(teamId)

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/team-bids/${teamId}/toggle-submit`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle submission status')
      }

      const data = await response.json()
      alert(data.message)
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setTogglingTeam(null)
    }
  }

  // Get team bids from pre-validated data
  const getTeamBids = (teamId: string): TeamBidData => {
    const teamData = teamBidsData.find(tb => tb.teamId === teamId)
    
    if (!teamData) {
      return { 
        teamId, 
        playerIds: [], 
        submitted: false, 
        submittedAt: null, 
        bidCount: 0,
        invalidCount: 0,
        hasInvalidBids: false
      }
    }

    return teamData
  }

  // Filter teams
  const filteredTeams = teams.filter(team => {
    const matchesSearch = normalizeForSearch(team.name).includes(normalizeForSearch(searchQuery))
    const teamBids = getTeamBids(team.id)
    
    if (filterStatus === 'submitted' && !teamBids.submitted) return false
    if (filterStatus === 'not-submitted' && teamBids.submitted) return false
    if (filterStatus === 'invalid' && !teamBids.hasInvalidBids) return false
    
    return matchesSearch
  })

  // Stats
  const submittedCount = teams.filter(t => getTeamBids(t.id).submitted).length
  const totalBidsCount = teams.reduce((sum, t) => sum + getTeamBids(t.id).bidCount, 0)

  return (
    <div>
      {/* Validation Warning */}
      {validationStats.invalidBids > 0 && (
        <div className="rounded-xl bg-red-500/10 border-2 border-red-500/30 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-red-300 mb-2">⚠️ Invalid Player IDs Detected</h3>
              <p className="text-red-200 mb-3">
                Some teams have placed bids on players that don't exist in the database. These bids will fail during finalization.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-black/30 border border-red-500/20 p-3">
                  <div className="text-xs text-red-300 mb-1">Invalid Bids</div>
                  <div className="text-2xl font-black text-red-400">{validationStats.invalidBids}</div>
                </div>
                <div className="rounded-lg bg-black/30 border border-red-500/20 p-3">
                  <div className="text-xs text-red-300 mb-1">Total Bids</div>
                  <div className="text-2xl font-black text-white">{validationStats.totalBids}</div>
                </div>
                <div className="rounded-lg bg-black/30 border border-red-500/20 p-3">
                  <div className="text-xs text-red-300 mb-1">Affected Teams</div>
                  <div className="text-2xl font-black text-red-400">{validationStats.teamsWithInvalidBids}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Teams Submitted</div>
          <div className="text-3xl font-black text-emerald-400">{submittedCount}/{teams.length}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Total Bids</div>
          <div className="text-3xl font-black text-[#FFB347]">{totalBidsCount}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-sm text-gray-400 mb-2">Average Bids/Team</div>
          <div className="text-3xl font-black text-[#E8A800]">
            {submittedCount > 0 ? (totalBidsCount / submittedCount).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#E8A800]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-[#E8A800] text-black'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('submitted')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'submitted'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              Submitted
            </button>
            <button
              onClick={() => setFilterStatus('not-submitted')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'not-submitted'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              Not Submitted
            </button>
            {validationStats.invalidBids > 0 && (
              <button
                onClick={() => setFilterStatus('invalid')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'invalid'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                Invalid ({validationStats.teamsWithInvalidBids})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Team List */}
      <div className="space-y-4">
        {filteredTeams.map(team => {
          const teamBids = getTeamBids(team.id)
          const hasInvalidBids = teamBids.hasInvalidBids
          const invalidCount = teamBids.invalidCount

          return (
            <div
              key={team.id}
              className={`rounded-xl border p-4 ${
                hasInvalidBids
                  ? 'bg-red-500/5 border-red-500/30'
                  : teamBids.submitted
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {team.logoUrl && (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <div className="font-bold text-white text-lg flex items-center gap-2">
                      {team.name}
                      {hasInvalidBids && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                          ⚠️ {invalidCount} Invalid
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {teamBids.bidCount} {round.roundType === 'bulk' ? 'players' : 'bids'}
                      {teamBids.submitted && teamBids.submittedAt && (
                        <span className="ml-2">
                          • Submitted {new Date(teamBids.submittedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {teamBids.submitted ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
                      ✓ Submitted
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-bold border border-gray-500/30">
                      Not Submitted
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {teamBids.bidCount > 0 && ['active', 'draft'].includes(round.status) && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {/* Toggle Submission Status */}
                  <button
                    onClick={() => handleToggleSubmit(team.id, team.name, teamBids.submitted)}
                    disabled={togglingTeam === team.id || deletingTeam === team.id || cleaningTeam === team.id}
                    className={`w-full px-4 py-2 rounded-lg border transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      teamBids.submitted
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {togglingTeam === team.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : teamBids.submitted ? (
                      '↩️ Mark as Not Submitted'
                    ) : (
                      '✓ Mark as Submitted'
                    )}
                  </button>

                  {/* Clean Invalid Bids Button */}
                  {hasInvalidBids && (
                    <button
                      onClick={() => handleCleanInvalidBids(team.id, team.name, invalidCount)}
                      disabled={cleaningTeam === team.id || deletingTeam === team.id || togglingTeam === team.id}
                      className="w-full px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleaningTeam === team.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cleaning...
                        </span>
                      ) : (
                        `🧹 Remove ${invalidCount} Invalid Bid${invalidCount > 1 ? 's' : ''}`
                      )}
                    </button>
                  )}
                  
                  {/* Delete All Bids Button */}
                  <button
                    onClick={() => handleDeleteBids(team.id, team.name)}
                    disabled={deletingTeam === team.id || cleaningTeam === team.id || togglingTeam === team.id}
                    className="w-full px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingTeam === team.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      '🗑️ Delete All Bids'
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filteredTeams.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No teams found matching your filters
          </div>
        )}
      </div>
    </div>
  )
}
