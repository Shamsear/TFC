import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

// Icon Components
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function SeasonsListPage() {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const seasons = await prisma.seasons.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seasonTeams: {
        include: {
          team: true
        }
      },
      transferHistory: true,
      seasonalPlayerStats: true
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Seasons
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base lg:text-lg">
            Manage tournament seasons
          </p>
        </div>

        {/* Create Season Button */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/super-admin/seasons/new"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base"
          >
            <PlusIcon />
            Create Season
          </Link>
        </div>

        {seasons.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <CalendarIcon />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-2">No seasons created yet</div>
            <div className="text-[#D4CCBB] mb-4 sm:mb-6 text-sm sm:text-base">Create your first season to get started</div>
            <Link
              href="/super-admin/seasons/new"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-sm sm:text-base"
            >
              <PlusIcon />
              Create Your First Season
            </Link>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {seasons.map((season) => {
              const teamsCount = season.seasonTeams.length
              const transfersCount = season.transferHistory.length
              const playersCount = season.seasonalPlayerStats.length

              return (
                <div
                  key={season.id}
                  className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                    <div className="flex-1 mb-4 sm:mb-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{season.name}</h3>
                        {season.isActive && (
                          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 sm:px-3 py-1 rounded-full border border-emerald-500/30 font-bold w-fit">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <DollarIcon />
                        <div className="text-xs text-gray-400 font-medium">Starting Purse</div>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-blue-400">
                        ${season.startingPurse.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <TrophyIcon />
                        <div className="text-xs text-gray-400 font-medium">Teams</div>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-purple-400">
                        {teamsCount}
                      </div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl bg-pink-500/10 border border-pink-500/20 p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <UsersIcon />
                        <div className="text-xs text-gray-400 font-medium">Players</div>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-pink-400">
                        {playersCount}
                      </div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <ArrowRightIcon />
                        <div className="text-xs text-gray-400 font-medium">Transfers</div>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-yellow-400">
                        {transfersCount}
                      </div>
                    </div>
                  </div>

                  {/* Participating Teams */}
                  {teamsCount > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 sm:mb-3">
                        Participating Teams
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {season.seasonTeams.slice(0, 8).map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-1 sm:gap-2 bg-white/5 border border-white/10 px-2 sm:px-3 py-1 sm:py-2 rounded-lg hover:bg-white/10 transition-all"
                          >
                            {st.team.logoUrl ? (
                              <img
                                src={st.team.logoUrl}
                                alt={st.team.name}
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                              />
                            ) : (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 flex items-center justify-center">
                                <span className="text-xs font-black">
                                  {st.team.name.substring(0, 1)}
                                </span>
                              </div>
                            )}
                            <span className="text-xs sm:text-sm font-medium truncate">{st.team.name}</span>
                          </div>
                        ))}
                        {season.seasonTeams.length > 8 && (
                          <div className="flex items-center bg-white/5 border border-white/10 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm text-gray-400 font-medium">
                            +{season.seasonTeams.length - 8} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
