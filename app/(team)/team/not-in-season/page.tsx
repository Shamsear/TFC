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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-black/40 backdrop-blur-xl mb-6 sm:mb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-2">
            <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="lg" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent">
                  {team.name}
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base font-medium">Manager: {team.managerName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">

        {/* Not in Active Season Banner */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 sm:p-6 mb-6 sm:mb-8">
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
              <p className="text-[#D4CCBB] text-sm sm:text-base mb-3 font-medium">
                Your team is not registered for the current active season.
                {activeSeason && (
                  <span className="block mt-1">
                    Active Season: <span className="text-[#E8A800] font-black">{activeSeason.name}</span>
                  </span>
                )}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm font-medium">
                Contact the super admin to register your team for upcoming seasons.
              </p>
            </div>
          </div>
        </div>

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">Seasons Played</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{seasonsPlayed}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">Total participation</div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">Total Trophies</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalTrophies}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">All-time wins</div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.01] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">Team Status</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400">Inactive</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">Not in active season</div>
          </div>
        </div>

        {/* Past Seasons */}
        {pastSeasons.length > 0 && (
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 mb-6 sm:mb-8 backdrop-blur-xl">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Past Seasons</h2>
            <div className="space-y-3">
              {pastSeasons.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl bg-white/[0.01] border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/10 transition-all"
                >
                  <div>
                    <div className="text-white font-bold">{st.season.name}</div>
                    <div className="text-gray-500 text-sm mt-1 font-medium">
                      Ended: {new Date(st.season.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Final Budget</div>
                      <div className="text-emerald-400 font-black">
                        £{st.finalBudget?.toLocaleString() || st.currentBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Trophies</div>
                      <div className="text-[#E8A800] font-black">{st.trophiesWon}</div>
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
