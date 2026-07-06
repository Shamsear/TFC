'use client'

import { useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface Pairing {
  id: string
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  leg1MatchId: string | null
  leg2MatchId: string | null
}

interface KnockoutRound {
  id: string
  roundName: string
  roundOrder: number
  legs: number
  status: string
  pairings: Pairing[]
}

interface KnockoutBracketProps {
  rounds: KnockoutRound[]
  teams: Team[]
  seasonId: string
  tournamentId: string
}

export default function KnockoutBracket({ rounds, teams, seasonId, tournamentId }: KnockoutBracketProps) {
  const [editingPairing, setEditingPairing] = useState<string | null>(null)
  const [selectedTeam1, setSelectedTeam1] = useState<string>('')
  const [selectedTeam2, setSelectedTeam2] = useState<string>('')
  const [savingPairingId, setSavingPairingId] = useState<string | null>(null)

  const getTeamById = (teamId: string | null) => {
    if (!teamId) return null
    return teams.find(t => t.id === teamId)
  }

  const handleEditPairing = (pairing: Pairing) => {
    setEditingPairing(pairing.id)
    setSelectedTeam1(pairing.team1Id || '')
    setSelectedTeam2(pairing.team2Id || '')
  }

  const handleSavePairing = async (pairingId: string) => {
    setSavingPairingId(pairingId)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/knockout/pairings/${pairingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Id: selectedTeam1,
          team2Id: selectedTeam2
        })
      })

      if (response.ok) {
        setEditingPairing(null)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating pairing:', error)
    } finally {
      setSavingPairingId(null)
    }
  }

  const getRoundColor = (roundName: string) => {
    const colors: Record<string, string> = {
      'ROUND_OF_16': 'from-blue-400 to-cyan-400',
      'QUARTER_FINAL': 'from-purple-400 to-pink-400',
      'SEMI_FINAL': 'from-orange-400 to-red-400',
      'THIRD_PLACE': 'from-gray-400 to-slate-400',
      'FINAL': 'from-yellow-400 to-[#FFB347]'
    }
    return colors[roundName] || 'from-emerald-400 to-teal-400'
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center shadow-2xl backdrop-blur-xl">
        <div className="text-lg font-black text-white uppercase tracking-wider font-mono mb-2">No knockout rounds created yet</div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
          Create your first round above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <div key={round.id} className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-black uppercase tracking-wider font-mono bg-gradient-to-r ${getRoundColor(round.roundName)} bg-clip-text text-transparent`}>
                {round.roundName.replace(/_/g, ' ')}
              </h3>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono mt-1">
                {round.legs} leg{round.legs > 1 ? 's' : ''} • {round.status}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-xs font-black uppercase tracking-wider font-mono">
              {round.pairings.length} {round.pairings.length === 1 ? 'match' : 'matches'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {round.pairings.map((pairing, index) => {
              const team1 = getTeamById(pairing.team1Id)
              const team2 = getTeamById(pairing.team2Id)
              const isEditing = editingPairing === pairing.id

              return (
                <div key={pairing.id} className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest font-mono">Match #{index + 1}</div>
                    {!isEditing && (
                      <button
                        onClick={() => handleEditPairing(pairing)}
                        className="text-[10px] font-extrabold text-[#E8A800] hover:text-[#FFB347] uppercase tracking-wider font-mono transition-all cursor-pointer"
                      >
                        Edit Teams
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <SearchableSelect
                        value={selectedTeam1}
                        options={[
                          { value: '', label: 'Select Team 1' },
                          ...teams.map(team => ({ value: team.id, label: team.name }))
                        ]}
                        onChange={setSelectedTeam1}
                        enableSearch={true}
                      />

                      <div className="text-center text-gray-600 text-[10px] font-black font-mono tracking-widest my-1">VS</div>

                      <SearchableSelect
                        value={selectedTeam2}
                        options={[
                          { value: '', label: 'Select Team 2' },
                          ...teams.map(team => ({ value: team.id, label: team.name }))
                        ]}
                        onChange={setSelectedTeam2}
                        enableSearch={true}
                      />

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSavePairing(pairing.id)}
                          disabled={savingPairingId === pairing.id}
                          className="flex-1 px-3 py-2 bg-[#E8A800] hover:bg-[#FFB347] text-black rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {savingPairingId === pairing.id ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => setEditingPairing(null)}
                          disabled={savingPairingId === pairing.id}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Team 1 */}
                      <div className={`flex items-center gap-3 p-3.5 rounded-xl transition-all ${
                        pairing.winnerId === pairing.team1Id 
                          ? 'bg-emerald-500/5 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                          : 'bg-[#121212]/40 border border-white/5'
                      }`}>
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team1?.logoUrl ? (
                            <img src={team1.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <span className="text-white font-extrabold uppercase text-xs tracking-tight font-mono flex-1 truncate">
                          {team1?.name || 'TBD'}
                        </span>
                        {pairing.winnerId === pairing.team1Id && (
                          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider font-mono">WINNER</span>
                        )}
                      </div>

                      <div className="text-center text-gray-600 text-[10px] font-black font-mono tracking-widest my-1">VS</div>

                      {/* Team 2 */}
                      <div className={`flex items-center gap-3 p-3.5 rounded-xl transition-all ${
                        pairing.winnerId === pairing.team2Id 
                          ? 'bg-emerald-500/5 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                          : 'bg-[#121212]/40 border border-white/5'
                      }`}>
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team2?.logoUrl ? (
                            <img src={team2.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <span className="text-white font-extrabold uppercase text-xs tracking-tight font-mono flex-1 truncate">
                          {team2?.name || 'TBD'}
                        </span>
                        {pairing.winnerId === pairing.team2Id && (
                          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider font-mono">WINNER</span>
                        )}
                      </div>

                      {/* Match Links */}
                      {(pairing.leg1MatchId || pairing.leg2MatchId) && (
                        <div className="flex gap-2 mt-4 pt-1">
                          {pairing.leg1MatchId && (
                            <a
                              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${pairing.leg1MatchId}`}
                              className="flex-1 px-3 py-2 bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] rounded-xl text-[10px] font-black uppercase tracking-wider font-mono text-center hover:bg-[#E8A800]/20 transition-all"
                            >
                              Leg 1
                            </a>
                          )}
                          {pairing.leg2MatchId && (
                            <a
                              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${pairing.leg2MatchId}`}
                              className="flex-1 px-3 py-2 bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] rounded-xl text-[10px] font-black uppercase tracking-wider font-mono text-center hover:bg-[#E8A800]/20 transition-all"
                            >
                              Leg 2
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
