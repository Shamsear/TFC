import AllPlayersClient from '@/components/players/AllPlayersClient'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  // Fetch all-time stats (across all seasons)
  const [soldCount, totalCount, allPositions, allTeams] = await Promise.all([
    prisma.base_players.count({ where: { transferHistory: { some: { status: 'ACTIVE' } } } }),
    prisma.base_players.count(),
    prisma.seasonal_player_stats.findMany({
      select: { position: true },
      distinct: ['position']
    }),
    prisma.teams.findMany({
      where: { transferHistory: { some: { status: 'ACTIVE' } } },
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
              PLAYER SEARCH
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
              Browse all players across all seasons
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-md transition-all hover:border-[#E8A800]/20">
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Total Players</div>
              <div className="text-3xl sm:text-4xl font-black text-white">{totalCount}</div>
            </div>
            <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-md transition-all hover:border-emerald-500/20">
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Sold Players</div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">{soldCount}</div>
            </div>
            <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 sm:col-span-2 lg:col-span-1 shadow-md transition-all hover:border-[#FFB347]/20">
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Available Players</div>
              <div className="text-3xl sm:text-4xl font-black text-[#FFB347]">{totalCount - soldCount}</div>
            </div>
          </div>

          {/* Players List - API-based filtering */}
          <AllPlayersClient
            positions={positions}
            teams={teams}
            basePath="/players"
          />
        </div>
      </main>
    </div>
  )
}
