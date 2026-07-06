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

  const [walkoverWinner, setWalkoverWinner] = useState<'home' | 'away'>(
    match.homeScore > match.awayScore ? 'home' : 'away'
  )

  const handleSubmit = async (e: React.FormEvent, forceComplete = false) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const isWalkover = formData.status === 'WALKOVER'
    const finalHomeScore = isWalkover ? (walkoverWinner === 'home' ? 3 : 0) : (formData.homeScore === '' ? null : parseInt(formData.homeScore as any))
    const finalAwayScore = isWalkover ? (walkoverWinner === 'away' ? 3 : 0) : (formData.awayScore === '' ? null : parseInt(formData.awayScore as any))

    const finalStatus = forceComplete ? 'COMPLETED' : formData.status

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: finalStatus,
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
      SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
      LIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse',
      COMPLETED: 'bg-white/5 text-gray-500 border-white/5',
      POSTPONED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
      CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/25',
      WALKOVER: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
      VOID: 'bg-slate-500/10 text-slate-400 border-slate-500/25'
    }
    return colors[status] || colors.SCHEDULED
  }

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
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
          {error}
        </div>
      )}

      {/* Match Overview */}
      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">Enter Match Result</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono">Status:</span>
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
              className={`${getStatusColor(formData.status)} uppercase font-mono text-[10px] tracking-wider`}
            />
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4 lg:gap-8 py-4 sm:py-6">
          {/* Home Team */}
          <div className={`flex flex-col items-center gap-3 flex-1 p-4 sm:p-6 rounded-2xl border transition-all ${
            result === 'home-win' 
              ? 'bg-emerald-500/5 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
              : result === 'away-win'
              ? 'bg-red-500/5 border-red-500/15 opacity-40'
              : result === 'draw'
              ? 'bg-yellow-500/5 border-yellow-500/25'
              : 'bg-white/[0.01] border-white/5'
          }`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
              {match.homeTeam.team.logoUrl ? (
                <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl sm:text-4xl lg:text-5xl">⚽</span>
              )}
            </div>
            <div className="text-center font-mono">
              <div className="text-sm sm:text-base font-extrabold uppercase text-white truncate max-w-[200px] tracking-tight">{match.homeTeam.team.name}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Home</div>
              {result === 'home-win' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  {isWalkover ? "Walkover Win" : "WINNER"}
                </div>
              )}
              {result === 'away-win' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400 text-[10px] font-black uppercase tracking-wider">
                  {isWalkover ? "Walkover Loss" : "LOSER"}
                </div>
              )}
              {result === 'draw' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[10px] font-black uppercase tracking-wider">
                  DRAW
                </div>
              )}
            </div>
          </div>

          {/* Score / Selector */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 flex-1 max-w-sm">
            {isWalkover ? (
              <div className="flex flex-col items-center gap-2 w-full p-4 bg-white/[0.01] border border-white/5 rounded-2xl font-mono">
                <span className="text-[10px] text-[#E8A800] font-black uppercase tracking-wider">Walkover Winner</span>
                <select
                  value={walkoverWinner}
                  onChange={(e) => setWalkoverWinner(e.target.value as 'home' | 'away')}
                  className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider"
                >
                  <option value="home" className="bg-[#0c0c0c] text-white">{match.homeTeam.team.name} (Home)</option>
                  <option value="away" className="bg-[#0c0c0c] text-white">{match.awayTeam.team.name} (Away)</option>
                </select>
                <span className="text-[9px] text-gray-500 text-center mt-1.5 uppercase font-bold leading-normal">
                  Winner receives +3 pts, loser gets +0. No goals or achievements are counted.
                </span>
              </div>
            ) : isVoid ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-2xl w-full text-center font-mono">
                <span className="text-xs font-black text-red-400 uppercase tracking-wider mb-1">Match Voided</span>
                <span className="text-[9px] text-gray-500 uppercase font-bold leading-normal">
                  This match is excluded entirely from standings, stats, and achievements.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <input
                    type="number"
                    min="0"
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                    className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-center text-2xl sm:text-3xl lg:text-5xl font-black border rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#E8A800] transition-all font-mono ${
                      result === 'home-win'
                        ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400'
                        : result === 'away-win'
                        ? 'bg-red-500/5 border-red-500/15 text-white'
                        : result === 'draw'
                        ? 'bg-yellow-500/5 border-yellow-500/25 text-yellow-400'
                        : 'bg-white/[0.01] border-white/10 text-white'
                    }`}
                    placeholder="0"
                  />
                  <div className="text-xl sm:text-2xl font-bold text-gray-600 font-mono">:</div>
                  <input
                    type="number"
                    min="0"
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                    className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-center text-2xl sm:text-3xl lg:text-5xl font-black border rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#E8A800] transition-all font-mono ${
                      result === 'away-win'
                        ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400'
                        : result === 'home-win'
                        ? 'bg-red-500/5 border-red-500/15 text-white'
                        : result === 'draw'
                        ? 'bg-yellow-500/5 border-yellow-500/25 text-yellow-400'
                        : 'bg-white/[0.01] border-white/10 text-white'
                    }`}
                    placeholder="0"
                  />
                </div>
                
                {/* Penalties */}
                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider text-gray-500">
                  <span>Penalties (optional):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.homePenalty}
                      onChange={(e) => setFormData({ ...formData, homePenalty: e.target.value })}
                      className="w-12 sm:w-16 bg-white/[0.01] border border-white/10 rounded-xl px-2 py-1.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                      placeholder="-"
                    />
                    <span className="text-gray-600">-</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.awayPenalty}
                      onChange={(e) => setFormData({ ...formData, awayPenalty: e.target.value })}
                      className="w-12 sm:w-16 bg-white/[0.01] border border-white/10 rounded-xl px-2 py-1.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                      placeholder="-"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className={`flex flex-col items-center gap-3 flex-1 p-4 sm:p-6 rounded-2xl border transition-all ${
            result === 'away-win' 
              ? 'bg-emerald-500/5 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
              : result === 'home-win'
              ? 'bg-red-500/5 border-red-500/15 opacity-40'
              : result === 'draw'
              ? 'bg-yellow-500/5 border-yellow-500/25'
              : 'bg-white/[0.01] border-white/5'
          }`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
              {match.awayTeam.team.logoUrl ? (
                <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl sm:text-4xl lg:text-5xl">⚽</span>
              )}
            </div>
            <div className="text-center font-mono">
              <div className="text-sm sm:text-base font-extrabold uppercase text-white truncate max-w-[200px] tracking-tight">{match.awayTeam.team.name}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Away</div>
              {result === 'away-win' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  {isWalkover ? "Walkover Win" : "WINNER"}
                </div>
              )}
              {result === 'home-win' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400 text-[10px] font-black uppercase tracking-wider">
                  {isWalkover ? "Walkover Loss" : "LOSER"}
                </div>
              )}
              {result === 'draw' && (
                <div className="mt-2.5 px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[10px] font-black uppercase tracking-wider">
                  DRAW
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="mt-6 pt-5 border-t border-white/5 font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Date</div>
              <div className="text-xs font-black text-white">
                {new Date(match.matchDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Round</div>
              <div className="text-xs font-black text-white">{match.round || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Venue</div>
              <div className="text-xs font-black text-white truncate">{match.venue || '-'}</div>
            </div>
            {match.group && (
              <div>
                <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Group</div>
                <div className="text-xs font-black text-purple-400">{match.group.name}</div>
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
          className="px-6 py-3.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e as any, true)}
          disabled={loading}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black rounded-xl font-extrabold uppercase tracking-wider text-xs font-mono transition-all shadow-[0_0_20px_rgba(232,168,0,0.15)] cursor-pointer flex items-center justify-center gap-2"
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
