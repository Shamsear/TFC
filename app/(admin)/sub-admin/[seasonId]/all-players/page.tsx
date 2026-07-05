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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          All Players
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} — Complete player database with team assignments
        </p>
      </div>

      {/* Stats Summary — static, no filter dependency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 shadow-md transition-all hover:border-[#E8A800]/25">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Total Players</div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono">{totalCount}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 shadow-md transition-all hover:border-emerald-500/25">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Sold Players</div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">{soldCount}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 sm:col-span-2 lg:col-span-1 shadow-md transition-all hover:border-[#FFB347]/25">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">Available Players</div>
          <div className="text-3xl sm:text-4xl font-black text-[#FFB347] font-mono">{totalCount - soldCount}</div>
        </div>
      </div>

      {/* Players List — client-side search & filter via API */}
      <AllPlayersClient
        seasonId={seasonId}
        positions={positions}
        teams={teams}
      />
    </div>
  )
}
