'use client'

import Link from 'next/link'
import Image from 'next/image'

interface MatchDetailViewProps {
  match: {
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
    tournament: {
      id: string
      name: string
      season: {
        name: string
      }
    }
  }
}

export default function MatchDetailView({ match }: MatchDetailViewProps) {
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Button */}
      <Link
        href={`/tournaments/${match.tournament.id}?round=${encodeURIComponent(match.round || '')}`}
        className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to {match.tournament.name}
      </Link>

      {/* Match Header */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="text-xs sm:text-sm font-bold text-[#FFB347] uppercase">Match</span>
          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-bold ${getStatusColor(match.status)}`}>
            {match.status}
          </span>
        </div>

        <div className="text-xs sm:text-sm text-[#D4CCBB] mb-4 sm:mb-6">
          {match.tournament.name} • {match.round || 'Matchday'} • {match.tournament.season.name}
        </div>

        {/* Teams - Mobile */}
        <div className="sm:hidden space-y-4 mb-4">
          {/* Home Team */}
          <Link
            href={`/teams/${match.homeTeam.team.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#111111] border border-white/10 hover:border-[#E8A800]/30 transition-all"
          >
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
              <Image
                src={match.homeTeam.team.logoUrl || '/placeholder-team.png'}
                alt={match.homeTeam.team.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#7A7367] mb-0.5">HOME</div>
              <div className="text-base font-black text-[#F5F0E8] truncate">{match.homeTeam.team.name}</div>
            </div>
            {match.homeScore !== null && (
              <div className="text-3xl font-black text-[#E8A800]">{match.homeScore}</div>
            )}
          </Link>

          {/* Away Team */}
          <Link
            href={`/teams/${match.awayTeam.team.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#111111] border border-white/10 hover:border-[#E8A800]/30 transition-all"
          >
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10">
              <Image
                src={match.awayTeam.team.logoUrl || '/placeholder-team.png'}
                alt={match.awayTeam.team.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#7A7367] mb-0.5">AWAY</div>
              <div className="text-base font-black text-[#F5F0E8] truncate">{match.awayTeam.team.name}</div>
            </div>
            {match.awayScore !== null && (
              <div className="text-3xl font-black text-[#E8A800]">{match.awayScore}</div>
            )}
          </Link>
        </div>

        {/* Teams - Desktop */}
        <div className="hidden sm:flex items-center justify-center gap-8 mb-6">
          <Link
            href={`/teams/${match.homeTeam.team.id}`}
            className="text-center flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-white/5 border border-white/10">
              <Image
                src={match.homeTeam.team.logoUrl || '/placeholder-team.png'}
                alt={match.homeTeam.team.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="text-xs text-[#7A7367] mb-1">HOME</div>
            <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-2">{match.homeTeam.team.name}</div>
            {match.homeScore !== null && (
              <div className="text-4xl sm:text-5xl font-black text-[#E8A800]">{match.homeScore}</div>
            )}
          </Link>

          <div className="text-2xl font-black text-[#7A7367]">VS</div>

          <Link
            href={`/teams/${match.awayTeam.team.id}`}
            className="text-center flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-white/5 border border-white/10">
              <Image
                src={match.awayTeam.team.logoUrl || '/placeholder-team.png'}
                alt={match.awayTeam.team.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="text-xs text-[#7A7367] mb-1">AWAY</div>
            <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-2">{match.awayTeam.team.name}</div>
            {match.awayScore !== null && (
              <div className="text-4xl sm:text-5xl font-black text-[#E8A800]">{match.awayScore}</div>
            )}
          </Link>
        </div>

        <div className="text-center text-[#D4CCBB] text-xs sm:text-sm">
          <div>{formatDate(match.matchDate)}</div>
          {match.venue && <div className="mt-1">Venue: {match.venue}</div>}
        </div>
      </div>

      {/* Tournament Link */}
      <Link
        href={`/tournaments/${match.tournament.id}?round=${encodeURIComponent(match.round || '')}`}
        className="block rounded-xl bg-[#E8A800]/5 border border-[#E8A800]/20 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-[#E8A800]/10 transition-all"
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-bold text-[#E8A800] mb-1 text-sm sm:text-base">View Full Tournament</div>
            <div className="text-xs sm:text-sm text-[#D4CCBB]">
              See all matches from {match.tournament.name} - {match.round || 'Matchday'}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
