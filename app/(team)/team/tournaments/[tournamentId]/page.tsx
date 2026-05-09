import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export async function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
  })

  return {
    title: `${tournament?.name || "Tournament"} | Tournaments`,
    description: `View ${tournament?.name || "tournament"} details`,
  }
}

export default async function TournamentDetailsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const session = await auth()
  const { tournamentId } = await params

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  // Get tournament info
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
    },
  })

  if (!tournament) {
    notFound()
  }

  // Get current season team
  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: tournament.seasonId,
        teamId: session.user.teamId,
      },
    },
  })

  // Get standings
  const standings = await prisma.standings.findMany({
    where: {
      tournamentId,
    },
    include: {
      seasonTeam: {
        include: {
          team: true,
        },
      },
    },
    orderBy: [{ groupName: "asc" }, { position: "asc" }, { points: "desc" }],
  })

  // Group standings by group
  const standingsByGroup = standings.reduce((acc, standing) => {
    const group = standing.groupName || "Overall"
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(standing)
    return acc
  }, {} as Record<string, typeof standings>)

  // Get matches
  const matches = await prisma.matches.findMany({
    where: {
      tournamentId,
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
      group: true,
    },
    orderBy: {
      matchDate: "desc",
    },
    take: 10,
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/team/tournaments"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all mb-6"
        >
          ← Back to Tournaments
        </Link>

        {/* Tournament Header */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
              <p className="text-gray-400">{tournament.season.name}</p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Type</div>
              <div className="text-white font-medium">
                {tournament.tournamentType.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Start Date</div>
              <div className="text-white font-medium">
                {new Date(tournament.startDate).toLocaleDateString()}
              </div>
            </div>
            {tournament.endDate && (
              <div>
                <div className="text-gray-400 text-sm mb-1">End Date</div>
                <div className="text-white font-medium">
                  {new Date(tournament.endDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {tournament.description && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-gray-300">{tournament.description}</p>
            </div>
          )}
        </div>

        {/* Standings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Standings</h2>
          {Object.keys(standingsByGroup).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(standingsByGroup).map(([groupName, groupStandings]) => (
                <div
                  key={groupName}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">{groupName}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Pos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Team
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            P
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            W
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            D
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            L
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            GF
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            GA
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            GD
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            Pts
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((standing, index) => {
                          const isUserTeam = standing.teamId === currentSeasonTeam?.id
                          return (
                            <tr
                              key={standing.id}
                              className={`border-b border-white/5 ${
                                isUserTeam ? "bg-[#E8A800]/10" : ""
                              }`}
                            >
                              <td className="px-6 py-4 text-white font-bold">
                                {standing.position || index + 1}
                              </td>
                              <td
                                className={`px-6 py-4 font-medium ${
                                  isUserTeam ? "text-[#E8A800]" : "text-white"
                                }`}
                              >
                                {standing.seasonTeam.team.name}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.played}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.won}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.drawn}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.lost}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.goalsFor}
                              </td>
                              <td className="px-6 py-4 text-center text-gray-300">
                                {standing.goalsAgainst}
                              </td>
                              <td
                                className={`px-6 py-4 text-center font-medium ${
                                  standing.goalDiff > 0
                                    ? "text-green-400"
                                    : standing.goalDiff < 0
                                    ? "text-red-400"
                                    : "text-gray-300"
                                }`}
                              >
                                {standing.goalDiff > 0 ? "+" : ""}
                                {standing.goalDiff}
                              </td>
                              <td className="px-6 py-4 text-center text-white font-bold">
                                {standing.points}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <p className="text-gray-400">No standings available yet</p>
            </div>
          )}
        </div>

        {/* Recent Matches */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Matches</h2>
          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => {
                const isUserTeam =
                  match.homeTeam.teamId === session.user.teamId ||
                  match.awayTeam.teamId === session.user.teamId
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
                        {match.group && (
                          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm">
                            {match.group.name}
                          </div>
                        )}
                        <div
                          className={`px-3 py-1 rounded-lg text-sm ${
                            match.status === "COMPLETED"
                              ? "bg-green-500/10 border border-green-500/20 text-green-400"
                              : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          }`}
                        >
                          {match.status}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div
                        className={`text-right ${
                          match.homeTeam.teamId === session.user.teamId
                            ? "text-[#E8A800] font-bold"
                            : "text-white"
                        }`}
                      >
                        {match.homeTeam.team.name}
                      </div>
                      <div className="text-center">
                        {match.status === "COMPLETED" ? (
                          <div className="text-2xl font-bold text-white">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        ) : (
                          <div className="text-gray-400">VS</div>
                        )}
                      </div>
                      <div
                        className={`text-left ${
                          match.awayTeam.teamId === session.user.teamId
                            ? "text-[#E8A800] font-bold"
                            : "text-white"
                        }`}
                      >
                        {match.awayTeam.team.name}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <p className="text-gray-400">No matches scheduled yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
