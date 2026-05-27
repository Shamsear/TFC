'use client'

import Link from 'next/link'
import Image from 'next/image'

export interface MatchRow {
  id: string
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

export default function TournamentMatches({
  matches,
  myTeamId,
  teamLinkBase = '/teams',
}: TournamentMatchesProps) {
  const completedMatches = matches.filter(m => m.status === 'COMPLETED')
  const liveMatches = matches.filter(m => m.status === 'LIVE')
  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED')

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const statusStyle = (s: string) => {
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'LIVE') return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
    return 'bg-white/5 border-white/20 text-[#D4CCBB]'
  }

  return (
    <div className="space-y-6">
      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FFB347] animate-pulse" />
            <h2 className="text-sm font-black text-[#FFB347] uppercase tracking-wider">Live Now</h2>
          </div>
          <div className="space-y-2.5">
            {liveMatches.map(m => (
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
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-[#D4CCBB] uppercase tracking-wider mb-3">Upcoming Matches</h2>
          <div className="space-y-2.5">
            {upcomingMatches.map(m => (
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
          </div>
        </div>
      )}

      {/* Results / Completed Matches */}
      {completedMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-[#D4CCBB] uppercase tracking-wider mb-3">Results & Completed</h2>
          <div className="space-y-2.5">
            {completedMatches.map(m => (
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
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
          <svg className="w-12 h-12 text-[#7A7367] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[#7A7367] font-medium">No matches scheduled yet</p>
        </div>
      )}
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
    <div
      className={`rounded-xl border p-4 transition-all ${
        isMyMatch
          ? 'bg-[#E8A800]/[0.03] border-[#E8A800]/20 hover:border-[#E8A800]/30 shadow-md'
          : 'bg-[#111111] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Top line: Round & Date */}
      <div className="flex items-center justify-between mb-3 text-[11px] font-bold text-[#7A7367] tracking-wider uppercase">
        <div className="flex items-center gap-2">
          {match.round && <span>Round {match.round}</span>}
          {resultBadge}
        </div>
        <div className="flex items-center gap-1.5">
          <span>{formatDate(match.matchDate)}</span>
          <span>·</span>
          <span>{formatTime(match.matchDate)}</span>
        </div>
      </div>

      {/* Main Score/Teams area */}
      <div className="grid grid-cols-7 items-center gap-2">
        {/* Home Team */}
        <Link
          href={`${teamLinkBase}/${match.homeTeam.team.id}`}
          className="col-span-3 flex items-center justify-end gap-2 text-right group"
        >
          <span className={`font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors truncate ${
            isHome ? 'text-[#E8A800]' : 'text-[#F5F0E8]'
          }`}>
            {match.homeTeam.team.name}
          </span>
          <div className="relative w-6 h-6 flex-shrink-0 rounded-md overflow-hidden">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain" sizes="24px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5">
                {match.homeTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Score or Status display */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === 'COMPLETED' ? (
            <div className="flex items-center gap-1 font-black text-sm sm:text-base text-[#F5F0E8] bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <span>{match.homeScore}</span>
              <span className="text-[#7A7367] text-xs font-normal">:</span>
              <span>{match.awayScore}</span>
            </div>
          ) : match.status === 'LIVE' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 font-black text-sm sm:text-base text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded-lg border border-[#FFB347]/20">
                <span>{match.homeScore ?? 0}</span>
                <span className="text-[#7A7367] text-xs font-normal">:</span>
                <span>{match.awayScore ?? 0}</span>
              </div>
              <span className="text-[8px] font-black text-[#FFB347] tracking-wider uppercase animate-pulse">LIVE</span>
            </div>
          ) : (
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black tracking-wider uppercase ${statusStyle(match.status)}`}>
              VS
            </span>
          )}
        </div>

        {/* Away Team */}
        <Link
          href={`${teamLinkBase}/${match.awayTeam.team.id}`}
          className="col-span-3 flex items-center justify-start gap-2 text-left group"
        >
          <div className="relative w-6 h-6 flex-shrink-0 rounded-md overflow-hidden">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain" sizes="24px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5">
                {match.awayTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className={`font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors truncate ${
            isAway ? 'text-[#E8A800]' : 'text-[#F5F0E8]'
          }`}>
            {match.awayTeam.team.name}
          </span>
        </Link>
      </div>
    </div>
  )
}
