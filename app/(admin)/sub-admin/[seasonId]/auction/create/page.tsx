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

  // Run queries in parallel for better performance
  const [season, auctionCalendar, seasonalStats, seasonTeams, latestRound] = await Promise.all([
    // Fetch season
    prisma.seasons.findUnique({
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
    }),
    
    // Fetch auction calendar with slots
    prisma.auction_calendar.findMany({
      where: { seasonId },
      include: {
        auctionSlots: {
          select: {
            id: true,
            position: true,
            position_group: true,
            slotOrder: true,
            roundType: true
          },
          orderBy: { slotOrder: 'asc' }
        }
      },
      orderBy: { auctionDate: 'asc' }
    }),
    
    // Fetch seasonal player stats (limit to top 1000 by rating for performance)
    prisma.seasonal_player_stats.findMany({
      where: { seasonId },
      select: {
        basePlayerId: true,
        position: true,
        position_group: true,
        overallRating: true,
        nationality: true,
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        overallRating: 'desc'
      },
      take: 1000
    }),
    
    // Fetch teams in this season
    prisma.season_teams.findMany({
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
    }),
    
    // Fetch the latest round number for this season
    prisma.rounds.findFirst({
      where: { seasonId },
      orderBy: { roundNumber: 'desc' },
      select: { roundNumber: true }
    })
  ])

  if (!season) {
    notFound()
  }

  // Get sold player IDs in a separate query
  const soldPlayerIds = await prisma.transfer_history.findMany({
    where: { seasonId },
    select: { basePlayerId: true }
  }).then(results => new Set(results.map(r => r.basePlayerId)))

  // Filter out sold players
  const transformedPlayers = seasonalStats
    .filter(stat => !soldPlayerIds.has(stat.basePlayerId))
    .map(stat => ({
      id: stat.basePlayer.id,
      name: stat.basePlayer.name,
      position: stat.position,
      position_group: stat.position_group,
      overall: stat.overallRating,
      nationality: stat.nationality || 'Unknown',
      imageUrl: stat.basePlayer.photoUrl
    }))

  // Calculate next round number (latest + 1, or 1 if no rounds exist)
  const nextRoundNumber = latestRound ? latestRound.roundNumber + 1 : 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Create Auction Round
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} — Set up a new bidding round from auction calendar
        </p>
      </div>

      <CreateRoundClient
        seasonId={seasonId}
        availablePlayers={transformedPlayers}
        teams={seasonTeams.map(st => st.team)}
        auctionCalendar={auctionCalendar}
        nextRoundNumber={nextRoundNumber}
        seasonDefaults={{
          maxBidsPerTeam: season.defaultMaxBidsPerTeam || seasonTeams.length,
          basePrice: season.defaultBasePrice || 100000
        }}
      />
    </div>
  )
}
