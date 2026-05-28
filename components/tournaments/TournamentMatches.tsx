'use client'

import Link from 'next/link'
import Image from 'next/image'

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

import { useState, useRef, useEffect } from 'react'

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
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'LIVE') return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
    return 'bg-white/5 border-white/20 text-[#D4CCBB]'
  }

  return (
    <div className="space-y-6">
      {/* Filters & Pager Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['all', 'scheduled', 'live', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-white/5 text-[#7A7367] hover:bg-white/10 hover:text-[#D4CCBB]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

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

      {/* Active Round Schedule Info Banner */}
      {activeRound !== 'All Matchdays' && filteredMatches.length > 0 && (
        <div className="rounded-xl border border-[#E8A800]/25 bg-[#E8A800]/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base sm:text-lg">📅</span>
            <div>
              <span className="font-bold text-[#7A7367] uppercase tracking-wider text-[10px]">Round Active:</span>{' '}
              <span className="text-[#F5F0E8] font-bold block sm:inline">{getRoundDates(filteredMatches[0]).startedStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base sm:text-lg">🚨</span>
            <div>
              <span className="font-black text-[#E8A800] uppercase tracking-wider text-[10px]">Submission Deadline:</span>{' '}
              <span className="font-extrabold text-[#E8A800] block sm:inline underline decoration-wavy decoration-[#E8A800]">{getRoundDates(filteredMatches[0]).deadlineStr}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main List Rows */}
      <div className="space-y-3">
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
          <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
            <svg className="w-12 h-12 text-[#7A7367] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#7A7367] font-bold text-sm">No matches found for {activeRound} under this filter</p>
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
  if (match.status === 'COMPLETED' && isMyMatch && match.homeScore !== null && match.awayScore !== null) {
    if (match.homeScore === match.awayScore) {
      resultBadge = <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white/10 text-[#D4CCBB]">D</span>
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

  return (
    <Link
      href={`/team/matches/${match.id}`}
      className={`block rounded-xl border p-4 sm:p-6 lg:p-7 transition-all ${
        isMyMatch
          ? 'bg-[#E8A800]/[0.03] border-[#E8A800]/20 hover:border-[#E8A800]/30 shadow-md hover:bg-[#E8A800]/[0.05]'
          : 'bg-[#111111] border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.03]'
      }`}
    >
      {/* Top line: Round & Date */}
      <div className="flex items-center justify-between mb-3 text-[11px] sm:text-xs font-bold text-[#7A7367] tracking-wider uppercase">
        <div className="flex items-center gap-2">
          {match.round && <span>Round {match.round}</span>}
          {resultBadge}
        </div>
        <div className="flex items-center gap-1.5">
          <span>
            {match.startDate
              ? formatDate(new Date(match.startDate))
              : formatDate(new Date(new Date(match.matchDate).getTime() - 2 * 24 * 60 * 60 * 1000))}
          </span>
        </div>
      </div>

      {/* Main Score/Teams area */}
      <div className="grid grid-cols-7 items-center gap-2">
        {/* Home Team */}
        <div
          className="col-span-3 flex items-center justify-end gap-2 sm:gap-3 lg:gap-4 text-right group"
        >
          <span className={`font-bold text-xs sm:text-sm md:text-base lg:text-lg group-hover:text-[#E8A800] transition-colors truncate ${
            isHome ? 'text-[#E8A800]' : 'text-[#F5F0E8]'
          }`}>
            {match.homeTeam.team.name}
          </span>
          <div className="relative w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex-shrink-0 rounded-md overflow-hidden">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain" sizes="(max-width: 640px) 24px, 40px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] sm:text-xs font-black text-[#7A7367] bg-white/5">
                {match.homeTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Score or Status display */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === 'COMPLETED' ? (
            <div className="flex items-center gap-1 font-black text-sm sm:text-base md:text-lg lg:text-xl text-[#F5F0E8] bg-white/5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-white/5">
              <span>{match.homeScore}</span>
              <span className="text-[#7A7367] text-xs sm:text-sm font-normal">:</span>
              <span>{match.awayScore}</span>
            </div>
          ) : match.status === 'LIVE' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 font-black text-sm sm:text-base md:text-lg lg:text-xl text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-[#FFB347]/20">
                <span>{match.homeScore ?? 0}</span>
                <span className="text-[#7A7367] text-xs sm:text-sm font-normal">:</span>
                <span>{match.awayScore ?? 0}</span>
              </div>
              <span className="text-[8px] font-black text-[#FFB347] tracking-wider uppercase animate-pulse">LIVE</span>
            </div>
          ) : (
            <span className={`px-2 py-0.5 sm:px-3.5 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-black tracking-wider uppercase ${statusStyle(match.status)}`}>
              VS
            </span>
          )}
        </div>

        {/* Away Team */}
        <div
          className="col-span-3 flex items-center justify-start gap-2 sm:gap-3 lg:gap-4 text-left group"
        >
          <div className="relative w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex-shrink-0 rounded-md overflow-hidden">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain" sizes="(max-width: 640px) 24px, 40px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] sm:text-xs font-black text-[#7A7367] bg-white/5">
                {match.awayTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className={`font-bold text-xs sm:text-sm md:text-base lg:text-lg group-hover:text-[#E8A800] transition-colors truncate ${
            isAway ? 'text-[#E8A800]' : 'text-[#F5F0E8]'
          }`}>
            {match.awayTeam.team.name}
          </span>
        </div>
      </div>
    </Link>
  )
}
