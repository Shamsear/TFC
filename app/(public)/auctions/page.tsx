import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import AuctionsView from '@/components/auctions/AuctionsView'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getAuctionsData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { auctions: [], auctionResults: [], seasonName: null }
    }

    // Get all auctions
    const auctions = await prisma.auction_calendar.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { auctionDate: 'desc' },
      include: {
        auctionSlots: {
          orderBy: { slotOrder: 'asc' }
        }
      }
    })

    // Get all auction results (transfer history) with seasonal player stats
    const auctionResults = await prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { createdAt: 'desc' },
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {
              where: { seasonId: activeSeason.id }
            }
          }
        },
        team: true
      }
    })

    // Transform the data to match the expected interface
    const transformedAuctionResults = auctionResults.map(result => ({
      id: result.id,
      soldPrice: result.soldPrice,
      createdAt: result.createdAt,
      basePlayer: {
        id: result.basePlayer.id,
        playerId: result.basePlayer.id, // Using base player id as playerId
        name: result.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${result.basePlayer.player_id || result.basePlayer.id}.webp`),
        position: result.basePlayer.seasonalPlayerStats[0]?.position || 'Unknown',
        overall: result.basePlayer.seasonalPlayerStats[0]?.overallRating || 0,
        nationality: result.basePlayer.seasonalPlayerStats[0]?.nationality || 'Unknown'
      },
      team: {
        id: result.team.id,
        name: result.team.name,
        logoUrl: result.team.logoUrl
      }
    }))

    return {
      auctions,
      auctionResults: transformedAuctionResults,
      seasonName: activeSeason.name
    }
  } catch (error) {
    console.error('Error fetching auctions data:', error)
    return { auctions: [], auctionResults: [], seasonName: null }
  }
}

export default async function AuctionsPage({
  searchParams
}: {
  searchParams: Promise<{ auctionId?: string; position?: string; from?: string }>
}) {
  const { auctionId, position, from } = await searchParams
  const data = await getAuctionsData()

  // Determine back link based on where user came from
  const backLink = from === 'calendar' ? '/calendar' : '/'
  const backLabel = from === 'calendar' ? 'Back to Calendar' : 'Back to Home'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AuctionsView
            auctions={data.auctions}
            auctionResults={data.auctionResults}
            seasonName={data.seasonName}
            initialAuctionId={auctionId}
            initialPosition={position}
            backLink={backLink}
            backLabel={backLabel}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
