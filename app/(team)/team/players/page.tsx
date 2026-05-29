import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import AllPlayersClient from '@/components/players/AllPlayersClient'

export const metadata = {
  title: "Players | Team Dashboard",
  description: "Browse and search all players in the league",
}

export default async function TeamPlayersPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="pt-24 pb-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">No Active Season</h2>
              <p className="text-gray-400 text-sm sm:text-base">There is no active season at the moment.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Fetch static metadata - positions and teams
  const [soldCount, totalCount, allPositions, allTeams] = await Promise.all([
    prisma.transfer_history.count({ where: { seasonId: activeSeason.id, status: 'ACTIVE' } }),
    prisma.seasonal_player_stats.count({ where: { seasonId: activeSeason.id } }),
    prisma.seasonal_player_stats.findMany({
      where: { seasonId: activeSeason.id },
      select: { position: true },
      distinct: ['position']
    }),
    prisma.teams.findMany({
      where: { transferHistory: { some: { seasonId: activeSeason.id } } },
      select: { name: true },
      orderBy: { name: 'asc' }
    })
  ])

  const positions = ['ALL', ...allPositions
    .map((p: { position: string | null }) => p.position)
    .filter(Boolean)
    .sort()] as string[]

  const teams = ['ALL', ...allTeams.map((t: { name: string }) => t.name), 'Free Agent']

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <main className="relative z-10 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                Player Search
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 font-medium">
              Browse all players in <span className="text-[#E8A800]">{activeSeason.name}</span>
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.02] rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Total Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-cyan-400">{totalCount}</div>
            </div>
            <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Sold Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{soldCount}</div>
            </div>
            <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/[0.02] rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Available Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#E8A800]">{totalCount - soldCount}</div>
            </div>
          </div>

          {/* Players List - API-based filtering */}
          <AllPlayersClient
            seasonId={activeSeason.id}
            positions={positions}
            teams={teams}
            enableStarring={true}
            basePath="/team/players"
          />
        </div>
      </main>
    </div>
  )
}
