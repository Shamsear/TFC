import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const match = await prisma.matches.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { team: true } },
      awayTeam: { include: { team: true } },
      tournament: true,
    },
  })

  return {
    title: `${match?.homeTeam.team.name} vs ${match?.awayTeam.team.name} | Match Details`,
    description: `Match details`,
  }
}

export default async function MatchDetailsPage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth()
  const { matchId } = await params

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Get match info
  const match = await prisma.matches.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: true,
        },
      },
      awayTeam: {
        include: {
          team: true,
        },
      },
      tournament: {
        include: {
          season: true,
        },
      },
      group: true,
    },
  })

  if (!match) {
    notFound()
  }

  // Check if user's team is involved
  const isHomeTeam = match.homeTeam.teamId === session.user.teamId
  const isAwayTeam = match.awayTeam.teamId === session.user.teamId
  const isInvolved = isHomeTeam || isAwayTeam

  // Determine match result for user's team
  let result: "won" | "draw" | "lost" | null = null
  if (match.status === "COMPLETED" && isInvolved) {
    if (match.homeScore === match.awayScore) {
      result = "draw"
    } else if (isHomeTeam) {
      result = (match.homeScore || 0) > (match.awayScore || 0) ? "won" : "lost"
    } else {
      result = (match.awayScore || 0) > (match.homeScore || 0) ? "won" : "lost"
    }
  }

  const getRoundDates = () => {
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-20 w-80 h-80 bg-[#E8A800]/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Header Sticky Bar */}
      <div className="border-b border-white/5 bg-white/[0.01] sticky top-0 z-45 backdrop-blur-md mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <Link
            href="/team/matches"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Matches</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFB347] to-[#E8A800] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(232,168,0,0.15)]">
              Match Details
            </span>
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        {/* Round Prominent Display */}
        {match.round && (
          <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-emerald-500/10 via-white/[0.01] to-transparent border-l-4 border-emerald-500 p-3.5 rounded-r-xl">
            <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest">
              Fixture Round: <span className="text-emerald-400">{match.round.toUpperCase()}</span>
            </span>
          </div>
        )}

        {/* Round Active Info & Deadline Banner */}
        {match.round && (
          <div className="rounded-2xl border border-[#E8A800]/30 bg-gradient-to-r from-[#E8A800]/10 via-white/[0.01] to-[#E8A800]/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm mb-6 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-base sm:text-lg">📅</span>
              <div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[9px] block mb-0.5">Round Activated:</span>{' '}
                <span className="text-gray-300 font-extrabold block sm:inline">{getRoundDates().startedStr}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base sm:text-lg">🚨</span>
              <div>
                <span className="font-black text-[#E8A800] uppercase tracking-wider text-[9px] block mb-0.5">Submission Deadline:</span>{' '}
                <span className="font-black text-[#E8A800] block sm:inline underline decoration-wavy decoration-[#E8A800]/40">{getRoundDates().deadlineStr}</span>
              </div>
            </div>
          </div>
        )}

        {/* Match Scoreboard Frame */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-6 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-6 border-b border-white/5 gap-3">
            <div>
              <div className="text-xs sm:text-sm text-gray-400 mb-1 font-bold uppercase tracking-wider">
                {new Date(match.matchDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Kickoff Time: {new Date(match.matchDate).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
                {match.tournament.name}
              </div>
              {match.round && (
                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {match.round.toUpperCase()}
                </div>
              )}
              {match.group && (
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {match.group.name.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Match Type & Status Pills */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
              {match.matchType.replace(/_/g, " ")}
            </div>
            <div
              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider border ${
                match.status === "COMPLETED"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                  : match.status === "LIVE"
                  ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse"
                  : match.status === "POSTPONED"
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                  : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
              }`}
            >
              {match.status}
            </div>
            {result && (
              <div
                className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider border ${
                  result === "won"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                    : result === "draw"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                    : "bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                }`}
              >
                {result === "won" ? "Victory" : result === "draw" ? "Draw" : "Defeat"}
              </div>
            )}
          </div>

          {/* Core Scoreboard: Teams & Large Score */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 items-center py-4">
            {/* Home Team */}
            <div className="text-center group">
              {match.homeTeam.team.logoUrl && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-black/40 border border-white/10 p-1 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={match.homeTeam.team.logoUrl}
                    alt={match.homeTeam.team.name}
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              )}
              <h2
                className={`text-sm sm:text-lg lg:text-xl font-black tracking-tight transition-colors ${
                  isHomeTeam ? "text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.2)]" : "text-white"
                }`}
              >
                {match.homeTeam.team.name}
              </h2>
              {isHomeTeam && (
                <div className="mt-1.5"><span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase shadow-[0_0_8px_rgba(16,185,129,0.1)]">Your Franchise</span></div>
              )}
            </div>

            {/* Scoreboard Number Display */}
            <div className="text-center">
              {match.status === "COMPLETED" || match.status === "LIVE" ? (
                <div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-400 via-white to-[#E8A800] bg-clip-text text-transparent mb-2 select-none tracking-tighter drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </div>
                  {(match.homePenalty !== null || match.awayPenalty !== null) && (
                    <div className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider mt-2">
                      Penalties: {match.homePenalty ?? 0} - {match.awayPenalty ?? 0}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-black text-gray-600 tracking-widest select-none">VS</div>
              )}
            </div>

            {/* Away Team */}
            <div className="text-center group">
              {match.awayTeam.team.logoUrl && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-black/40 border border-white/10 p-1 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={match.awayTeam.team.logoUrl}
                    alt={match.awayTeam.team.name}
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              )}
              <h2
                className={`text-sm sm:text-lg lg:text-xl font-black tracking-tight transition-colors ${
                  isAwayTeam ? "text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.2)]" : "text-white"
                }`}
              >
                {match.awayTeam.team.name}
              </h2>
              {isAwayTeam && (
                <div className="mt-1.5"><span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase shadow-[0_0_8px_rgba(16,185,129,0.1)]">Your Franchise</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Venue Information */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {match.venue && (
            <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-lg hover:border-[#E8A800]/20 transition-all">
              <h3 className="text-base sm:text-lg font-black text-white mb-3 tracking-tight">Match Arena Venue</h3>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(232,168,0,0.1)]">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-gray-300 font-extrabold text-sm sm:text-base">{match.venue}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tournament & Season Details Sheet */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 sm:p-6 mb-6 sm:mb-8 backdrop-blur-md shadow-lg">
          <h3 className="text-base sm:text-lg font-black text-white mb-4 tracking-tight">Tournament Ledger Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Tournament</div>
              <div className="text-white font-extrabold text-sm sm:text-base">{match.tournament.name}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Active Season</div>
              <div className="text-white font-extrabold text-sm sm:text-base">{match.tournament.season.name}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Competition Type</div>
              <div className="text-white font-extrabold text-sm sm:text-base">
                {match.tournament.tournamentType === 'LEAGUE_PLAYOFF'
                  ? 'League with Playoff'
                  : match.tournament.tournamentType === 'LEAGUE_ONLY'
                  ? 'League Only'
                  : match.tournament.tournamentType === 'GROUP_KNOCKOUT'
                  ? 'Group Stage + Knockout'
                  : match.tournament.tournamentType === 'KNOCKOUT_ONLY'
                  ? 'Knockout Only'
                  : (match.tournament.tournamentType as string).replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {match.notes && (
          <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 sm:p-6 mb-6 sm:mb-8 backdrop-blur-md">
            <h3 className="text-base sm:text-lg font-black text-white mb-3 tracking-tight">Match Notes</h3>
            <p className="text-gray-300 font-medium text-sm sm:text-base leading-relaxed">{match.notes}</p>
          </div>
        )}

        {/* Quick Redirect Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/team/tournaments/${match.tournamentId}`}
            className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 hover:border-[#E8A800]/50 hover:bg-white/[0.05] transition-all text-center group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_10px_rgba(232,168,0,0.1)] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="text-white font-black text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors uppercase tracking-wider">View Tournament</div>
          </Link>
          <Link
            href="/team/matches"
            className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 hover:border-[#E8A800]/50 hover:bg-white/[0.05] transition-all text-center group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_10px_rgba(232,168,0,0.1)] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white font-black text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors uppercase tracking-wider">All Fixtures</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
