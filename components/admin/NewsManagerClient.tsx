'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string // Changed from Date to string for hydration safety
  tournament: string
  hasNews: boolean
  round?: string | null
  status?: string
}

interface NewsManagerClientProps {
  matches: Match[]
  seasonId: string
  tournamentId?: string
}

export default function NewsManagerClient({ matches, seasonId, tournamentId }: NewsManagerClientProps) {
  const router = useRouter()
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [generatingMatchday, setGeneratingMatchday] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<string>('')

  // Get unique rounds from matches
  const rounds = Array.from(new Set(matches.map(m => m.round).filter((r): r is string => r != null && r !== ''))).sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })

  const handleGenerateNews = async (matchId: string) => {
    setGeneratingFor(matchId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/news/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate news')
      }

      setSuccess(`News generated successfully for match ${matchId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingFor(null)
    }
  }

  const handleGenerateMatchdayNews = async (eventType: 'matchday_started' | 'matchday_completed') => {
    if (!selectedRound) {
      setError('Please select a matchday/round')
      return
    }

    setGeneratingMatchday(eventType)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/news/generate-matchday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seasonId, 
          tournamentId,
          round: selectedRound, 
          eventType 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate matchday news')
      }

      setSuccess(`${eventType === 'matchday_started' ? 'Matchday Started' : 'Matchday Recap'} news generated successfully!`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingMatchday(null)
    }
  }

  const completedMatches = matches.filter(m => m.status === 'COMPLETED')
  const matchesWithoutNews = completedMatches.filter((m) => !m.hasNews)
  const matchesWithNews = completedMatches.filter((m) => m.hasNews)

  return (
    <div className="space-y-6">
      {/* Matchday News Generator */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
        <h2 className="text-lg sm:text-xl font-black text-white mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
          <span>📰</span> Generate Matchday News
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
              Select Matchday/Round
            </label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
            >
              <option value="">-- Select a round --</option>
              {rounds.map((round) => (
                <option key={round} value={round}>
                  {round}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerateMatchdayNews('matchday_started')}
              disabled={!selectedRound || generatingMatchday === 'matchday_started'}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#0a0a0a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              {generatingMatchday === 'matchday_started' ? (
                <>
                  <svg className="inline w-3.5 h-3.5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                '🚀 Generate Matchday Started'
              )}
            </button>
            <button
              onClick={() => handleGenerateMatchdayNews('matchday_completed')}
              disabled={!selectedRound || generatingMatchday === 'matchday_completed'}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-[#0a0a0a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              {generatingMatchday === 'matchday_completed' ? (
                <>
                  <svg className="inline w-3.5 h-3.5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                '🏁 Generate Matchday Recap'
              )}
            </button>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
            <strong>Matchday Started:</strong> Preview of upcoming matches<br />
            <strong>Matchday Recap:</strong> Summary of completed matches and results
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1 font-mono">{completedMatches.length}</div>
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">
            Total Completed Matches
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 p-5 backdrop-blur-xl shadow-md">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mb-1 font-mono">{matchesWithNews.length}</div>
          <div className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest font-mono">
            With News Articles
          </div>
        </div>
        <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/10 p-5 backdrop-blur-xl shadow-md">
          <div className="text-2xl sm:text-3xl font-black text-red-400 mb-1 font-mono">{matchesWithoutNews.length}</div>
          <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest font-mono">
            Missing News
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-xs font-mono uppercase tracking-wider">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-400 text-xs font-mono uppercase tracking-wider">
          {success}
        </div>
      )}

      {/* Matches Without News */}
      {matchesWithoutNews.length > 0 && (
        <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/10 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-base sm:text-lg font-black text-red-400 mb-4 uppercase tracking-wider font-mono">
            ⚠️ Matches Missing News ({matchesWithoutNews.length})
          </h2>
          <div className="space-y-3">
            {matchesWithoutNews.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-red-500/20 transition-all shadow-sm"
              >
                <div className="flex-1">
                  <div className="font-extrabold text-white mb-1 uppercase tracking-tight text-sm sm:text-base">
                    {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                    {match.tournament} • {match.round || 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateNews(match.id)}
                  disabled={generatingFor === match.id}
                  className="px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] text-black rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  {generatingFor === match.id ? (
                    <>
                      <svg
                        className="inline w-3.5 h-3.5 mr-2 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate News'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches With News */}
      {matchesWithNews.length > 0 && (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-base sm:text-lg font-black text-white mb-4 uppercase tracking-wider font-mono">
            ✅ Matches With News ({matchesWithNews.length})
          </h2>
          <div className="space-y-3">
            {matchesWithNews.slice(0, 10).map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all shadow-sm"
              >
                <div className="flex-1">
                  <div className="font-extrabold text-white mb-1 uppercase tracking-tight text-sm sm:text-base">
                    {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                    {match.tournament} • {match.round || 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider font-mono">
                    Published
                  </span>
                  <button
                    onClick={() => handleGenerateNews(match.id)}
                    disabled={generatingFor === match.id}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {generatingFor === match.id ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
