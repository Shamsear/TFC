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

  const knockoutCfg = tournament.knockoutConfig ? JSON.parse(tournament.knockoutConfig) : null
  const isCustomKnockout = tournament.tournamentType === 'CUSTOM_KNOCKOUT'

  return (
    <div className="space-y-6">
      {/* Custom Knockout Config Banner */}
      {isCustomKnockout && knockoutCfg?.qualifyingTeams && (
        <div className="rounded-2xl bg-yellow-500/5 border border-yellow-500/20 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-black text-yellow-400 uppercase tracking-wider font-mono mb-0.5">Custom Knockout Configuration</p>
            <p className="text-xs text-gray-400 lowercase font-sans">
              <span className="font-bold text-white uppercase font-mono">{knockoutCfg.qualifyingTeams} teams</span> qualify and enter at the{' '}
              <span className="font-bold text-white uppercase font-mono">{roundOptions.find(r => r.value === knockoutCfg.qualifyingRound)?.label ?? knockoutCfg.qualifyingRound}</span> stage
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
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
            {error}
          </div>
        )}

        {/* Round Selection */}
        <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono mb-6">Create Knockout Round</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-gray-500 tracking-widest font-mono mb-3">
                Select Round
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roundOptions.map((option) => {
                  const isDisabled = existingRounds.some(r => r.roundName === option.value)
                  const isSelected = formData.roundName === option.value

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed border-white/5 bg-black/40'
                          : isSelected
                          ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                          : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="roundName"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setFormData({ ...formData, roundName: e.target.value, selectedTeams: [] })}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-tight font-mono">{option.label}</div>
                        <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase font-mono">{option.teams} teams</div>
                      </div>
                      {isDisabled && (
                        <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-wider font-mono">Already created</div>
                      )}
                      {isSelected && !isDisabled && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-gray-500 tracking-widest font-mono mb-3">
                Match Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                  formData.legs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                }`}>
                  <input
                    type="radio"
                    name="legs"
                    checked={formData.legs === 1}
                    onChange={() => setFormData({ ...formData, legs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-tight font-mono">Single Leg</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mt-1 font-mono">One match decides</div>
                  {formData.legs === 1 && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                  )}
                </label>
                <label className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                  formData.legs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                }`}>
                  <input
                    type="radio"
                    name="legs"
                    checked={formData.legs === 2}
                    onChange={() => setFormData({ ...formData, legs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-tight font-mono">Two Legs</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mt-1 font-mono">Home & away (aggregate)</div>
                  {formData.legs === 2 && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Team Selection */}
        <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              Select Teams <span className="text-[#E8A800] font-mono">({formData.selectedTeams.length}/{requiredTeams})</span>
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectTopTeams(requiredTeams)}
                className="px-4 py-2 bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] hover:bg-[#E8A800]/20 rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer"
              >
                Select Top {requiredTeams}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, selectedTeams: [] })}
                className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer"
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
                  className={`cursor-pointer rounded-2xl border p-3 transition-all relative overflow-hidden ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed border-white/5 bg-black/40'
                      : isSelected
                      ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                      : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTeam(team.id)}
                    disabled={isDisabled}
                    className="sr-only"
                  />
                  <div className="text-center font-mono">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-sm">⚽</span>
                      )}
                    </div>
                    <div className="text-[11px] font-extrabold text-white uppercase tracking-tight truncate">{team.name}</div>
                    {team.position && (
                      <div className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Pos #{team.position}</div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                  )}
                </label>
              )
            })}
          </div>

          {formData.selectedTeams.length !== requiredTeams && (
            <div className="mt-6 text-xs text-yellow-500 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3">
              <span>⚠️</span>
              <span>Please select exactly {requiredTeams} teams for {selectedRound?.label}</span>
            </div>
          )}
        </div>

        {/* Pairing Options */}
        {formData.selectedTeams.length === requiredTeams && (
          <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono mb-6">Pairing Method</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                formData.autoPair
                  ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                  : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
              }`}>
                <input
                  type="radio"
                  name="pairingMethod"
                  checked={formData.autoPair}
                  onChange={() => setFormData({ ...formData, autoPair: true })}
                  className="sr-only"
                />
                <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-tight font-mono">Automatic Pairing</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase mt-1 font-mono">
                  Based on standings (1 vs {requiredTeams}, 2 vs {requiredTeams - 1}, etc.)
                </div>
                {formData.autoPair && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                )}
              </label>
              
              <label className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                !formData.autoPair
                  ? 'border-[#E8A800] bg-[#E8A800]/5 text-[#E8A800]'
                  : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
              }`}>
                <input
                  type="radio"
                  name="pairingMethod"
                  checked={!formData.autoPair}
                  onChange={() => setFormData({ ...formData, autoPair: false })}
                  className="sr-only"
                />
                <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-tight font-mono">Manual Pairing</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase mt-1 font-mono">
                  Customize matchups after creation
                </div>
                {!formData.autoPair && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]" />
                )}
              </label>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || formData.selectedTeams.length !== requiredTeams}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-extrabold uppercase tracking-wider text-xs font-mono rounded-xl transition-all shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
