'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  teamId: string
  name: string
  logoUrl: string
}

interface TournamentFormAdvancedProps {
  seasonId: string
  teams: Team[]
}

const tournamentTypes = [
  { value: 'LEAGUE_ONLY', label: 'League Only' },
  { value: 'LEAGUE_PLAYOFF', label: 'League + Playoff' },
  { value: 'GROUP_KNOCKOUT', label: 'Group Stage + Knockout' },
  { value: 'KNOCKOUT_ONLY', label: 'Knockout Only' }
]

export default function TournamentFormAdvanced({ seasonId, teams }: TournamentFormAdvancedProps) {
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
    
    // League settings
    leagueLegs: 2, // 1 or 2
    playoffFormat: 'TOP_4_SEMI', // TOP_2_SEMI, TOP_4_SEMI, TOP_8_QUARTER, TOP_3_6_PLAYOFF
    
    // Group settings
    numGroups: 2,
    groupLegs: 2, // 1 or 2
    groupQualifiers: 2, // Top 2 or Top 3 qualify
    
    // Knockout settings
    knockoutLegs: 2 // 1 or 2 per round (can be customized per round later)
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
    setFormData(prev => ({ ...prev, selectedTeams: teams.map(t => t.id) }))
  }

  const clearTeams = () => {
    setFormData(prev => ({ ...prev, selectedTeams: [] }))
  }

  const showLeagueSettings = formData.tournamentType === 'LEAGUE_ONLY' || formData.tournamentType === 'LEAGUE_PLAYOFF'
  const showPlayoffSettings = formData.tournamentType === 'LEAGUE_PLAYOFF'
  const showGroupSettings = formData.tournamentType === 'GROUP_KNOCKOUT'
  const showKnockoutSettings = formData.tournamentType === 'KNOCKOUT_ONLY' || formData.tournamentType === 'GROUP_KNOCKOUT' || formData.tournamentType === 'LEAGUE_PLAYOFF'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-[#7A7367] focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              placeholder="e.g., Premier League, Champions Cup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-[#7A7367] focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base resize-none"
              placeholder="Optional tournament description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Type */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Tournament Format</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tournamentTypes.map((type) => (
            <label
              key={type.value}
              className={`relative cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                formData.tournamentType === type.value
                  ? 'border-[#E8A800] bg-[#E8A800]/10'
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
              <div className="font-bold text-white text-sm sm:text-base">{type.label}</div>
            </label>
          ))}
        </div>
      </div>

      {/* League Settings */}
      {showLeagueSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">League Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                League Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.leagueLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="leagueLegs"
                    checked={formData.leagueLegs === 1}
                    onChange={() => setFormData({ ...formData, leagueLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Each team plays once</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.leagueLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="leagueLegs"
                    checked={formData.leagueLegs === 2}
                    onChange={() => setFormData({ ...formData, leagueLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Double Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away matches</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playoff Settings */}
      {showPlayoffSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Playoff Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Playoff Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_2_SEMI'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_2_SEMI"
                    checked={formData.playoffFormat === 'TOP_2_SEMI'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 2 → Semi Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Direct to semi finals</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_4_SEMI'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_4_SEMI"
                    checked={formData.playoffFormat === 'TOP_4_SEMI'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 4 → Semi Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">1v4, 2v3 in semis</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_8_QUARTER'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_8_QUARTER"
                    checked={formData.playoffFormat === 'TOP_8_QUARTER'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 8 → Quarter Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Full playoff bracket</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_3_6_PLAYOFF'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_3_6_PLAYOFF"
                    checked={formData.playoffFormat === 'TOP_3_6_PLAYOFF'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 2 Direct + 3-6 Playoff</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">3v6, 4v5 → winners to semis</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings */}
      {showGroupSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Group Stage Settings</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                  Number of Groups
                </label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={formData.numGroups}
                  onChange={(e) => setFormData({ ...formData, numGroups: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                  Teams Qualify Per Group
                </label>
                <select
                  value={formData.groupQualifiers}
                  onChange={(e) => setFormData({ ...formData, groupQualifiers: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
                >
                  <option value="2">Top 2</option>
                  <option value="3">Top 3</option>
                  <option value="4">Top 4</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Group Stage Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.groupLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="groupLegs"
                    checked={formData.groupLegs === 1}
                    onChange={() => setFormData({ ...formData, groupLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Each team plays once</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.groupLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="groupLegs"
                    checked={formData.groupLegs === 2}
                    onChange={() => setFormData({ ...formData, groupLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Double Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away matches</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Settings */}
      {showKnockoutSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Knockout Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Default Knockout Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="knockoutLegs"
                    checked={formData.knockoutLegs === 1}
                    onChange={() => setFormData({ ...formData, knockoutLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Leg</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">One match per round</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="knockoutLegs"
                    checked={formData.knockoutLegs === 2}
                    onChange={() => setFormData({ ...formData, knockoutLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Two Legs</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away (aggregate)</div>
                </label>
              </div>
              <p className="text-xs text-[#7A7367] mt-2">
                * Can be customized per round when generating knockout fixtures
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Selection */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Select Teams ({formData.selectedTeams.length} selected)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllTeams}
              className="px-3 sm:px-4 py-2 bg-[#E8A800]/20 text-[#E8A800] rounded-lg text-xs sm:text-sm font-medium hover:bg-[#E8A800]/30 transition-all"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearTeams}
              className="px-3 sm:px-4 py-2 bg-white/5 text-[#7A7367] rounded-lg text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {teams.map((team) => (
            <label
              key={team.id}
              className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                formData.selectedTeams.includes(team.id)
                  ? 'border-[#E8A800] bg-[#E8A800]/10'
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-2xl">⚽</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-medium text-white truncate">{team.name}</div>
              </div>
            </label>
          ))}
        </div>

        {formData.selectedTeams.length < 2 && (
          <div className="mt-4 text-xs sm:text-sm text-yellow-400">
            Please select at least 2 teams to create a tournament
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || formData.selectedTeams.length < 2}
          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </form>
  )
}
