import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import AllPlayersClient from '@/components/players/AllPlayersClient'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface AllPlayersPageProps {
  params: Promise<{
    seasonId: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export default async function AllPlayersPage({ params, searchParams }: AllPlayersPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params
  const { page: pageParam } = await searchParams

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  })

  if (!season) {
    notFound()
  }

  // Pagination setup
  const ITEMS_PER_PAGE = 24
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10))
  const skip = (currentPage - 1) * ITEMS_PER_PAGE

  // Get total count for pagination
  const totalPlayers = await prisma.base_players.count()

  // Get paginated base players with their seasonal stats and transfer history
  const allPlayers = await prisma.base_players.findMany({
    include: {
      seasonalPlayerStats: {
        where: { seasonId }
      },
      transferHistory: {
        where: { seasonId },
        include: {
          team: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    },
    skip,
    take: ITEMS_PER_PAGE
  })

  // Transform data for client component
  const playersData = allPlayers.map(player => {
    const stats = player.seasonalPlayerStats[0]
    const transfer = player.transferHistory[0]

    return {
      id: player.id,
      name: player.name,
      photoUrl: getPlayerPhotoUrl(`${player.player_id || player.id}.webp`),
      position: stats?.position || 'N/A',
      realWorldClub: stats?.realWorldClub || 'N/A',
      overallRating: stats?.overallRating || 0,
      team: transfer ? {
        id: transfer.team.id,
        name: transfer.team.name,
        logoUrl: transfer.team.logoUrl
      } : null,
      soldPrice: transfer?.soldPrice || null,
      status: (transfer ? 'SOLD' : 'AVAILABLE') as 'SOLD' | 'AVAILABLE'
    }
  })

  // Get stats for all players (not just current page)
  const allPlayersForStats = await prisma.base_players.findMany({
    include: {
      transferHistory: {
        where: { seasonId }
      }
    }
  })

  const soldPlayers = allPlayersForStats.filter(p => p.transferHistory.length > 0).length
  const availablePlayers = allPlayersForStats.filter(p => p.transferHistory.length === 0).length
  const totalPages = Math.ceil(totalPlayers / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                All Players
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {season.name} - Complete player database with team assignments
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{totalPlayers}</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Sold Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{soldPlayers}</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Available Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">{availablePlayers}</div>
          </div>
        </div>

        {/* Players List */}
        <AllPlayersClient 
          players={playersData} 
          seasonId={seasonId}
          currentPage={currentPage}
          totalPages={totalPages}
          totalPlayers={totalPlayers}
        />
      </div>
    </div>
  )
}
