import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canEditTeam, checkTeamSeasonParticipation } from "@/lib/team-auth"
import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Team Profile | Turf Cats",
  description: "Team profile and information",
}

export default async function TeamProfilePage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is participating in active season
  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    include: {
      seasonTeams: {
        include: {
          season: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Check if user can edit this team
  const canEdit = await canEditTeam(team.id)

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Get current season team data
  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: activeSeason.id,
            teamId: team.id,
          },
        },
      })
    : null

  // Get team statistics
  const totalSeasons = team.seasonTeams.length
  const totalTrophies = team.seasonTeams.reduce(
    (sum, st) => sum + st.trophiesWon,
    0
  )

  // Get match statistics for current season
  const matchStats = currentSeasonTeam
    ? await prisma.matches.findMany({
        where: {
          OR: [
            { homeTeamId: currentSeasonTeam.id },
            { awayTeamId: currentSeasonTeam.id },
          ],
          status: "COMPLETED",
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      })
    : []

  // Calculate win/draw/loss
  let wins = 0
  let draws = 0
  let losses = 0

  matchStats.forEach((match) => {
    if (match.homeScore === null || match.awayScore === null) return

    const isHome = match.homeTeamId === currentSeasonTeam?.id
    const teamScore = isHome ? match.homeScore : match.awayScore
    const opponentScore = isHome ? match.awayScore : match.homeScore

    if (teamScore > opponentScore) wins++
    else if (teamScore === opponentScore) draws++
    else losses++
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Profile</h1>
          <p className="text-gray-400">
            View and manage your team information
          </p>
        </div>

        {/* Team Information Card */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            {/* Team Logo */}
            {team.logoUrl && (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Team Details */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {team.name}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Manager:</span>
                  <span className="text-white font-medium">
                    {team.managerName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Team ID:</span>
                  <span className="text-white font-mono text-sm">{team.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Member Since:</span>
                  <span className="text-white">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            {canEdit && (
              <div>
                <button
                  disabled
                  className="px-6 py-3 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg font-medium opacity-50 cursor-not-allowed"
                >
                  Edit Profile
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Coming Soon
                </p>
              </div>
            )}
          </div>

          {/* Current Season Info */}
          {activeSeason && currentSeasonTeam && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Current Season: {activeSeason.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Budget</div>
                  <div className="text-white text-xl font-bold">
                    ${currentSeasonTeam.currentBudget.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Trophies</div>
                  <div className="text-white text-xl font-bold">
                    {currentSeasonTeam.trophiesWon}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Matches</div>
                  <div className="text-white text-xl font-bold">
                    {wins + draws + losses}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Win Rate</div>
                  <div className="text-white text-xl font-bold">
                    {wins + draws + losses > 0
                      ? `${Math.round((wins / (wins + draws + losses)) * 100)}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team History */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-6">
          <h3 className="text-xl font-bold text-white mb-6">Team History</h3>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#E8A800] mb-1">
                {totalSeasons}
              </div>
              <div className="text-gray-400 text-sm">Seasons Played</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#E8A800] mb-1">
                {totalTrophies}
              </div>
              <div className="text-gray-400 text-sm">Total Trophies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#E8A800] mb-1">
                {wins}
              </div>
              <div className="text-gray-400 text-sm">Wins (Current)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#E8A800] mb-1">
                {losses}
              </div>
              <div className="text-gray-400 text-sm">Losses (Current)</div>
            </div>
          </div>

          {/* Season Participation */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Season Participation
            </h4>
            {team.seasonTeams.length > 0 ? (
              <div className="space-y-3">
                {team.seasonTeams.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-white font-medium">
                          {st.season.name}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {st.season.isActive ? (
                            <span className="text-green-400">● Active</span>
                          ) : (
                            <span>Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Budget</div>
                        <div className="text-white font-medium">
                          ${st.currentBudget.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Trophies</div>
                        <div className="text-white font-medium">
                          {st.trophiesWon}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No season participation yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/team/squad"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="text-white font-medium">View Squad</div>
          </Link>
          <Link
            href="/team/matches"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">⚽</div>
            <div className="text-white font-medium">Matches</div>
          </Link>
          <Link
            href="/team/tournaments"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-white font-medium">Tournaments</div>
          </Link>
          <Link
            href="/team/finances"
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-[#E8A800]/50 transition-all text-center"
          >
            <div className="text-3xl mb-2">💰</div>
            <div className="text-white font-medium">Finances</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
