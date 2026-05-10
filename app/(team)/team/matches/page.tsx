import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export const metadata = {
  title: "Matches | Team Dashboard",
  description: "View team matches",
}

export default async function MatchesPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason || !seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Active Season</h1>
            <p className="text-gray-400">There is no active season at the moment.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get current season team
  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
  })

  if (!currentSeasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Not Participating</h1>
            <p className="text-gray-400">Your team is not participating in the current season.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get all matches (upcoming and past)
  const allMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId: activeSeason.id,
      },
      OR: [
        { homeTeamId: currentSeasonTeam.id },
        { awayTeamId: currentSeasonTeam.id },
      ],
    },
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
      tournament: true,
    },
    orderBy: {
      matchDate: "desc",
    },
  })

  // Separate upcoming and past matches
  const now = new Date()
  const upcomingMatches = allMatches.filter((m) => new Date(m.matchDate) > now || m.status === "SCHEDULED")
  const pastMatches = allMatches.filter((m) => new Date(m.matchDate) <= now && m.status !== "SCHEDULED")

  // Calculate stats
  const wins = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    const isHome = m.homeTeamId === currentSeasonTeam.id
    if (isHome) {
      return (m.homeScore || 0) > (m.awayScore || 0)
    } else {
      return (m.awayScore || 0) > (m.homeScore || 0)
    }
  }).length

  const draws = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    return m.homeScore === m.awayScore
  }).length

  const losses = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    const isHome = m.homeTeamId === currentSeasonTeam.id
    if (isHome) {
      return (m.homeScore || 0) < (m.awayScore || 0)
    } else {
      return (m.awayScore || 0) < (m.homeScore || 0)
    }
  }).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              {team?.name} Matches
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Played</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{pastMatches.length}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Wins</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{wins}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Draws</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-yellow-400">{draws}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Losses</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-400">{losses}</div>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6">Upcoming Matches</h2>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {upcomingMatches.map((match) => {
                const isHome = match.homeTeamId === currentSeasonTeam.id
                return (
                  <Link
                    key={match.id}
                    href={`/team/matches/${match.id}`}
                    className="block rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                      <div className="text-xs sm:text-sm text-[#7A7367]">
                        {new Date(match.matchDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div className="px-3 py-1 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg text-[#E8A800] text-xs sm:text-sm font-medium w-fit">
                        {match.tournament.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
                      <div className={`text-right text-sm sm:text-base ${isHome ? "text-[#E8A800] font-bold" : "text-white font-medium"}`}>
                        {match.homeTeam.team.name}
                      </div>
                      <div className="text-center">
                        <div className="text-[#7A7367] text-xs sm:text-sm font-medium">VS</div>
                        {match.venue && (
                          <div className="text-xs text-[#7A7367] mt-1 hidden sm:block">{match.venue}</div>
                        )}
                      </div>
                      <div className={`text-left text-sm sm:text-base ${!isHome ? "text-[#E8A800] font-bold" : "text-white font-medium"}`}>
                        {match.awayTeam.team.name}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[#7A7367] text-sm sm:text-base">No upcoming matches scheduled</p>
            </div>
          )}
        </div>

        {/* Past Matches */}
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6">Past Matches</h2>
          {pastMatches.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {pastMatches.map((match) => {
                const isHome = match.homeTeamId === currentSeasonTeam.id
                const won =
                  match.status === "COMPLETED" &&
                  ((isHome && (match.homeScore || 0) > (match.awayScore || 0)) ||
                    (!isHome && (match.awayScore || 0) > (match.homeScore || 0)))
                const draw = match.status === "COMPLETED" && match.homeScore === match.awayScore

                return (
                  <Link
                    key={match.id}
                    href={`/team/matches/${match.id}`}
                    className="block rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                      <div className="text-xs sm:text-sm text-[#7A7367]">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[#7A7367] text-xs sm:text-sm font-medium">
                          {match.tournament.name}
                        </div>
                        {match.status === "COMPLETED" && (
                          <div
                            className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                              won
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : draw
                                ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                                : "bg-red-500/10 border border-red-500/20 text-red-400"
                            }`}
                          >
                            {won ? "Won" : draw ? "Draw" : "Lost"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
                      <div className={`text-right text-sm sm:text-base ${isHome ? "text-[#E8A800] font-bold" : "text-white font-medium"}`}>
                        {match.homeTeam.team.name}
                      </div>
                      <div className="text-center">
                        {match.status === "COMPLETED" ? (
                          <div className="text-xl sm:text-2xl font-black text-white">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        ) : (
                          <div className="text-[#7A7367] text-xs sm:text-sm">{match.status}</div>
                        )}
                      </div>
                      <div className={`text-left text-sm sm:text-base ${!isHome ? "text-[#E8A800] font-bold" : "text-white font-medium"}`}>
                        {match.awayTeam.team.name}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p className="text-[#7A7367] text-sm sm:text-base">No matches played yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
