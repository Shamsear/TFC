'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'

export interface MatchRow {
  id: string
  startDate?: Date | string | null
  matchDate: Date
  status: string
  homeScore: number | null
  awayScore: number | null
  round: string | null
  homeTeamId: string
  awayTeamId: string
  homeTeam: {
    id: string
    teamId: string
    team: {
      id: string
      name: string
      logoUrl: string | null
    }
  }
  awayTeam: {
    id: string
    teamId: string
    team: {
      id: string
      name: string
      logoUrl: string | null
    }
  }
}

interface TournamentMatchesProps {
  matches: MatchRow[]
  myTeamId?: string | null
  teamLinkBase?: string
}

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
        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-[#E8A800] focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-xs sm:text-sm font-black text-left gap-1 cursor-pointer"
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
        <div className="absolute z-30 mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:min-w-[160px] max-h-60 overflow-y-auto rounded-xl bg-[#0D0D0D]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] py-1 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] cursor-pointer ${
                  isSelected ? 'text-[#E8A800] bg-[#E8A800]/5 font-black' : 'text-gray-300 font-bold'
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

export default function TournamentMatches({
  matches,
  myTeamId,
  teamLinkBase = '/teams',
}: TournamentMatchesProps) {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all')

  // Extract all unique rounds in the matches list and sort them numerically
  const baseRounds = Array.from(new Set(matches.map(m => m.round || 'Round 1'))).sort((a, b) => {
    const getRoundNum = (name: string) => {
      const num = name.match(/\d+/)
      return num ? parseInt(num[0], 10) : 1
    }
    return getRoundNum(a) - getRoundNum(b)
  })

  const allRounds = baseRounds.length > 0 ? ['All Matchdays', ...baseRounds] : []

  const [activeRound, setActiveRound] = useState<string>('All Matchdays')

  // Filter matches based on selected round and status
  const filteredMatches = matches.filter(match => {
    const isSameRound = activeRound === 'All Matchdays' || (match.round || 'Round 1') === activeRound
    if (!isSameRound) return false
    if (filter === 'all') return true
    return match.status === (filter === 'scheduled' ? 'SCHEDULED' : filter === 'live' ? 'LIVE' : 'COMPLETED')
  })

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const getRoundDates = (match: MatchRow) => {
    const deadline = new Date(match.matchDate)
    const started = match.startDate ? new Date(match.startDate) : new Date(deadline.getTime() - 2 * 24 * 60 * 60 * 1000)
    
    const formatFull = (d: Date) => 
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' at ' + 
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    return {
      startedStr: formatFull(started),
      deadlineStr: formatFull(deadline)
    }
  }

  const statusStyle = (s: string) => {
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'LIVE') return 'bg-red-500/15 border border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse'
    if (s === 'WALKOVER') return 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
    if (s === 'VOID') return 'bg-slate-500/10 border border-slate-500/30 text-slate-400'
    return 'bg-white/5 border border-white/10 text-[#D4CCBB]'
  }

  return (
    <div className="space-y-6">
      {/* Filters & Pager Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filters */}
        <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-x-auto scrollbar-hide backdrop-blur-md">
          {['all', 'scheduled', 'live', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                filter === status
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_4px_12px_rgba(232,168,0,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Round Spacing / Matchday Pager */}
        {allRounds.length > 0 && (
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-1.5 backdrop-blur-md sm:min-w-[290px]">
            <button
              onClick={(e) => {
                e.preventDefault()
                const idx = allRounds.indexOf(activeRound)
                if (idx > 0) setActiveRound(allRounds[idx - 1])
              }}
              disabled={allRounds.indexOf(activeRound) === 0}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

      {/* Active Round Schedule Info Banner */}
      {activeRound !== 'All Matchdays' && filteredMatches.length > 0 && (
        <div className="rounded-2xl border border-[#E8A800]/30 bg-gradient-to-r from-[#E8A800]/10 via-white/[0.01] to-[#E8A800]/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-base sm:text-lg">📅</span>
            <div>
              <span className="font-bold text-[#7A7367] uppercase tracking-wider text-[9px] block mb-0.5">Round Activated:</span>{' '}
              <span className="text-gray-300 font-extrabold block sm:inline">{getRoundDates(filteredMatches[0]).startedStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base sm:text-lg">🚨</span>
            <div>
              <span className="font-black text-[#E8A800] uppercase tracking-wider text-[9px] block mb-0.5">Submission Deadline:</span>{' '}
              <span className="font-black text-[#E8A800] block sm:inline underline decoration-wavy decoration-[#E8A800]/40">{getRoundDates(filteredMatches[0]).deadlineStr}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main List Rows */}
      <div className="space-y-4">
        {filteredMatches.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            myTeamId={myTeamId}
            teamLinkBase={teamLinkBase}
            statusStyle={statusStyle}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        ))}

        {filteredMatches.length === 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-12 text-center backdrop-blur-md shadow-lg">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs">No matches found for {activeRound} under this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  myTeamId,
  teamLinkBase,
  statusStyle,
  formatDate,
  formatTime,
}: {
  match: MatchRow
  myTeamId?: string | null
  teamLinkBase: string
  statusStyle: (s: string) => string
  formatDate: (d: Date) => string
  formatTime: (d: Date) => string
}) {
  const isMyMatch = myTeamId && (match.homeTeam.teamId === myTeamId || match.awayTeam.teamId === myTeamId)
  const isHome = myTeamId && (match.homeTeam.teamId === myTeamId)
  const isAway = myTeamId && (match.awayTeam.teamId === myTeamId)

  // Determine win / loss / draw badge for completed match relative to 'myTeamId'
  let resultBadge = null
  if ((match.status === 'COMPLETED' || match.status === 'WALKOVER') && isMyMatch && match.homeScore !== null && match.awayScore !== null) {
    if (match.homeScore === match.awayScore) {
      resultBadge = <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white/10 text-gray-300">D</span>
    } else {
      const myScore = isHome ? match.homeScore : match.awayScore
      const oppScore = isHome ? match.awayScore : match.homeScore
      if (myScore > oppScore) {
        resultBadge = <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">W</span>
      } else {
        resultBadge = <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-400/10 text-red-400 border border-red-400/20">L</span>
      }
    }
  }

  const resultBorder = isMyMatch
    ? 'bg-gradient-to-br from-[#E8A800]/[0.03] to-[#E8A800]/[0.01] border-[#E8A800]/30 hover:border-[#E8A800]/50 hover:bg-[#E8A800]/[0.05] shadow-[0_4px_20px_rgba(232,168,0,0.04)]'
    : 'bg-white/[0.01] border-white/10 hover:border-white/20 hover:bg-white/[0.03]'

  return (
    <Link
      href={`/team/matches/${match.id}`}
      className={`block rounded-2xl border p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 shadow-md backdrop-blur-md ${resultBorder}`}
    >
      {/* Top line: Round & Date */}
      <div className="flex items-center justify-between mb-3.5 text-[11px] sm:text-xs font-black text-gray-500 tracking-widest uppercase">
        <div className="flex items-center gap-2">
          {match.round && <span>{match.round.toUpperCase()}</span>}
          {resultBadge}
        </div>
        <div className="flex items-center gap-2.5">
          <span>
            {match.startDate
              ? formatDate(new Date(match.startDate))
              : formatDate(new Date(new Date(match.matchDate).getTime() - 2 * 24 * 60 * 60 * 1000))}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${statusStyle(match.status)}`}>
            {match.status === 'IN_PROGRESS' ? 'LIVE' : match.status}
          </span>
        </div>
      </div>

      {/* Main Score/Teams area */}
      <div className="grid grid-cols-7 items-center gap-2 mt-4">
        {/* Home Team */}
        <div
          className="col-span-3 flex items-center justify-end gap-2 sm:gap-3 lg:gap-4 text-right group"
        >
          <span className={`font-black text-xs sm:text-sm md:text-base lg:text-lg group-hover:text-[#FFC93A] transition-colors truncate ${
            isHome ? 'text-[#E8A800]' : 'text-gray-300'
          }`}>
            {match.homeTeam.team.name}
          </span>
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-md">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain p-0.5" sizes="(max-width: 640px) 28px, 44px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">
                {match.homeTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Score Display Box */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === 'WALKOVER' ? (
            <div className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-400 shadow-md">
              W/O
            </div>
          ) : match.status === 'VOID' ? (
            <div className="px-2.5 py-1 rounded-xl bg-slate-500/10 border border-slate-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 shadow-md">
              VOID
            </div>
          ) : match.status === 'COMPLETED' ? (
            <div className="flex items-center gap-1.5 font-black text-sm sm:text-base md:text-lg lg:text-xl text-white bg-black/60 px-3 py-1 rounded-xl border border-white/5 shadow-md">
              <span>{match.homeScore}</span>
              <span className="text-gray-600 text-xs sm:text-sm font-black">:</span>
              <span>{match.awayScore}</span>
            </div>
          ) : match.status === 'LIVE' ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 font-black text-sm sm:text-base md:text-lg lg:text-xl text-[#FFB347] bg-[#FFB347]/10 px-3 py-1 rounded-xl border border-[#FFB347]/20 shadow-lg">
                <span>{match.homeScore ?? 0}</span>
                <span className="text-gray-600 text-xs sm:text-sm font-black">:</span>
                <span>{match.awayScore ?? 0}</span>
              </div>
            </div>
          ) : (
            <span className={`px-3 py-1 rounded-xl border text-[9px] sm:text-[10px] font-black tracking-widest uppercase bg-black/60 border-white/5 text-gray-500 shadow-md`}>
              VS
            </span>
          )}
        </div>

        {/* Away Team */}
        <div
          className="col-span-3 flex items-center justify-start gap-2 sm:gap-3 lg:gap-4 text-left group"
        >
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-md">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain p-0.5" sizes="(max-width: 640px) 28px, 44px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">
                {match.awayTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className={`font-black text-xs sm:text-sm md:text-base lg:text-lg group-hover:text-[#FFC93A] transition-colors truncate ${
            isAway ? 'text-[#E8A800]' : 'text-gray-300'
          }`}>
            {match.awayTeam.team.name}
          </span>
        </div>
      </div>
    </Link>
  )
}
