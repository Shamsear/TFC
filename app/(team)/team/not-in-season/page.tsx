import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export const metadata = {
  title: "Not in Active Season | Turf Cats",
  description: "Team not participating in active season",
}

export default async function NotInSeasonPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
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

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Get team's past seasons
  const pastSeasons = team.seasonTeams.filter(st => !st.season.isActive)

  // Calculate total stats across all seasons
  const totalTrophies = team.seasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0)
  const seasonsPlayed = team.seasonTeams.length

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {team.logoUrl && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5">
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <p className="text-gray-400">Manager: {team.managerName}</p>
            </div>
          </div>
        </div>

        {/* Not in Active Season Banner */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-yellow-400 mb-2">
                Not Participating in Active Season
              </h2>
              <p className="text-gray-300 mb-3">
                Your team is not registered for the current active season.
                {activeSeason && (
                  <span className="block mt-1">
                    Active Season: <span className="text-[#E8A800] font-medium">{activeSeason.name}</span>
                  </span>
                )}
              </p>
              <p className="text-gray-400 text-sm">
                Contact the super admin to register your team for upcoming seasons.
              </p>
            </div>
          </div>
        </div>

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Seasons Played</span>
              <span className="text-2xl">📅</span>
            </div>
            <div className="text-3xl font-bold text-white">{seasonsPlayed}</div>
            <div className="text-xs text-gray-400 mt-1">Total participation</div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Trophies</span>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalTrophies}</div>
            <div className="text-xs text-gray-400 mt-1">All-time wins</div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Team Status</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-lg font-bold text-yellow-400">Inactive</div>
            <div className="text-xs text-gray-400 mt-1">Not in active season</div>
          </div>
        </div>

        {/* Past Seasons */}
        {pastSeasons.length > 0 && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Past Seasons</h2>
            <div className="space-y-3">
              {pastSeasons.map((st) => (
                <div
                  key={st.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-medium">{st.season.name}</div>
                    <div className="text-gray-400 text-sm mt-1">
                      Ended: {new Date(st.season.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">Final Budget</div>
                      <div className="text-white font-medium">
                        ${st.finalBudget?.toLocaleString() || st.currentBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">Trophies</div>
                      <div className="text-white font-medium">{st.trophiesWon}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Actions */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">What You Can Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/team/profile"
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">👤</div>
                <div>
                  <div className="text-white font-medium">View Team Profile</div>
                  <div className="text-gray-400 text-sm">See your team information and history</div>
                </div>
              </div>
            </Link>

            <Link
              href="/seasons"
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">📅</div>
                <div>
                  <div className="text-white font-medium">Browse All Seasons</div>
                  <div className="text-gray-400 text-sm">View past and current seasons</div>
                </div>
              </div>
            </Link>

            <Link
              href="/teams"
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">🏟️</div>
                <div>
                  <div className="text-white font-medium">View All Teams</div>
                  <div className="text-gray-400 text-sm">See other teams in the league</div>
                </div>
              </div>
            </Link>

            <Link
              href="/tournaments"
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">🏆</div>
                <div>
                  <div className="text-white font-medium">View Tournaments</div>
                  <div className="text-gray-400 text-sm">Browse tournament history</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💬</div>
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-2">
                Want to Join the Next Season?
              </h3>
              <p className="text-gray-300 text-sm">
                Contact the super admin to register your team for upcoming seasons. 
                Registration typically opens before each new season begins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
