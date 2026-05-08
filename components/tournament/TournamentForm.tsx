'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  teamId: string
  name: string
  logoUrl: string
}

interface TournamentFormProps {
  seasonId: string
  teams: Team[]
}

const tournamentTypes = [
  {
    value: 'LEAGUE_ONLY',
    label: 'League Only',
    description: 'Round-robin format where every team plays each other'
  },
  {
    value: 'LEAGUE_PLAYOFF',
    label: 'League + Playoff',
    description: 'League stage followed by playoff knockout rounds'
  },
  {
    value: 'GROUP_KNOCKOUT',
    label: 'Group Stage + Knockout',
    description: 'Group stage followed by knockout elimination rounds'
  },
  {
    value: 'KNOCKOUT_ONLY',
    label: 'Knockout Only',
    description: 'Direct elimination tournament bracket'
  }
]

export default function TournamentForm({ seasonId, teams }: TournamentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    tournamentType: 'LEAGUE_ONLY',
    startDate: '',
    endDate: '',
    description: '',
    selectedTeams: [] as string[],
    numGroups: 2,
    teamsPerGroup: 4
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create tournament')
      }

      const tournament = await response.json()
      router.push(`/sub-admin/${seasonId}/tournaments/${tournament.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId]
    }))
  }

  const selectAllTeams = () => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: teams.map(t => t.id)
    }))
  }

  const clearTeams = () => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: []
    }))
  }

  const needsGroups = formData.tournamentType === 'GROUP_KNOCKOUT'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-2xl font-black text-white mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Premier League, Champions Cup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Optional tournament description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Type */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-2xl font-black text-white mb-6">Tournament Format</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournamentTypes.map((type) => (
            <label
              key={type.value}
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                formData.tournamentType === type.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="tournamentType"
                value={type.value}
                checked={formData.tournamentType === type.value}
                onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value })}
                className="sr-only"
              />
              <div className="font-bold text-white mb-1">{type.label}</div>
              <div className="text-sm text-gray-400">{type.description}</div>
            </label>
          ))}
        </div>

        {needsGroups && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Groups
              </label>
              <input
                type="number"
                min="2"
                max="8"
                value={formData.numGroups}
                onChange={(e) => setFormData({ ...formData, numGroups: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teams Per Group
              </label>
              <input
                type="number"
                min="2"
                max="8"
                value={formData.teamsPerGroup}
                onChange={(e) => setFormData({ ...formData, teamsPerGroup: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Team Selection */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">
            Select Teams ({formData.selectedTeams.length} selected)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllTeams}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearTeams}
              className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map((team) => (
            <label
              key={team.id}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                formData.selectedTeams.includes(team.id)
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.selectedTeams.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
                className="sr-only"
              />
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">⚽</span>
                  )}
                </div>
                <div className="text-sm font-medium text-white truncate">{team.name}</div>
              </div>
            </label>
          ))}
        </div>

        {formData.selectedTeams.length < 2 && (
          <div className="mt-4 text-sm text-yellow-400">
            Please select at least 2 teams to create a tournament
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || formData.selectedTeams.length < 2}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </form>
  )
}
