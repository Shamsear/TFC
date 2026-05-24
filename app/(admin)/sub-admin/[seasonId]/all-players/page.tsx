import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import AllPlayersClient from '@/components/players/AllPlayersClient'

interface AllPlayersPageProps {
  params: Promise<{ seasonId: string }>
}

export default async function AllPlayersPage({ params }: AllPlayersPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({ where: { id: seasonId } })
  if (!season) notFound()

  // Fetch static metadata in parallel — positions, teams, and stat counts
  // These don't change on every search so we keep them server-side
  const [soldCount, totalCount, allPositions, allTeams] = await Promise.all([
    prisma.transfer_history.count({ where: { seasonId, status: 'ACTIVE' } }),
    prisma.base_players.count(),
    prisma.seasonal_player_stats.findMany({
      where: { seasonId },
      select: { position: true },
      distinct: ['position']
    }),
    prisma.teams.findMany({
      where: { transferHistory: { some: { seasonId } } },
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              All Players
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            {season.name} — Complete player database with team assignments
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Summary — static, no filter dependency */}
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

        {/* Players List — client-side search & filter via API */}
        <AllPlayersClient
          seasonId={seasonId}
          positions={positions}
          teams={teams}
        />
      </div>
    </div>
  )
}
