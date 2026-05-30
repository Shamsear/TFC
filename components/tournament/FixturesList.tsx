'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ShareableAdminFixtures from './ShareableAdminFixtures'

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
  matchDate: Date
  venue: string | null
  round: string | null
  matchType: string
  status: string
  homeScore: number | null
  awayScore: number | null
  homePenalty: number | null
  awayPenalty: number | null
  homeTeam: {
    team: {
      name: string
      logoUrl: string
    }
  }
  awayTeam: {
    team: {
      name: string
      logoUrl: string
    }
  }
  group: {
    name: string
  } | null
}

interface FixturesListProps {
  matches: Match[]
  tournamentId: string
  seasonId: string
  tournamentName?: string
  seasonName?: string
}

export default function FixturesList({ matches, tournamentId, seasonId, tournamentName, seasonName }: FixturesListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all')

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

  const filteredMatches = matches.filter(match => {
    const isSameRound = (match.round || 'Round 1') === activeRound
    if (!isSameRound) return false
    if (filter === 'all') return true
    return match.status.toLowerCase() === filter
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      LIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
      COMPLETED: 'bg-[#7A7367]/20 text-[#7A7367] border-[#7A7367]/30',
      POSTPONED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
      WALKOVER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      VOID: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
    return colors[status] || colors.SCHEDULED
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
          <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="text-lg sm:text-xl font-black text-white mb-2">No fixtures scheduled</div>
        <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
          Create fixtures to start scheduling matches
        </p>
        <Link
          href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/fixtures/new`}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
        >
          Create Fixtures
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Filters & Pager container */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['all', 'scheduled', 'live', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a]'
                  : 'bg-white/5 text-[#7A7367] hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <ShareableAdminFixtures
            matches={filteredMatches}
            tournamentName={tournamentName || 'Tournament'}
            seasonName={seasonName || 'Season'}
            activeRound={activeRound}
          />

          {/* Round Spacing / Matchday Pager */}
          {allRounds.length > 0 && (
            <div className="flex items-center justify-between sm:justify-end gap-3 bg-[#111111] border border-white/10 rounded-xl p-1.5 sm:p-2 sm:min-w-[280px]">
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
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredMatches.map((match) => {
          // Determine winner/loser
          const hasScore = match.homeScore !== null && match.awayScore !== null && match.status !== 'VOID'
          const homeWin = hasScore && match.homeScore! > match.awayScore!
          const awayWin = hasScore && match.awayScore! > match.homeScore!
          const isDraw = hasScore && match.homeScore === match.awayScore

          return (
            <Link
              key={match.id}
              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${match.id}`}
              className="block rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
            >
              {/* Desktop view: Unchanged UI/UX */}
              <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                {/* Date & Venue */}
                <div className="flex-shrink-0 lg:w-40">
                  <div className="text-xs sm:text-sm text-[#7A7367]">{formatDate(match.matchDate)}</div>
                  {match.venue && (
                    <div className="text-xs text-[#7A7367] mt-1">{match.venue}</div>
                  )}
                  {match.round && (
                    <div className="text-xs text-[#E8A800] mt-1 font-bold">{match.round}</div>
                  )}
                  {match.group && (
                    <div className="text-xs text-purple-400 mt-1 font-bold">{match.group.name}</div>
                  )}
                </div>

                {/* Teams & Score */}
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-8">
                  {/* Home Team */}
                  <div className={`flex items-center gap-3 flex-1 sm:justify-end p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all ${
                    homeWin ? 'bg-emerald-500/10' : awayWin ? 'opacity-60' : ''
                  }`}>
                    <div className="text-left sm:text-right flex-1 sm:flex-none">
                      <div className={`font-bold text-sm sm:text-base ${homeWin ? 'text-emerald-400' : 'text-white'} truncate`}>
                        {match.homeTeam.team.name}
                      </div>
                      {homeWin && (
                        <div className="text-xs text-emerald-400 font-bold mt-1">WINNER</div>
                      )}
                      {awayWin && (
                        <div className="text-xs text-red-400 font-bold mt-1">LOSER</div>
                      )}
                      {isDraw && (
                        <div className="text-xs text-yellow-400 font-bold mt-1">DRAW</div>
                      )}
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {match.homeTeam.team.logoUrl ? (
                        <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg sm:text-xl">⚽</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {match.status === 'WALKOVER' ? (
                      <div className="px-3 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-xs font-black uppercase tracking-wider text-purple-400">
                        W/O
                      </div>
                    ) : match.status === 'VOID' ? (
                      <div className="px-3 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-xs font-black uppercase tracking-wider text-slate-400">
                        VOID
                      </div>
                    ) : hasScore ? (
                      <>
                        <div className={`text-2xl sm:text-3xl font-black ${homeWin ? 'text-emerald-400' : 'text-white'}`}>
                          {match.homeScore}
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-[#7A7367]">-</div>
                        <div className={`text-2xl sm:text-3xl font-black ${awayWin ? 'text-emerald-400' : 'text-white'}`}>
                          {match.awayScore}
                        </div>
                        {match.homePenalty !== null && match.awayPenalty !== null && (
                          <div className="text-xs sm:text-sm text-[#7A7367] ml-2">
                            ({match.homePenalty} - {match.awayPenalty} pen)
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-lg sm:text-xl font-bold text-[#7A7367]">vs</div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className={`flex items-center gap-3 flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all ${
                    awayWin ? 'bg-emerald-500/10' : homeWin ? 'opacity-60' : ''
                  }`}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {match.awayTeam.team.logoUrl ? (
                        <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg sm:text-xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1 sm:flex-none">
                      <div className={`font-bold text-sm sm:text-base ${awayWin ? 'text-emerald-400' : 'text-white'} truncate`}>
                        {match.awayTeam.team.name}
                      </div>
                      {awayWin && (
                        <div className="text-xs text-emerald-400 font-bold mt-1">WINNER</div>
                      )}
                      {homeWin && (
                        <div className="text-xs text-red-400 font-bold mt-1">LOSER</div>
                      )}
                      {isDraw && (
                        <div className="text-xs text-yellow-400 font-bold mt-1">DRAW</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 lg:w-32 text-left lg:text-right">
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(match.status)}`}>
                    {match.status}
                  </span>
                </div>
              </div>

              {/* Mobile view: Beautifully optimized, compact and space-efficient */}
              <div className="lg:hidden space-y-3">
                {/* Top line: Round & Date */}
                <div className="flex items-center justify-between text-[11px] font-bold text-[#7A7367] tracking-wider uppercase border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    {match.round && <span className="text-[#E8A800]">{match.round}</span>}
                    {match.group && <span className="text-purple-400">{match.group.name}</span>}
                  </div>
                  <div>{formatDate(match.matchDate)}</div>
                </div>

                {/* Main Score/Teams grid */}
                <div className="grid grid-cols-7 items-center gap-2 py-1">
                  {/* Home Team */}
                  <div className="col-span-3 flex items-center justify-end gap-2 text-right">
                    <span className={`font-bold text-xs truncate ${homeWin ? 'text-emerald-400' : 'text-white'}`}>
                      {match.homeTeam.team.name}
                    </span>
                    <div className="w-6 h-6 flex-shrink-0 rounded-md overflow-hidden">
                      {match.homeTeam.team.logoUrl ? (
                        <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5 rounded-md">
                          {match.homeTeam.team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score or VS */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    {match.status === 'WALKOVER' ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-black uppercase tracking-wider text-purple-400">
                        W/O
                      </span>
                    ) : match.status === 'VOID' ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        VOID
                      </span>
                    ) : hasScore ? (
                      <div className="flex items-center gap-1 font-black text-xs text-[#F5F0E8] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                        <span>{match.homeScore}</span>
                        <span className="text-[#7A7367] text-[10px] font-normal">:</span>
                        <span>{match.awayScore}</span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-wider uppercase text-[#7A7367]">
                        VS
                      </span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="col-span-3 flex items-center justify-start gap-2 text-left">
                    <div className="w-6 h-6 flex-shrink-0 rounded-md overflow-hidden">
                      {match.awayTeam.team.logoUrl ? (
                        <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5 rounded-md">
                          {match.awayTeam.team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`font-bold text-xs truncate ${awayWin ? 'text-emerald-400' : 'text-white'}`}>
                      {match.awayTeam.team.name}
                    </span>
                  </div>
                </div>

                {/* Bottom line: Venue & Status */}
                <div className="flex items-center justify-between text-[10px] text-[#7A7367] pt-1">
                  <span className="truncate max-w-[180px]">{match.venue || ''}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getStatusColor(match.status)}`}>
                    {match.status}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-[#7A7367] text-sm sm:text-base">
          No {filter} matches found
        </div>
      )}
    </div>
  )
}
