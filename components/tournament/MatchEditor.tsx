'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface MatchEditorProps {
  match: any
  seasonId: string
  tournamentId: string
}

const toLocalISOString = (dateVal: any) => {
  if (!dateVal) return ''
  const date = new Date(dateVal)
  if (isNaN(date.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MatchEditor({ match, seasonId, tournamentId }: MatchEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    matchDate: toLocalISOString(match.matchDate),
    venue: match.venue || '',
    round: match.round || '',
    status: match.status,
    homeScore: match.homeScore ?? '',
    awayScore: match.awayScore ?? '',
    homePenalty: match.homePenalty ?? '',
    awayPenalty: match.awayPenalty ?? '',
    notes: match.notes || ''
  })

  // Track walkover winner
  const [walkoverWinner, setWalkoverWinner] = useState<'home' | 'away'>(
    match.homeScore > match.awayScore ? 'home' : 'away'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const isWalkover = formData.status === 'WALKOVER'
    const finalHomeScore = isWalkover ? (walkoverWinner === 'home' ? 3 : 0) : (formData.homeScore === '' ? null : parseInt(formData.homeScore as any))
    const finalAwayScore = isWalkover ? (walkoverWinner === 'away' ? 3 : 0) : (formData.awayScore === '' ? null : parseInt(formData.awayScore as any))

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          homeScore: finalHomeScore,
          awayScore: finalAwayScore,
          homePenalty: formData.homePenalty === '' ? null : parseInt(formData.homePenalty as any),
          awayPenalty: formData.awayPenalty === '' ? null : parseInt(formData.awayPenalty as any)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update match')
      }

      router.push(`/sub-admin/${seasonId}/tournaments/${tournamentId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      LIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      COMPLETED: 'bg-[#7A7367]/20 text-[#7A7367] border-[#7A7367]/30',
      POSTPONED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
      WALKOVER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      VOID: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
    return colors[status] || colors.SCHEDULED
  }

  // Determine winner/loser/draw
  const isWalkover = formData.status === 'WALKOVER'
  const isVoid = formData.status === 'VOID'
  const homeScore = isWalkover ? (walkoverWinner === 'home' ? 3 : 0) : (formData.homeScore === '' ? null : parseInt(formData.homeScore as any))
  const awayScore = isWalkover ? (walkoverWinner === 'away' ? 3 : 0) : (formData.awayScore === '' ? null : parseInt(formData.awayScore as any))
  
  let result: 'home-win' | 'away-win' | 'draw' | null = null
  if (!isVoid && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) {
      result = 'home-win'
    } else if (awayScore > homeScore) {
      result = 'away-win'
    } else {
      result = 'draw'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Match Overview */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">Enter Match Result</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-[#7A7367]">Status:</span>
            <SearchableSelect
              value={formData.status}
              options={[
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'LIVE', label: 'Live' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'POSTPONED', label: 'Postponed' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'WALKOVER', label: 'Walkover' },
                { value: 'VOID', label: 'Void / Null' }
              ]}
              onChange={(value) => setFormData({ ...formData, status: value })}
              enableSearch={false}
              required={true}
              className={`${getStatusColor(formData.status)}`}
            />
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4 lg:gap-8 py-6 sm:py-8">
          {/* Home Team */}
          <div className={`flex flex-col items-center gap-3 flex-1 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${
            result === 'home-win' 
              ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20' 
              : result === 'away-win'
              ? 'bg-red-500/10 border-red-500/30 opacity-60'
              : result === 'draw'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
              {match.homeTeam.team.logoUrl ? (
                <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl sm:text-4xl lg:text-5xl">⚽</span>
              )}
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-white truncate max-w-[200px]">{match.homeTeam.team.name}</div>
              <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home</div>
              {result === 'home-win' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider">
                  {isWalkover ? "Walkover Win" : "WINNER"}
                </div>
              )}
              {result === 'away-win' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                  {isWalkover ? "Walkover Loss" : "LOSER"}
                </div>
              )}
              {result === 'draw' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                  DRAW
                </div>
              )}
            </div>
          </div>

          {/* Score / Selector */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 flex-1 max-w-sm">
            {isWalkover ? (
              <div className="flex flex-col items-center gap-2 w-full p-4 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-xs text-[#E8A800] font-black uppercase tracking-wider">Walkover Winner</span>
                <select
                  value={walkoverWinner}
                  onChange={(e) => setWalkoverWinner(e.target.value as 'home' | 'away')}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#E8A800] cursor-pointer"
                >
                  <option value="home">{match.homeTeam.team.name} (Home)</option>
                  <option value="away">{match.awayTeam.team.name} (Away)</option>
                </select>
                <span className="text-[10px] text-gray-500 text-center mt-1">
                  Winner receives +3 pts, loser gets +0. No goals or achievements are counted.
                </span>
              </div>
            ) : isVoid ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl w-full text-center">
                <span className="text-sm font-black text-red-400 uppercase tracking-wider mb-1">Match Voided</span>
                <span className="text-xs text-gray-500">
                  This match is excluded entirely from standings, stats, and achievements.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 sm:gap-4">
                  <input
                    type="number"
                    min="0"
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                    className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-center text-2xl sm:text-3xl lg:text-5xl font-black border-2 rounded-lg sm:rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#E8A800]/50 transition-all ${
                      result === 'home-win'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : result === 'away-win'
                        ? 'bg-red-500/10 border-red-500/30 text-white'
                        : result === 'draw'
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-black/30 border-white/10 text-white'
                    }`}
                    placeholder="0"
                  />
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#7A7367]">:</div>
                  <input
                    type="number"
                    min="0"
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                    className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-center text-2xl sm:text-3xl lg:text-5xl font-black border-2 rounded-lg sm:rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#E8A800]/50 transition-all ${
                      result === 'away-win'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : result === 'home-win'
                        ? 'bg-red-500/10 border-red-500/30 text-white'
                        : result === 'draw'
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-black/30 border-white/10 text-white'
                    }`}
                    placeholder="0"
                  />
                </div>
                
                {/* Penalties */}
                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs sm:text-sm">
                  <span className="text-[#7A7367]">Penalties (optional):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.homePenalty}
                      onChange={(e) => setFormData({ ...formData, homePenalty: e.target.value })}
                      className="w-12 sm:w-16 px-2 py-1 text-center bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] text-xs sm:text-sm"
                      placeholder="-"
                    />
                    <span className="text-[#7A7367]">-</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.awayPenalty}
                      onChange={(e) => setFormData({ ...formData, awayPenalty: e.target.value })}
                      className="w-12 sm:w-16 px-2 py-1 text-center bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] text-xs sm:text-sm"
                      placeholder="-"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className={`flex flex-col items-center gap-3 flex-1 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${
            result === 'away-win' 
              ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20' 
              : result === 'home-win'
              ? 'bg-red-500/10 border-red-500/30 opacity-60'
              : result === 'draw'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
              {match.awayTeam.team.logoUrl ? (
                <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl sm:text-4xl lg:text-5xl">⚽</span>
              )}
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-white truncate max-w-[200px]">{match.awayTeam.team.name}</div>
              <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Away</div>
              {result === 'away-win' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider">
                  {isWalkover ? "Walkover Win" : "WINNER"}
                </div>
              )}
              {result === 'home-win' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                  {isWalkover ? "Walkover Loss" : "LOSER"}
                </div>
              )}
              {result === 'draw' && (
                <div className="mt-2 px-2 sm:px-3 py-1 rounded-full bg-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                  DRAW
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-[#7A7367]">Date</div>
              <div className="text-xs sm:text-sm font-bold text-white mt-1">
                {new Date(match.matchDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#7A7367]">Round</div>
              <div className="text-xs sm:text-sm font-bold text-white mt-1">{match.round || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#7A7367]">Venue</div>
              <div className="text-xs sm:text-sm font-bold text-white mt-1 truncate">{match.venue || '-'}</div>
            </div>
            {match.group && (
              <div>
                <div className="text-xs text-[#7A7367]">Group</div>
                <div className="text-xs sm:text-sm font-bold text-purple-400 mt-1">{match.group.name}</div>
              </div>
            )}
          </div>
        </div>
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
          disabled={loading}
          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Saving...</span>
            </>
          ) : (
            'Complete Match & Save'
          )}
        </button>
      </div>
    </form>
  )
}
