'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ── Custom Select Component for Matchdays Pager ──────────────────────────────
function CustomSelect({ 
  value, 
  options, 
  onChange, 
  displayValue 
}: {
  value: string
  options: string[]
  onChange: (val: string) => void
  displayValue?: (val: string) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[#E8A800] focus:border-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] transition-all text-xs sm:text-sm font-black text-left gap-1"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#E8A800] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:min-w-[150px] max-h-60 overflow-y-auto rounded-lg bg-[#121212]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)] py-1 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {options.map((option) => {
            const isSelected = option === value

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] ${
                  isSelected ? 'text-[#E8A800] bg-[#E8A800]/5 font-bold' : 'text-gray-300'
                }`}
              >
                <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface Match {
  id: string
  homeTeamId: string
  awayTeamId: string
  matchDate: Date
  startDate?: Date | string | null
  round: string
  status: string
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
  const [newStartDate, setNewStartDate] = useState('')
  const [newMatchDate, setNewMatchDate] = useState('')
  const [matchDateOffset, setMatchDateOffset] = useState<number>(1)

  useEffect(() => {
    if (!newStartDate) return
    const sDate = new Date(newStartDate + 'T00:00:00.000Z')
    sDate.setUTCDate(sDate.getUTCDate() + matchDateOffset)
    setNewMatchDate(sDate.toISOString().split('T')[0])
  }, [newStartDate, matchDateOffset])
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [pushSubsequent, setPushSubsequent] = useState(true)
  const [gapDays, setGapDays] = useState(0)

  // Extract all unique rounds in the matches list and sort them numerically
  const allRounds = Array.from(new Set(matches.map(m => m.round || 'Round 1'))).sort((a, b) => {
    const getRoundNum = (name: string) => {
      const num = name.match(/\d+/)
      return num ? parseInt(num[0], 10) : 1
    }
    return getRoundNum(a) - getRoundNum(b)
  })

  // Find the first round with upcoming/live matches to set as default active round
  const defaultRound = allRounds.find(roundName => 
    matches.some(m => m.round === roundName && m.status !== 'COMPLETED')
  ) || allRounds[0] || 'Round 1'

  const [activeRound, setActiveRound] = useState<string>(defaultRound)

  // Filter matches belonging to the active round
  const roundMatches = matches.filter(m => (m.round || 'Round 1') === activeRound)

  // Group matches by date
  const matchesByDate = roundMatches.reduce((acc, match) => {
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
    
    // Set start date string (fall back to matchDate if startDate is null)
    const startStr = match.startDate 
      ? new Date(match.startDate).toISOString().split('T')[0]
      : new Date(match.matchDate).toISOString().split('T')[0]
    setNewStartDate(startStr)
    
    // Set match date string
    const matchStr = new Date(match.matchDate).toISOString().split('T')[0]
    setNewMatchDate(matchStr)
    
    // Compute original offset
    const sDate = match.startDate ? new Date(match.startDate) : new Date(match.matchDate)
    const mDate = new Date(match.matchDate)
    const offsetDiff = Math.round((mDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24))
    setMatchDateOffset(offsetDiff >= 0 && offsetDiff <= 3 ? offsetDiff : 1)
    
    setGapDays(0)
  }

  const handleSaveDate = async () => {
    if (!editingMatchId || !newStartDate || !newMatchDate) return

    setLoading(true)
    setLoadingAction(`save-${editingMatchId}`)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/fixtures/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingMatchId,
          newStartDate,
          newMatchDate,
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

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
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

      {/* Round Spacing / Matchday Pager */}
      {allRounds.length > 0 && (
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-[#111111] border border-white/10 rounded-xl p-1.5 sm:p-2 sm:min-w-[280px] w-fit ml-auto">
          <button
            onClick={(e) => {
              e.preventDefault()
              const idx = allRounds.indexOf(activeRound)
              if (idx > 0) setActiveRound(allRounds[idx - 1])
            }}
            disabled={allRounds.indexOf(activeRound) === 0}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ◀ Prev
          </button>

          <CustomSelect
            value={activeRound}
            options={allRounds}
            onChange={setActiveRound}
          />

          <button
            onClick={(e) => {
              e.preventDefault()
              const idx = allRounds.indexOf(activeRound)
              if (idx < allRounds.length - 1) setActiveRound(allRounds[idx + 1])
            }}
            disabled={allRounds.indexOf(activeRound) === allRounds.length - 1}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next ▶
          </button>
        </div>
      )}

      {sortedDates.map((dateKey) => {
        const matchesOnDate = matchesByDate[dateKey]
        const displayDate = new Date(dateKey + 'T00:00:00')
        const dayName = displayDate.toLocaleDateString('en-US', { weekday: 'long' })
        const dateStr = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

        return (
          <div key={dateKey} className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {matchesOnDate[0]?.round || activeRound}
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
                  {dayName}, {dateStr}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addGapAfterMatchday(dateKey, 1)}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingAction === `gap-1-${dateKey}` ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    '+1 Day'
                  )}
                </button>
                <button
                  onClick={() => addGapAfterMatchday(dateKey, 2)}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingAction === `gap-2-${dateKey}` ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    '+2 Days'
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {matchesOnDate.map((match) => (
                <div key={match.id} className="rounded-xl bg-black/30 border border-white/10 p-3 sm:p-4">
                  {editingMatchId === match.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-gray-400 mb-1">New Start Date</label>
                          <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-gray-400 mb-1">Deadline Offset</label>
                          <select
                            value={matchDateOffset}
                            onChange={(e) => setMatchDateOffset(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value={0}>Same Day (+0 days)</option>
                            <option value={1}>1 Day Offset (+1 day)</option>
                            <option value={2}>2 Days Offset (+2 days)</option>
                            <option value={3}>3 Days Offset (+3 days)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-gray-400 mb-1">Computed Deadline</label>
                          <div className="px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-[#E8A800] text-sm font-bold truncate">
                            {newMatchDate ? new Date(newMatchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-gray-400 mb-1">Gap (days)</label>
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

                      <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
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
                    <>
                      {/* Desktop View: Show both Start Date and Match/Deadline Date */}
                      <div className="hidden md:flex items-center justify-between">
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

                        {/* Dates column/row display */}
                        <div className="flex items-center gap-6 mr-6">
                          <div className="text-right">
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Start Time</div>
                            <div className="text-xs text-[#E8A800] font-black">{match.startDate ? formatDate(match.startDate) : 'N/A'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Deadline</div>
                            <div className="text-xs text-[#E8A800] font-black">{formatDate(match.matchDate)}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleEditDate(match)}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                        >
                          Edit Date
                        </button>
                      </div>

                      {/* Mobile View: Beautifully compact and responsive layout with both dates */}
                      <div className="md:hidden space-y-3">
                        <div className="grid grid-cols-7 items-center gap-2">
                          {/* Home Team */}
                          <div className="col-span-3 flex items-center justify-end gap-1.5 text-right">
                            <span className="text-white font-bold text-xs truncate">{match.homeTeam.team.name}</span>
                            <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {match.homeTeam.team.logoUrl ? (
                                <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-xs">⚽</span>
                              )}
                            </div>
                          </div>
                          {/* VS */}
                          <div className="col-span-1 text-center text-gray-500 font-bold text-xs">vs</div>
                          {/* Away Team */}
                          <div className="col-span-3 flex items-center justify-start gap-1.5 text-left">
                            <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {match.awayTeam.team.logoUrl ? (
                                <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-xs">⚽</span>
                              )}
                            </div>
                            <span className="text-white font-bold text-xs truncate">{match.awayTeam.team.name}</span>
                          </div>
                        </div>

                        {/* Mobile Dates Column */}
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-center">
                          <div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Start Time</div>
                            <div className="text-xs text-[#E8A800] font-black">{match.startDate ? formatDate(match.startDate) : 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Deadline</div>
                            <div className="text-xs text-[#E8A800] font-black">{formatDate(match.matchDate)}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleEditDate(match)}
                          className="w-full py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-all"
                        >
                          Edit Date
                        </button>
                      </div>
                    </>
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
