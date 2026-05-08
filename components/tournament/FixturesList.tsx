'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
}

export default function FixturesList({ matches, tournamentId, seasonId }: FixturesListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all')

  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true
    return match.status.toLowerCase() === filter
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      LIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
      COMPLETED: 'bg-[#7A7367]/20 text-[#7A7367] border-[#7A7367]/30',
      POSTPONED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30'
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
      {/* Filters */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
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

      {/* Matches List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredMatches.map((match) => {
          // Determine winner/loser
          const hasScore = match.homeScore !== null && match.awayScore !== null
          const homeWin = hasScore && match.homeScore! > match.awayScore!
          const awayWin = hasScore && match.awayScore! > match.homeScore!
          const isDraw = hasScore && match.homeScore === match.awayScore

          return (
            <Link
              key={match.id}
              href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/matches/${match.id}`}
              className="block rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
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
                        <img src={match.homeTeam.team.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg sm:text-xl">⚽</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {hasScore ? (
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
                        <img src={match.awayTeam.team.logoUrl} alt="" className="w-full h-full object-cover" />
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
