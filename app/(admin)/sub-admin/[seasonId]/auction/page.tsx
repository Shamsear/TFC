import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import AuctionPageWrapper from '@/components/auction/AuctionPageWrapper'

interface AuctionV2PageProps {
  params: Promise<{ seasonId: string }>
}

export default async function AuctionV2Page({ params }: AuctionV2PageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Fetch season, rounds, and active bulk tiebreakers in parallel
  const [season, rounds, activeTiebreakers] = await Promise.all([
    prisma.seasons.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        seasonNumber: true,
        isActive: true
      }
    }),
    prisma.rounds.findMany({
      where: { seasonId },
      select: {
        id: true,
        roundNumber: true,
        position: true,
        position_group: true,
        roundType: true,
        status: true,
        startTime: true,
        endTime: true,
        maxBidsPerTeam: true,
        basePrice: true,
        _count: {
          select: {
            teamRoundBids: true,
            tiebreakers: true
          }
        }
      },
      orderBy: [
        { roundNumber: 'asc' }
      ]
    }),
    prisma.bulk_tiebreakers.findMany({
      where: {
        round: {
          seasonId
        },
        status: 'pending'
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        round: {
          select: {
            roundNumber: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
  ])

  if (!season) {
    notFound()
  }

  // Calculate stats
  const stats = {
    totalRounds: rounds.length,
    activeRounds: rounds.filter(r => r.status === 'active').length,
    completedRounds: rounds.filter(r => r.status === 'completed').length,
    draftRounds: rounds.filter(r => r.status === 'draft').length
  }

  return (
    <AuctionPageWrapper
      seasonId={seasonId}
      season={season}
      rounds={rounds}
      activeTiebreakers={activeTiebreakers}
      stats={stats}
    />
  )
}
