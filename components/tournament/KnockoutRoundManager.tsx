'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import KnockoutBracket from './KnockoutBracket'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Team {
  id: string
  teamId: string
  name: string
  logoUrl: string
  position?: number
  points?: number
}

interface KnockoutRoundManagerProps {
  tournament: any
  seasonId: string
  availableTeams: Team[]
  existingRounds: any[]
}

const roundOptions = [
  { value: 'ROUND_OF_32', label: 'Round of 32', teams: 32 },
  { value: 'ROUND_OF_16', label: 'Round of 16', teams: 16 },
  { value: 'QUARTER_FINAL', label: 'Quarter Final', teams: 8 },
  { value: 'SEMI_FINAL', label: 'Semi Final', teams: 4 },
  { value: 'THIRD_PLACE', label: 'Third Place', teams: 2 },
  { value: 'FINAL', label: 'Final', teams: 2 }
]

export default function KnockoutRoundManager({ 
  tournament, 
  seasonId, 
  availableTeams,
  existingRounds 
}: KnockoutRoundManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    roundName: 'QUARTER_FINAL',
    legs: tournament.knockoutConfig ? JSON.parse(tournament.knockoutConfig).defaultLegs : 2,
    selectedTeams: [] as string[],
    autoPair: true,
    manualPairings: [] as Array<{ team1: string; team2: string }>
  })

  const selectedRound = roundOptions.find(r => r.value === formData.roundName)
  const requiredTeams = selectedRound?.teams || 2

  const toggleTeam = (teamId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId]
    }))
  }

  const selectTopTeams = (count: number) => {
    const topTeams = availableTeams
      .sort((a, b) => (b.position || 999) - (a.position || 999))
      .slice(0, count)
      .map(t => t.id)
    setFormData(prev => ({ ...prev, selectedTeams: topTeams }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.selectedTeams.length !== requiredTeams) {
      setError(`Please select exactly ${requiredTeams} teams for ${selectedRound?.label}`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournament.id}/knockout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundName: formData.roundName,
          legs: formData.legs,
          teams: formData.selectedTeams,
          autoPair: formData.autoPair,
          manualPairings: formData.manualPairings
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create knockout round')
      }

      router.refresh()
      setFormData({
        roundName: 'QUARTER_FINAL',
        legs: tournament.knockoutConfig ? JSON.parse(tournament.knockoutConfig).defaultLegs : 2,
        selectedTeams: [],
        autoPair: true,
        manualPairings: []
      })
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Parse custom knockout config if available
  const knockoutCfg = tournament.knockoutConfig ? JSON.parse(tournament.knockoutConfig) : null
  const isCustomKnockout = tournament.tournamentType === 'CUSTOM_KNOCKOUT'

  return (
    <div className="space-y-6">
      {/* Custom Knockout Config Banner */}
      {isCustomKnockout && knockoutCfg?.qualifyingTeams && (
        <div className="rounded-xl bg-[#E8A800]/5 border border-[#E8A800]/20 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#E8A800] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-[#E8A800] mb-0.5">Custom Knockout Configuration</p>
            <p className="text-sm text-[#D4CCBB]">
              <span className="font-bold text-white">{knockoutCfg.qualifyingTeams} teams</span> qualify and enter at the{' '}
              <span className="font-bold text-white">{roundOptions.find(r => r.value === knockoutCfg.qualifyingRound)?.label ?? knockoutCfg.qualifyingRound}</span> stage
              ({knockoutCfg.defaultLegs === 1 ? 'single leg' : 'two-legged'} ties).
            </p>
          </div>
        </div>
      )}
      {/* Bracket View */}
      {existingRounds.length > 0 && (
        <KnockoutBracket
          rounds={existingRounds}
          teams={availableTeams}
          seasonId={seasonId}
          tournamentId={tournament.id}
        />
      )}

      {/* Create New Round */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Round Selection */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-xl font-black text-white mb-4">Create Knockout Round</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Round
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roundOptions.map((option) => {
                  const isDisabled = existingRounds.some(r => r.roundName === option.value)
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed border-white/5 bg-black/20'
                          : formData.roundName === option.value
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="roundName"
                        value={option.value}
                        checked={formData.roundName === option.value}
                        onChange={(e) => setFormData({ ...formData, roundName: e.target.value, selectedTeams: [] })}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      <div className="font-bold text-white text-sm">{option.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{option.teams} teams</div>
                      {isDisabled && (
                        <div className="text-xs text-yellow-400 mt-1">Already created</div>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Match Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  formData.legs === 1
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="legs"
                    checked={formData.legs === 1}
                    onChange={() => setFormData({ ...formData, legs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white">Single Leg</div>
                  <div className="text-sm text-gray-400 mt-1">One match decides</div>
                </label>
                <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  formData.legs === 2
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="legs"
                    checked={formData.legs === 2}
                    onChange={() => setFormData({ ...formData, legs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white">Two Legs</div>
                  <div className="text-sm text-gray-400 mt-1">Home & away (aggregate)</div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Team Selection */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-white">
              Select Teams ({formData.selectedTeams.length}/{requiredTeams})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectTopTeams(requiredTeams)}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all"
              >
                Select Top {requiredTeams}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, selectedTeams: [] })}
                className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableTeams.map((team) => {
              const isSelected = formData.selectedTeams.includes(team.id)
              const isDisabled = !isSelected && formData.selectedTeams.length >= requiredTeams
              
              return (
                <label
                  key={team.id}
                  className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed border-white/5 bg-black/20'
                      : isSelected
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTeam(team.id)}
                    disabled={isDisabled}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl">⚽</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-white truncate">{team.name}</div>
                    {team.position && (
                      <div className="text-xs text-gray-400 mt-1">#{team.position}</div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>

          {formData.selectedTeams.length !== requiredTeams && (
            <div className="mt-4 text-sm text-yellow-400">
              Please select exactly {requiredTeams} teams for {selectedRound?.label}
            </div>
          )}
        </div>

        {/* Pairing Options */}
        {formData.selectedTeams.length === requiredTeams && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-xl font-black text-white mb-4">Pairing Method</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                formData.autoPair
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}>
                <input
                  type="radio"
                  name="pairingMethod"
                  checked={formData.autoPair}
                  onChange={() => setFormData({ ...formData, autoPair: true })}
                  className="sr-only"
                />
                <div className="font-bold text-white">Automatic Pairing</div>
                <div className="text-sm text-gray-400 mt-1">
                  Based on standings (1 vs {requiredTeams}, 2 vs {requiredTeams - 1}, etc.)
                </div>
              </label>
              
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                !formData.autoPair
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}>
                <input
                  type="radio"
                  name="pairingMethod"
                  checked={!formData.autoPair}
                  onChange={() => setFormData({ ...formData, autoPair: false })}
                  className="sr-only"
                />
                <div className="font-bold text-white">Manual Pairing</div>
                <div className="text-sm text-gray-400 mt-1">
                  Customize matchups after creation
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || formData.selectedTeams.length !== requiredTeams}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Creating Round...</span>
              </>
            ) : (
              `Create ${selectedRound?.label}`
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
