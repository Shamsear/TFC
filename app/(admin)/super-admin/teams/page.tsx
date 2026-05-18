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

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function TeamsRegistryPage() {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const teams = await prisma.teams.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seasonTeams: {
        include: {
          season: true
        }
      },
      transferHistory: true
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pt-20 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Global Team Registry
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base lg:text-lg">
            Manage all teams across all seasons
          </p>
        </div>

        {/* Create Team Button */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/super-admin/teams/new"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base"
          >
            <PlusIcon />
            Create Team
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <UsersIcon />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-2">No teams in the registry yet</div>
            <div className="text-[#D4CCBB] mb-4 sm:mb-6 text-sm sm:text-base">Create your first team to get started</div>
            <Link
              href="/super-admin/teams/new"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-sm sm:text-base"
            >
              <PlusIcon />
              Create Your First Team
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {teams.map((team) => {
              const seasonsParticipated = team.seasonTeams.length
              const totalTransfers = team.transferHistory.length

              return (
                <div
                  key={team.id}
                  className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all"
                >
                  {/* Team Logo Section */}
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E8A800]/5 to-[#FFB347]/5"></div>
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-contain relative z-10"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 flex items-center justify-center relative z-10">
                        <span className="text-2xl sm:text-4xl font-black text-white">
                          {team.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Team Info Section */}
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">{team.name}</h3>
                    <div className="text-xs sm:text-sm text-[#D4CCBB] mb-3 sm:mb-4 flex items-center gap-2">
                      <UsersIcon />
                      <span className="truncate">{team.managerName}</span>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 p-2 sm:p-3">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <TrophyIcon />
                          <div className="text-xs text-gray-400">Seasons</div>
                        </div>
                        <div className="text-lg sm:text-2xl font-black text-[#E8A800]">
                          {seasonsParticipated}
                        </div>
                      </div>
                      <div className="rounded-lg sm:rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/20 p-2 sm:p-3">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <ArrowRightIcon />
                          <div className="text-xs text-gray-400">Transfers</div>
                        </div>
                        <div className="text-lg sm:text-2xl font-black text-[#FFB347]">
                          {totalTransfers}
                        </div>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Link
                      href={`/super-admin/teams/${team.id}`}
                      className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 group-hover:border-[#E8A800]/30 transition-all"
                    >
                      <span className="text-xs sm:text-sm font-bold text-white">View Details</span>
                      <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRightIcon />
                      </div>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
