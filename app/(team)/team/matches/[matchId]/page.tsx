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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href="/team/matches"
            className="inline-flex items-center gap-2 text-[#7A7367] hover:text-[#E8A800] transition-colors mb-3 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Matches
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Match Details
            </span>
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Match Header */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div>
              <div className="text-xs sm:text-sm text-[#D4CCBB] mb-1 font-medium">
                {new Date(match.matchDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs sm:text-sm text-[#7A7367] font-medium">
                {new Date(match.matchDate).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1 bg-[#E8A800]/10 border border-[#E8A800]/30 rounded-lg text-[#E8A800] text-xs sm:text-sm font-bold">
                {match.tournament.name}
              </div>
              {match.group && (
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[#7A7367] text-xs sm:text-sm font-medium">
                  {match.group.name}
                </div>
              )}
            </div>
          </div>

          {/* Match Type & Status */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[#7A7367] text-xs sm:text-sm font-medium">
              {match.matchType.replace(/_/g, " ")}
            </div>
            <div
              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                match.status === "COMPLETED"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : match.status === "LIVE"
                  ? "bg-red-500/10 border border-red-500/30 text-red-400"
                  : match.status === "POSTPONED"
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                  : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
              }`}
            >
              {match.status}
            </div>
            {result && (
              <div
                className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                  result === "won"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : result === "draw"
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {result === "won" ? "Victory" : result === "draw" ? "Draw" : "Defeat"}
              </div>
            )}
          </div>

          {/* Teams & Score */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 items-center">
            {/* Home Team */}
            <div className="text-center">
              {match.homeTeam.team.logoUrl && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-3 rounded-xl overflow-hidden bg-white/5 ring-2 ring-white/10">
                  <Image
                    src={match.homeTeam.team.logoUrl}
                    alt={match.homeTeam.team.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              )}
              <h2
                className={`text-sm sm:text-lg lg:text-xl font-black ${
                  isHomeTeam ? "text-[#E8A800]" : "text-white"
                }`}
              >
                {match.homeTeam.team.name}
              </h2>
              {isHomeTeam && (
                <div className="text-xs text-[#E8A800] mt-1 font-bold">Your Team</div>
              )}
            </div>

            {/* Score */}
            <div className="text-center">
              {match.status === "COMPLETED" || match.status === "LIVE" ? (
                <div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </div>
                  {(match.homePenalty !== null || match.awayPenalty !== null) && (
                    <div className="text-xs sm:text-sm text-[#7A7367] font-medium">
                      Penalties: {match.homePenalty ?? 0} - {match.awayPenalty ?? 0}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl font-black text-[#7A7367]">VS</div>
              )}
            </div>

            {/* Away Team */}
            <div className="text-center">
              {match.awayTeam.team.logoUrl && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-3 rounded-xl overflow-hidden bg-white/5 ring-2 ring-white/10">
                  <Image
                    src={match.awayTeam.team.logoUrl}
                    alt={match.awayTeam.team.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              )}
              <h2
                className={`text-sm sm:text-lg lg:text-xl font-black ${
                  isAwayTeam ? "text-[#E8A800]" : "text-white"
                }`}
              >
                {match.awayTeam.team.name}
              </h2>
              {isAwayTeam && (
                <div className="text-xs text-[#E8A800] mt-1 font-bold">Your Team</div>
              )}
            </div>
          </div>
        </div>

        {/* Match Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Venue */}
          {match.venue && (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-black text-white mb-3">Venue</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-[#D4CCBB] font-bold text-sm sm:text-base">{match.venue}</div>
              </div>
            </div>
          )}

          {/* Round */}
          {match.round && (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-black text-white mb-3">Round</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-[#D4CCBB] font-bold text-sm sm:text-base">{match.round}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tournament Info */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-black text-white mb-4">Tournament Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Tournament</div>
              <div className="text-white font-black text-sm sm:text-base">{match.tournament.name}</div>
            </div>
            <div>
              <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Season</div>
              <div className="text-white font-black text-sm sm:text-base">{match.tournament.season.name}</div>
            </div>
            <div>
              <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Type</div>
              <div className="text-white font-black text-sm sm:text-base">
                {match.tournament.tournamentType.replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {match.notes && (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-black text-white mb-3">Match Notes</h3>
            <p className="text-[#D4CCBB] text-sm sm:text-base">{match.notes}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link
            href={`/team/tournaments/${match.tournamentId}`}
            className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="text-white font-bold text-sm sm:text-base group-hover:text-[#E8A800] transition-colors">View Tournament</div>
          </Link>
          <Link
            href="/team/matches"
            className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all text-center group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white font-bold text-sm sm:text-base group-hover:text-[#E8A800] transition-colors">All Matches</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
