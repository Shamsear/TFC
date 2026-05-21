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

  // Fetch bulk tiebreaker details
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
          currentBid: 'desc'
        }
      },
      bidHistory: {
        include: {
          team: {
            select: {
              name: true,
              logoUrl: true
            }
          }
        },
        orderBy: {
          bidTime: 'desc'
        },
        take: 50
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

  return (
    <BulkTiebreakerMonitorClient
      initialData={tiebreaker}
      seasonId={seasonId}
    />
  )
}
