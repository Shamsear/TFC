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
  const rounds = Array.from(new Set(matches.map(m => m.round).filter((r): r is string => r != null))).sort()

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

  const matchesWithoutNews = matches.filter((m) => !m.hasNews)
  const matchesWithNews = matches.filter((m) => m.hasNews)

  return (
    <div className="space-y-6">
      {/* Matchday News Generator */}
      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 p-6">
        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <span>📰</span> Generate Matchday News
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              Select Matchday/Round
            </label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingMatchday === 'matchday_started' ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingMatchday === 'matchday_completed' ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <div className="text-xs text-gray-500">
            <strong>Matchday Started:</strong> Preview of upcoming matches<br />
            <strong>Matchday Recap:</strong> Summary of completed matches and results
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="text-3xl font-black text-white mb-1">{matches.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
            Total Completed Matches
          </div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
          <div className="text-3xl font-black text-emerald-400 mb-1">{matchesWithNews.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
            With News Articles
          </div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6">
          <div className="text-3xl font-black text-red-400 mb-1">{matchesWithoutNews.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
            Missing News
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Matches Without News */}
      {matchesWithoutNews.length > 0 && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-6">
          <h2 className="text-xl font-black text-red-400 mb-4">
            ⚠️ Matches Missing News ({matchesWithoutNews.length})
          </h2>
          <div className="space-y-3">
            {matchesWithoutNews.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1">
                  <div className="font-bold text-white mb-1">
                    {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                  </div>
                  <div className="text-xs text-gray-500">
                    {match.tournament} • {match.round || 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateNews(match.id)}
                  disabled={generatingFor === match.id}
                  className="px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] text-black rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingFor === match.id ? (
                    <>
                      <svg
                        className="inline w-4 h-4 mr-2 animate-spin"
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
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xl font-black text-white mb-4">
            ✅ Matches With News ({matchesWithNews.length})
          </h2>
          <div className="space-y-3">
            {matchesWithNews.slice(0, 10).map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1">
                  <div className="font-bold text-white mb-1">
                    {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                  </div>
                  <div className="text-xs text-gray-500">
                    {match.tournament} • {match.round || 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    Published
                  </span>
                  <button
                    onClick={() => handleGenerateNews(match.id)}
                    disabled={generatingFor === match.id}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
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
