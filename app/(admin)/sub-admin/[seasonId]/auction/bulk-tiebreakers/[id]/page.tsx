import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import BulkTiebreakerMonitorClient from '@/components/auction/BulkTiebreakerMonitorClient'

export const dynamic = 'force-dynamic';

interface BulkTiebreakerMonitorPageProps {
  params: Promise<{ seasonId: string; id: string }>
}

export default async function BulkTiebreakerMonitorPage({ params }: BulkTiebreakerMonitorPageProps) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/auth/signin')
  }

  const { seasonId, id } = await params
  const tiebreakerId = parseInt(id)

  if (isNaN(tiebreakerId)) {
    notFound()
  }

  // Fetch bulk tiebreaker details (sealed bid model)
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: tiebreakerId },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true
        }
      },
      round: {
        include: {
          season: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      participants: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        },
        orderBy: {
          newBidAmount: 'desc'
        }
      }
    }
  })

  if (!tiebreaker) {
    notFound()
  }

  // Verify the tiebreaker belongs to the correct season
  if (tiebreaker.round?.seasonId !== seasonId) {
    notFound()
  }

  // Fetch auction settings for max squad size
  const auctionSettings = await prisma.auction_settings.findUnique({
    where: { seasonId: seasonId },
    select: { max_squad_size: true }
  })

  // Fetch team budgets and squad sizes for participants
  const teamIds = tiebreaker.participants.map(p => p.teamId)
  
  // Fetch season_teams with budget
  const seasonTeams = await prisma.season_teams.findMany({
    where: {
      seasonId: seasonId,
      teamId: { in: teamIds }
    },
    select: {
      teamId: true,
      currentBudget: true
    }
  })

  // Get squad sizes (count of ACTIVE transfers only)
  const squadSizesData = await prisma.transfer_history.groupBy({
    by: ['teamId'],
    where: {
      seasonId: seasonId,
      teamId: { in: teamIds },
      status: 'ACTIVE'
    },
    _count: { _all: true }
  })
  
  const squadSizes = squadSizesData.map(s => ({
    teamId: s.teamId,
    squadSize: s._count._all
  }))

  // Merge budget and squad size data into participants
  const participantsWithData = tiebreaker.participants.map(p => ({
    ...p,
    submitted: p.submitted ?? false,
    team: {
      ...p.team,
      currentBudget: seasonTeams.find(st => st.teamId === p.teamId)?.currentBudget || 0,
      squadSize: squadSizes.find(ss => ss.teamId === p.teamId)?.squadSize || 0
    }
  }))

  const tiebreakerWithData = {
    ...tiebreaker,
    participants: participantsWithData,
    // Note: bidHistory removed for sealed bid model
    bidHistory: []
  }

  return (
    <BulkTiebreakerMonitorClient
      initialData={tiebreakerWithData}
      seasonId={seasonId}
      maxSquadSize={auctionSettings?.max_squad_size || 25}
    />
  )
}
