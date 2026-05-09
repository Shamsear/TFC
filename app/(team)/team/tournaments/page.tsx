import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Tournaments | Team Dashboard",
  description: "View tournaments and standings",
}

export default async function TournamentsPage() {
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

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get all tournaments in current season
  const tournaments = await prisma.tournaments.findMany({
    where: {
      seasonId: activeSeason.id,
    },
    include: {
      _count: {
        select: {
          tournamentTeams: true,
          matches: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  })

  // Get standings for user's team
  const teamStandings = currentSeasonTeam
    ? await prisma.standings.findMany({
        where: {
          teamId: currentSeasonTeam.id,
        },
        include: {
          tournament: true,
        },
      })
    : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
              <p className="text-gray-400">{activeSeason.name}</p>
            </div>
            <Link
              href="/team"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Team Standings Summary */}
        {teamStandings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">{team?.name} Standings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamStandings.map((standing) => (
                <Link
                  key={standing.id}
                  href={`/team/tournaments/${standing.tournamentId}`}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all"
                >
                  <div className="text-sm text-gray-400 mb-2">{standing.tournament.name}</div>
                  {standing.groupName && (
                    <div className="text-xs text-gray-500 mb-3">{standing.groupName}</div>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Pos</div>
                      <div className="text-[#E8A800] font-bold text-lg">
                        {standing.position || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Pts</div>
                      <div className="text-white font-bold text-lg">{standing.points}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-1">W-D-L</div>
                      <div className="text-white text-sm">
                        {standing.won}-{standing.drawn}-{standing.lost}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-1">GD</div>
                      <div
                        className={`font-bold text-lg ${
                          standing.goalDiff > 0
                            ? "text-green-400"
                            : standing.goalDiff < 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {standing.goalDiff > 0 ? "+" : ""}
                        {standing.goalDiff}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Tournaments */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">All Tournaments</h2>
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/team/tournaments/${tournament.id}`}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">🏆</div>
                    <div
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        tournament.status === "IN_PROGRESS"
                          ? "bg-green-500/10 border border-green-500/20 text-green-400"
                          : tournament.status === "COMPLETED"
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          : tournament.status === "UPCOMING"
                          ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                      }`}
                    >
                      {tournament.status.replace(/_/g, " ")}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#E8A800] transition-colors">
                    {tournament.name}
                  </h3>

                  <div className="text-sm text-gray-400 mb-4">
                    {tournament.tournamentType.replace(/_/g, " ")}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Start Date</span>
                      <span className="text-white">
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {tournament.endDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">End Date</span>
                        <span className="text-white">
                          {new Date(tournament.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-gray-400">Teams</span>
                      <span className="text-white font-bold">
                        {tournament._count.tournamentTeams}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Matches</span>
                      <span className="text-white font-bold">
                        {tournament._count.matches}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-400">No tournaments in this season yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
