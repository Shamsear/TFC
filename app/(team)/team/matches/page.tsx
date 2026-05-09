import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Matches | Team Dashboard",
  description: "View team matches",
}

export default async function MatchesPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{team?.name} Matches</h1>
              <p className="text-gray-400">{activeSeason.name}</p>
            </div>
            <Link
              href="/team"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Played</div>
              <div className="text-2xl font-bold text-white">{pastMatches.length}</div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Wins</div>
              <div className="text-2xl font-bold text-green-400">{wins}</div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Draws</div>
              <div className="text-2xl font-bold text-yellow-400">{draws}</div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Losses</div>
              <div className="text-2xl font-bold text-red-400">{losses}</div>
            </div>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Matches</h2>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-4">
              {upcomingMatches.map((match) => {
                const isHome = match.homeTeamId === currentSeasonTeam.id
                return (
                  <Link
                    key={match.id}
                    href={`/team/matches/${match.id}`}
                    className="block bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-400">
                        {new Date(match.matchDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div className="px-3 py-1 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg text-[#E8A800] text-sm">
                        {match.tournament.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className={`text-right ${isHome ? "text-[#E8A800] font-bold" : "text-white"}`}>
                        {match.homeTeam.team.name}
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400 text-sm">VS</div>
                        {match.venue && (
                          <div className="text-xs text-gray-500 mt-1">{match.venue}</div>
                        )}
                      </div>
                      <div className={`text-left ${!isHome ? "text-[#E8A800] font-bold" : "text-white"}`}>
                        {match.awayTeam.team.name}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-gray-400">No upcoming matches scheduled</p>
            </div>
          )}
        </div>

        {/* Past Matches */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Past Matches</h2>
          {pastMatches.length > 0 ? (
            <div className="space-y-4">
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
                    className="block bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-400">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm">
                          {match.tournament.name}
                        </div>
                        {match.status === "COMPLETED" && (
                          <div
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              won
                                ? "bg-green-500/10 border border-green-500/20 text-green-400"
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

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className={`text-right ${isHome ? "text-[#E8A800] font-bold" : "text-white"}`}>
                        {match.homeTeam.team.name}
                      </div>
                      <div className="text-center">
                        {match.status === "COMPLETED" ? (
                          <div className="text-2xl font-bold text-white">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">{match.status}</div>
                        )}
                      </div>
                      <div className={`text-left ${!isHome ? "text-[#E8A800] font-bold" : "text-white"}`}>
                        {match.awayTeam.team.name}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <div className="text-4xl mb-2">⚽</div>
              <p className="text-gray-400">No matches played yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
