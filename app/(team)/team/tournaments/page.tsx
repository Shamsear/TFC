import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export const metadata = {
  title: "Tournaments | Team Dashboard",
  description: "View tournaments and standings",
}

export default async function TournamentsPage() {
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
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Tournaments
              </span>
            </h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="text-center py-12 sm:py-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">No Active Season</h2>
            <p className="text-[#7A7367] text-sm sm:text-base">There is no active season at the moment.</p>
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Tournaments
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Team Standings Summary */}
        {teamStandings.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">{team?.name} Standings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {teamStandings.map((standing) => (
                <Link
                  key={standing.id}
                  href={`/team/tournaments/${standing.tournamentId}`}
                  className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all group"
                >
                  <div className="text-sm sm:text-base text-[#D4CCBB] mb-2 font-medium group-hover:text-[#E8A800] transition-colors">{standing.tournament.name}</div>
                  {standing.groupName && (
                    <div className="text-xs text-[#7A7367] mb-3">{standing.groupName}</div>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Pos</div>
                      <div className="text-[#E8A800] font-black text-lg sm:text-xl">
                        {standing.position || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Pts</div>
                      <div className="text-white font-black text-lg sm:text-xl">{standing.points}</div>
                    </div>
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">W-D-L</div>
                      <div className="text-white text-sm font-bold">
                        {standing.won}-{standing.drawn}-{standing.lost}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GD</div>
                      <div
                        className={`font-black text-lg sm:text-xl ${
                          standing.goalDiff > 0
                            ? "text-emerald-400"
                            : standing.goalDiff < 0
                            ? "text-red-400"
                            : "text-[#7A7367]"
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
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">All Tournaments</h2>
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/team/tournaments/${tournament.id}`}
                  className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        tournament.status === "IN_PROGRESS"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : tournament.status === "COMPLETED"
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          : tournament.status === "UPCOMING"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                          : "bg-white/5 border border-white/10 text-[#7A7367]"
                      }`}
                    >
                      {tournament.status.replace(/_/g, " ")}
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white mb-2 group-hover:text-[#E8A800] transition-colors">
                    {tournament.name}
                  </h3>

                  <div className="text-xs sm:text-sm text-[#7A7367] mb-4 font-medium">
                    {tournament.tournamentType.replace(/_/g, " ")}
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#7A7367] font-medium">Start Date</span>
                      <span className="text-[#D4CCBB] font-bold">
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {tournament.endDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#7A7367] font-medium">End Date</span>
                        <span className="text-[#D4CCBB] font-bold">
                          {new Date(tournament.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-[#7A7367] font-medium">Teams</span>
                      <span className="text-white font-black">
                        {tournament._count.tournamentTeams}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#7A7367] font-medium">Matches</span>
                      <span className="text-white font-black">
                        {tournament._count.matches}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-[#7A7367] text-sm sm:text-base">No tournaments in this season yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
