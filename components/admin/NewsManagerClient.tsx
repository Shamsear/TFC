'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  matchDate: Date
  tournament: string
  hasNews: boolean
}

interface NewsManagerClientProps {
  matches: Match[]
  seasonId: string
}

export default function NewsManagerClient({ matches, seasonId }: NewsManagerClientProps) {
  const router = useRouter()
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const matchesWithoutNews = matches.filter((m) => !m.hasNews)
  const matchesWithNews = matches.filter((m) => m.hasNews)

  return (
    <div className="space-y-6">
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
                    {match.tournament} • {new Date(match.matchDate).toLocaleDateString()}
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
                    {match.tournament} • {new Date(match.matchDate).toLocaleDateString()}
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
