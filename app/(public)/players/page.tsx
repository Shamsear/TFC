import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import AllPlayersClient from '@/components/players/AllPlayersClient'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true }
  })

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
        <PublicHeader />
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
        <PublicFooter />
      </div>
    )
  }

  // Fetch static metadata - positions and teams
  const [soldCount, totalCount, allPositions, allTeams] = await Promise.all([
    prisma.transfer_history.count({ where: { seasonId: activeSeason.id } }),
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Player Search
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              Browse all players in {activeSeason.name}
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{totalCount}</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Sold Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{soldCount}</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Available Players</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">{totalCount - soldCount}</div>
            </div>
          </div>

          {/* Players List - API-based filtering */}
          <AllPlayersClient
            seasonId={activeSeason.id}
            positions={positions}
            teams={teams}
            basePath="/players"
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
