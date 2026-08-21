'use client'

import { useState } from 'react'
import TeamLogo from '@/components/team/TeamLogo'

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

interface Props {
  seasonId: string
  seasonName: string
  windows: RetentionWindow[]
  teams: Team[]
}

export default function RetentionWindowsClient({
  seasonId,
  seasonName,
  windows: initialWindows,
  teams,
}: Props) {
  const [windows, setWindows] = useState(initialWindows)
  const [showModal, setShowModal] = useState(false)
  const [editingWindow, setEditingWindow] = useState<RetentionWindow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [retentionLimit, setRetentionLimit] = useState(3)
  const [bannedTeamIds, setBannedTeamIds] = useState<string[]>([])

  const openCreateModal = () => {
    setEditingWindow(null)
    setName('')
    setStartDate('')
    setEndDate('')
    setRetentionLimit(3)
    setBannedTeamIds([])
    setShowModal(true)
  }

  const openEditModal = (window: RetentionWindow) => {
    setEditingWindow(window)
    setName(window.name)
    setStartDate(window.startDate.slice(0, 16)) // Format for datetime-local
    setEndDate(window.endDate.slice(0, 16))
    setRetentionLimit(window.retentionLimit)
    setBannedTeamIds(window.bannedTeamIds ? JSON.parse(window.bannedTeamIds) : [])
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !startDate || !endDate) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingWindow
        ? `/api/admin/retention-windows/${editingWindow.id}`
        : '/api/admin/retention-windows'

      const response = await fetch(url, {
        method: editingWindow ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          name,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          retentionLimit,
          bannedTeamIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save window')
      }

      // Refresh windows list
      const refreshResponse = await fetch(`/api/admin/retention-windows?seasonId=${seasonId}`)
      const refreshData = await refreshResponse.json()
      setWindows(refreshData.windows)

      setShowModal(false)
      alert(editingWindow ? 'Window updated successfully!' : 'Window created successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (windowId: string) => {
    if (!confirm('Are you sure you want to delete this retention window?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/retention-windows/${windowId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete window')
      }

      setWindows(windows.filter(w => w.id !== windowId))
      alert('Window deleted successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const toggleBannedTeam = (teamId: string) => {
    setBannedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
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
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#E8A800]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl mb-8 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)] font-mono uppercase">
                  Retention Windows
                </span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                Manage retention windows and team eligibility <span className="text-gray-600">•</span> {seasonName}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFD066] text-black font-black rounded-xl transition-all font-mono uppercase tracking-wider shadow-lg shadow-[#E8A800]/20"
            >
              + Create Window
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {windows.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 font-mono mb-4">No retention windows created yet</p>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFD066] text-black font-black rounded-xl transition-all font-mono uppercase"
            >
              Create First Window
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {windows.map(window => {
              const bannedTeams = window.bannedTeamIds ? JSON.parse(window.bannedTeamIds) : []
              
              return (
                <div
                  key={window.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-black text-white font-mono">{window.name}</h3>
                        <div className={`px-3 py-1 rounded-lg text-xs font-black font-mono uppercase border ${getStatusColor(window.status)}`}>
                          {window.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Start Date</p>
                          <p className="text-sm text-white font-mono">{formatDate(window.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">End Date</p>
                          <p className="text-sm text-white font-mono">{formatDate(window.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Retention Limit</p>
                          <p className="text-sm text-white font-mono">{window.retentionLimit} players per team</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Banned Teams</p>
                          <p className="text-sm text-white font-mono">{bannedTeams.length} team{bannedTeams.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {bannedTeams.length > 0 && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-xs text-red-500 font-mono uppercase tracking-wider mb-2">Banned Teams</p>
                          <div className="flex flex-wrap gap-2">
                            {bannedTeams.map((teamId: string) => {
                              const team = teams.find(t => t.id === teamId)
                              return team ? (
                                <div key={teamId} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg">
                                  <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                                  <span className="text-xs text-gray-300 font-mono">{team.name}</span>
                                </div>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(window)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all text-xs font-mono"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(window.id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all text-xs font-mono"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-black text-white mb-6 font-mono">
              {editingWindow ? 'Edit Retention Window' : 'Create Retention Window'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
                  Window Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Pre-Season Retention Window"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              {/* Retention Limit */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
                  Retention Limit (per team) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={retentionLimit}
                  onChange={(e) => setRetentionLimit(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/30 text-sm font-mono"
                  required
                />
                <p className="text-xs text-gray-500 font-mono mt-1">Maximum number of players each team can retain</p>
              </div>

              {/* Banned Teams */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-3">
                  Banned Teams (Optional)
                </label>
                <div className="max-h-60 overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-4 space-y-2">
                  {teams.length === 0 ? (
                    <p className="text-sm text-gray-500 font-mono text-center py-4">No teams available</p>
                  ) : (
                    teams.map(team => (
                      <label
                        key={team.id}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={bannedTeamIds.includes(team.id)}
                          onChange={() => toggleBannedTeam(team.id)}
                          className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0"
                        />
                        <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="sm" />
                        <span className="text-sm text-white font-mono">{team.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-2">
                  Selected teams will not be able to submit retention requests
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#E8A800] hover:bg-[#FFD066] text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono uppercase"
                >
                  {isSubmitting ? 'Saving...' : editingWindow ? 'Update Window' : 'Create Window'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
