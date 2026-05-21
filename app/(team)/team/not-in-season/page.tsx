import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import TeamLogo from "@/components/team/TeamLogo"

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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-2">
            <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="lg" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  {team.name}
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">Manager: {team.managerName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Not in Active Season Banner */}
        <div className="rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-black text-amber-400 mb-2">
                Not Participating in Active Season
              </h2>
              <p className="text-[#D4CCBB] text-sm sm:text-base mb-3">
                Your team is not registered for the current active season.
                {activeSeason && (
                  <span className="block mt-1">
                    Active Season: <span className="text-[#E8A800] font-bold">{activeSeason.name}</span>
                  </span>
                )}
              </p>
              <p className="text-[#7A7367] text-xs sm:text-sm">
                Contact the super admin to register your team for upcoming seasons.
              </p>
            </div>
          </div>
        </div>

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#7A7367] text-xs sm:text-sm font-medium">Seasons Played</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{seasonsPlayed}</div>
            <div className="text-xs text-[#7A7367] mt-1 font-medium">Total participation</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#7A7367] text-xs sm:text-sm font-medium">Total Trophies</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalTrophies}</div>
            <div className="text-xs text-[#7A7367] mt-1 font-medium">All-time wins</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#7A7367] text-xs sm:text-sm font-medium">Team Status</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400">Inactive</div>
            <div className="text-xs text-[#7A7367] mt-1 font-medium">Not in active season</div>
          </div>
        </div>

        {/* Past Seasons */}
        {pastSeasons.length > 0 && (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Past Seasons</h2>
            <div className="space-y-3">
              {pastSeasons.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-white font-bold">{st.season.name}</div>
                    <div className="text-[#7A7367] text-sm mt-1 font-medium">
                      Ended: {new Date(st.season.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[#7A7367] text-xs font-medium">Final Budget</div>
                      <div className="text-white font-black">
                        ${st.finalBudget?.toLocaleString() || st.currentBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#7A7367] text-xs font-medium">Trophies</div>
                      <div className="text-white font-black">{st.trophiesWon}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Actions */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">What You Can Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/team/profile"
              className="rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 hover:border-[#E8A800]/50 p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base group-hover:text-[#E8A800] transition-colors">View Team Profile</div>
                  <div className="text-[#7A7367] text-xs sm:text-sm">See your team information and history</div>
                </div>
              </div>
            </Link>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">Browse Seasons</div>
                  <div className="text-[#7A7367] text-xs sm:text-sm">Available when season is active</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">View Teams</div>
                  <div className="text-[#7A7367] text-xs sm:text-sm">Available when season is active</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">View Tournaments</div>
                  <div className="text-[#7A7367] text-xs sm:text-sm">Available when season is active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl sm:rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-blue-400 mb-2">
                Want to Join the Next Season?
              </h3>
              <p className="text-[#D4CCBB] text-xs sm:text-sm">
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
