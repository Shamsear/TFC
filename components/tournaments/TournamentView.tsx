'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface TournamentViewProps {
  tournament: {
    id: string
    name: string
    tournamentType: string
    startDate: Date
    endDate: Date | null
    season: {
      name: string
    }
  }
  matches: Array<{
    id: string
    matchDate: Date
    round: string | null
    status: string
    homeScore: number | null
    awayScore: number | null
    venue: string | null
    homeTeam: {
      team: {
        id: string
        name: string
        logoUrl: string
      }
    }
    awayTeam: {
      team: {
        id: string
        name: string
        logoUrl: string
      }
    }
  }>
  rounds: string[]
  initialRound?: string
}

export default function TournamentView({ tournament, matches, rounds, initialRound }: TournamentViewProps) {
  const router = useRouter()
  const [selectedRound, setSelectedRound] = useState<string>(initialRound || 'all')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialRound) {
      setSelectedRound(initialRound)
    }
  }, [initialRound])

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
      case 'LIVE': return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
      case 'SCHEDULED': return 'bg-white/5 border-white/20 text-[#D4CCBB]'
      default: return 'bg-white/5 border-white/10 text-[#7A7367]'
    }
  }

  const handleRoundChange = (round: string) => {
    setSelectedRound(round)
    if (round === 'all') {
      router.push(`/tournaments/${tournament.id}`)
    } else {
      router.push(`/tournaments/${tournament.id}?round=${encodeURIComponent(round)}`)
    }
  }

  // Filter matches by selected round
  const filteredMatches = selectedRound === 'all' 
    ? matches 
    : matches.filter(m => m.round === selectedRound)

  // Group matches by round for display
  const matchesByRound = new Map<string, typeof matches>()
  filteredMatches.forEach(match => {
    const round = match.round || 'Unknown'
    if (!matchesByRound.has(round)) {
      matchesByRound.set(round, [])
    }
    matchesByRound.get(round)!.push(match)
  })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Calendar
      </Link>

      {/* Tournament Header */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-[#FFB347] uppercase">{tournament.tournamentType}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1 sm:mb-2">{tournament.name}</h1>
            <p className="text-sm sm:text-base text-[#D4CCBB]">{tournament.season.name}</p>
          </div>
          
          {/* View Standings Button */}
          <Link
            href={`/tournaments/${tournament.id}/standings`}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base whitespace-nowrap"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Standings
          </Link>
        </div>
      </div>

      {/* Round Filter */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3 sm:p-4">
        <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2 sm:mb-3 px-1">Filter by Matchday</label>
        <div className="relative">
          {/* Desktop: Arrow buttons */}
          <button
            onClick={scrollLeft}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 items-center justify-center rounded-full bg-[#111111] border border-white/10 hover:bg-[#181818] hover:border-[#E8A800]/30 transition-all"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Scrollable container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => handleRoundChange('all')}
              className={`flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                selectedRound === 'all'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
              }`}
            >
              All Matchdays
            </button>
            {rounds.map((round) => (
              <button
                key={round}
                onClick={() => handleRoundChange(round)}
                className={`flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  selectedRound === round
                    ? 'bg-[#E8A800] text-[#0a0a0a]'
                    : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
                }`}
              >
                {round}
              </button>
            ))}
          </div>

          <button
            onClick={scrollRight}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 items-center justify-center rounded-full bg-[#111111] border border-white/10 hover:bg-[#181818] hover:border-[#E8A800]/30 transition-all"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Matches */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-8 sm:p-12 text-center">
          <div className="text-[#7A7367]">No matches found</div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Array.from(matchesByRound.entries()).map(([round, roundMatches]) => (
            <div key={round} className="rounded-xl bg-white/[0.02] border border-white/10 p-3 sm:p-4">
              <h2 className="text-base sm:text-xl font-black text-[#F5F0E8] mb-3 sm:mb-4 px-1 sm:px-2">{round}</h2>
              
              <div className="space-y-2">
                {roundMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="block p-3 sm:p-4 rounded-lg border bg-[#111111] border-white/10 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
                  >
                    {/* Mobile Layout */}
                    <div className="flex flex-col gap-3 sm:hidden">
                      {/* Teams Row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
                            <Image
                              src={match.homeTeam.team.logoUrl || '/placeholder-team.png'}
                              alt={match.homeTeam.team.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                          <div className="font-bold text-[#F5F0E8] text-sm truncate">{match.homeTeam.team.name}</div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {match.homeScore !== null && match.awayScore !== null ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a0a0a] border border-white/10">
                              <span className="text-base font-black text-[#E8A800]">{match.homeScore}</span>
                              <span className="text-[#7A7367] text-xs">-</span>
                              <span className="text-base font-black text-[#E8A800]">{match.awayScore}</span>
                            </div>
                          ) : (
                            <div className="px-2.5 py-1 rounded bg-[#0a0a0a] border border-white/10">
                              <span className="text-[10px] text-[#7A7367] font-bold">VS</span>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <div className="font-bold text-[#F5F0E8] text-sm truncate text-right">{match.awayTeam.team.name}</div>
                          <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
                            <Image
                              src={match.awayTeam.team.logoUrl || '/placeholder-team.png'}
                              alt={match.awayTeam.team.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Match Info Row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <div className="text-[10px] text-[#D4CCBB]">
                          {formatDate(match.matchDate)}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center justify-between gap-4">
                      {/* Teams */}
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                          <div className="font-bold text-[#F5F0E8] text-base text-right">{match.homeTeam.team.name}</div>
                          <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
                            <Image
                              src={match.homeTeam.team.logoUrl || '/placeholder-team.png'}
                              alt={match.homeTeam.team.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {match.homeScore !== null && match.awayScore !== null ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0a0a0a] border border-white/10">
                              <span className="text-xl font-black text-[#E8A800]">{match.homeScore}</span>
                              <span className="text-[#7A7367]">-</span>
                              <span className="text-xl font-black text-[#E8A800]">{match.awayScore}</span>
                            </div>
                          ) : (
                            <div className="px-4 py-2 rounded-lg bg-[#0a0a0a] border border-white/10">
                              <span className="text-xs text-[#7A7367] font-bold">VS</span>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
                            <Image
                              src={match.awayTeam.team.logoUrl || '/placeholder-team.png'}
                              alt={match.awayTeam.team.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div className="font-bold text-[#F5F0E8] text-base">{match.awayTeam.team.name}</div>
                        </div>
                      </div>

                      {/* Match Info */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-xs text-[#D4CCBB]">
                          {formatDate(match.matchDate)}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
