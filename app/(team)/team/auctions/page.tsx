import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import AuctionsView from '@/components/auctions/AuctionsView'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

export const metadata = {
  title: "Auctions | Team Dashboard",
  description: "View auction calendar and results",
}

async function getAuctionsData(seasonId: string) {
  try {
    // Get all auctions
    const auctions = await prisma.auction_calendar.findMany({
      where: { seasonId },
      orderBy: { auctionDate: 'desc' },
      include: {
        auctionSlots: {
          orderBy: { slotOrder: 'asc' }
        }
      }
    })

    // Get all rounds for this season to map auction dates to rounds
    const rounds = await prisma.rounds.findMany({
      where: { seasonId },
      select: {
        id: true,
        startTime: true,
        position: true,
        position_group: true
      }
    })

    // Get all auction results (transfer history) with seasonal player stats
    const auctionResults = await prisma.transfer_history.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {
              where: { seasonId }
            }
          }
        },
        team: true,
        round: {
          select: {
            id: true,
            startTime: true,
            position: true,
            position_group: true
          }
        }
      }
    })

    // Transform the data to match the expected interface
    const transformedAuctionResults = auctionResults.map(result => ({
      id: result.id,
      soldPrice: result.soldPrice,
      createdAt: result.createdAt,
      roundId: result.roundId,
      roundStartTime: result.round?.startTime,
      roundPosition: result.round?.position,
      roundPositionGroup: result.round?.position_group,
      basePlayer: {
        id: result.basePlayer.id,
        playerId: result.basePlayer.id,
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
      rounds
    }
  } catch (error) {
    console.error('Error fetching auctions data:', error)
    return { auctions: [], auctionResults: [], rounds: [] }
  }
}

export default async function TeamAuctionsPage({
  searchParams
}: {
  searchParams: Promise<{ auctionId?: string; position?: string; from?: string }>
}) {
  const session = await auth()
  const { auctionId, position, from } = await searchParams

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Active Season</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">There is no active season at the moment.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const data = await getAuctionsData(activeSeason.id)

  // Determine back link based on where user came from
  const backLink = from === 'calendar' ? '/team/calendar' : '/team'
  const backLabel = from === 'calendar' ? 'Back to Calendar' : 'Back to Dashboard'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AuctionsView
            auctions={data.auctions}
            auctionResults={data.auctionResults}
            seasonName={activeSeason.name}
            initialAuctionId={auctionId}
            initialPosition={position}
            backLink={backLink}
            backLabel={backLabel}
            basePath="/team/auctions"
            fromParam={from}
          />
        </div>
      </main>
    </div>
  )
}
