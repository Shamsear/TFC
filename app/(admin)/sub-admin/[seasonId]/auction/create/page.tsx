import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import CreateRoundClient from '@/components/auction/CreateRoundClient'

interface CreateRoundPageProps {
  params: Promise<{ seasonId: string }>
}

export default async function CreateRoundPage({ params }: CreateRoundPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Fetch season
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      name: true,
      seasonNumber: true,
      isActive: true,
      startingPurse: true,
      defaultMaxBidsPerTeam: true,
      defaultBasePrice: true
    }
  })

  if (!season) {
    notFound()
  }

  // Fetch auction calendar with slots
  const auctionCalendar = await prisma.auction_calendar.findMany({
    where: { seasonId },
    include: {
      auctionSlots: {
        orderBy: { slotOrder: 'asc' }
      }
    },
    orderBy: { auctionDate: 'asc' }
  })

  // Fetch all seasonal player stats for this season
  const seasonalStats = await prisma.seasonal_player_stats.findMany({
    where: { seasonId },
    include: {
      basePlayer: {
        include: {
          transferHistory: {
            where: { seasonId }
          }
        }
      }
    }
  })

  // Filter out players who have been sold (have transfer history in this season)
  const availablePlayers = seasonalStats
    .filter(stat => stat.basePlayer.transferHistory.length === 0)
    .map(stat => ({
      id: stat.basePlayer.id,
      name: stat.basePlayer.name,
      position: stat.position,
      overall: stat.overallRating,
      nationality: stat.nationality || 'Unknown',
      imageUrl: stat.basePlayer.photoUrl
    }))

  // Fetch teams in this season
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      }
    }
  })

  // Fetch the latest round number for this season
  const latestRound = await prisma.rounds.findFirst({
    where: { seasonId },
    orderBy: { roundNumber: 'desc' },
    select: { roundNumber: true }
  })

  // Calculate next round number (latest + 1, or 1 if no rounds exist)
  const nextRoundNumber = latestRound ? latestRound.roundNumber + 1 : 1

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Create Auction Round
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {season.name} — Set up a new bidding round from auction calendar
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <CreateRoundClient
          seasonId={seasonId}
          availablePlayers={availablePlayers}
          teams={seasonTeams.map(st => st.team)}
          auctionCalendar={auctionCalendar}
          nextRoundNumber={nextRoundNumber}
          seasonDefaults={{
            maxBidsPerTeam: season.defaultMaxBidsPerTeam || seasonTeams.length,
            basePrice: season.defaultBasePrice || 100000
          }}
        />
      </div>
    </div>
  )
}
