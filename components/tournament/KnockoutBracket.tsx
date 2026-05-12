'use client'

import { useState } from 'react'

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
    }
  }

  const getRoundColor = (roundName: string) => {
    const colors: Record<string, string> = {
      'ROUND_OF_16': 'from-blue-500 to-cyan-500',
      'QUARTER_FINAL': 'from-purple-500 to-pink-500',
      'SEMI_FINAL': 'from-orange-500 to-red-500',
      'THIRD_PLACE': 'from-gray-500 to-slate-500',
      'FINAL': 'from-yellow-500 to-amber-500'
    }
    return colors[roundName] || 'from-emerald-500 to-teal-500'
  }

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No knockout rounds created yet. Create your first round above.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <div key={round.id} className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-2xl font-black bg-gradient-to-r ${getRoundColor(round.roundName)} bg-clip-text text-transparent`}>
                {round.roundName.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {round.legs} leg{round.legs > 1 ? 's' : ''} • {round.status}
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold">
              {round.pairings.length} {round.pairings.length === 1 ? 'match' : 'matches'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {round.pairings.map((pairing, index) => {
              const team1 = getTeamById(pairing.team1Id)
              const team2 = getTeamById(pairing.team2Id)
              const isEditing = editingPairing === pairing.id

              return (
                <div key={pairing.id} className="rounded-xl bg-black/30 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-gray-400">Match {index + 1}</div>
                    {!isEditing && (
                      <button
                        onClick={() => handleEditPairing(pairing)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        Edit Teams
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        value={selectedTeam1}
                        onChange={(e) => setSelectedTeam1(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select Team 1</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>

                      <div className="text-center text-gray-500 text-xs font-bold">VS</div>

                      <select
                        value={selectedTeam2}
                        onChange={(e) => setSelectedTeam2(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select Team 2</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSavePairing(pairing.id)}
                          className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPairing(null)}
                          className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Team 1 */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        pairing.winnerId === pairing.team1Id 
                          ? 'bg-emerald-500/20 border-2 border-emerald-500' 
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team1?.logoUrl ? (
                            <img src={team1.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <span className="text-white font-bold text-sm flex-1">
                          {team1?.name || 'TBD'}
                        </span>
                        {pairing.winnerId === pairing.team1Id && (
                          <span className="text-emerald-400 text-xs font-bold">WINNER</span>
                        )}
                      </div>

                      <div className="text-center text-gray-500 text-xs font-bold">VS</div>

                      {/* Team 2 */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        pairing.winnerId === pairing.team2Id 
                          ? 'bg-emerald-500/20 border-2 border-emerald-500' 
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team2?.logoUrl ? (
                            <img src={team2.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <span className="text-white font-bold text-sm flex-1">
                          {team2?.name || 'TBD'}
                        </span>
                        {pairing.winnerId === pairing.team2Id && (
                          <span className="text-emerald-400 text-xs font-bold">WINNER</span>
                        )}
                      </div>

                      {/* Match Links */}
                      {(pairing.leg1MatchId || pairing.leg2MatchId) && (
                        <div className="flex gap-2 mt-3">
                          {pairing.leg1MatchId && (
                            <a
                              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${pairing.leg1MatchId}`}
                              className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold text-center hover:bg-purple-500/30 transition-all"
                            >
                              Leg 1
                            </a>
                          )}
                          {pairing.leg2MatchId && (
                            <a
                              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${pairing.leg2MatchId}`}
                              className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold text-center hover:bg-purple-500/30 transition-all"
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
