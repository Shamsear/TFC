'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Match {
  id: string
  homeTeamId: string
  awayTeamId: string
  matchDate: Date
  round: string
  homeTeam: { team: { name: string; logoUrl: string } }
  awayTeam: { team: { name: string; logoUrl: string } }
}

interface FixtureCalendarEditorProps {
  matches: Match[]
  tournamentId: string
  seasonId: string
}

export default function FixtureCalendarEditor({ matches, tournamentId, seasonId }: FixtureCalendarEditorProps) {
  const router = useRouter()
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [pushSubsequent, setPushSubsequent] = useState(true)
  const [gapDays, setGapDays] = useState(0)

  // Group matches by date
  const matchesByDate = matches.reduce((acc, match) => {
    const dateKey = new Date(match.matchDate).toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  const sortedDates = Object.keys(matchesByDate).sort()

  const handleEditDate = (match: Match) => {
    setEditingMatchId(match.id)
    setNewDate(new Date(match.matchDate).toISOString().split('T')[0])
    setGapDays(0)
  }

  const handleSaveDate = async () => {
    if (!editingMatchId || !newDate) return

    setLoading(true)
    setLoadingAction(`save-${editingMatchId}`)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/fixtures/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingMatchId,
          newDate,
          pushSubsequent,
          gapDays
        })
      })

      if (response.ok) {
        setEditingMatchId(null)
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update fixture')
      }
    } catch (error) {
      console.error('Error updating fixture:', error)
      alert('Failed to update fixture')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const addGapAfterMatchday = async (dateKey: string, days: number) => {
    setLoading(true)
    setLoadingAction(`gap-${days}-${dateKey}`)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/fixtures/add-gap`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterDate: dateKey,
          gapDays: days
        })
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add gap')
      }
    } catch (error) {
      console.error('Error adding gap:', error)
      alert('Failed to add gap')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-bold mb-1">Fixture Calendar Editor</p>
            <p>Click on any match to edit its date. You can also add gaps between matchdays to push all subsequent fixtures.</p>
          </div>
        </div>
      </div>

      {sortedDates.map((dateKey, index) => {
        const matchesOnDate = matchesByDate[dateKey]
        const displayDate = new Date(dateKey + 'T00:00:00')
        const dayName = displayDate.toLocaleDateString('en-US', { weekday: 'long' })
        const dateStr = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

        return (
          <div key={dateKey} className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {matchesOnDate[0]?.round || `Matchday ${index + 1}`}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {dayName}, {dateStr}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addGapAfterMatchday(dateKey, 1)}
                  disabled={loading}
                  className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingAction === `gap-1-${dateKey}` ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    '+1 Day Gap'
                  )}
                </button>
                <button
                  onClick={() => addGapAfterMatchday(dateKey, 2)}
                  disabled={loading}
                  className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingAction === `gap-2-${dateKey}` ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    '+2 Days Gap'
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {matchesOnDate.map((match) => (
                <div key={match.id} className="rounded-xl bg-black/30 border border-white/10 p-4">
                  {editingMatchId === match.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">New Date</label>
                          <input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-400 mb-1">Gap After (days)</label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={gapDays}
                            onChange={(e) => setGapDays(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={pushSubsequent}
                          onChange={(e) => setPushSubsequent(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-black/30 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        />
                        Push all subsequent fixtures
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDate}
                          disabled={loading}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {loadingAction === `save-${match.id}` ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => setEditingMatchId(null)}
                          disabled={loading}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                            {match.homeTeam.team.logoUrl ? (
                              <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-sm">⚽</span>
                            )}
                          </div>
                          <span className="text-white font-bold">{match.homeTeam.team.name}</span>
                        </div>

                        <span className="text-gray-500 font-bold">vs</span>

                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-white font-bold">{match.awayTeam.team.name}</span>
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                            {match.awayTeam.team.logoUrl ? (
                              <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-sm">⚽</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEditDate(match)}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                      >
                        Edit Date
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
