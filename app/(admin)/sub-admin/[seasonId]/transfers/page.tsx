import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import TransfersClient from '@/components/admin/TransfersClient'

interface TransfersPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function TransfersPage({ params }: TransfersPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  })

  if (!season) {
    notFound()
  }

  // Get all transfers for this season with round information
  const transfers = await prisma.transfer_history.findMany({
    where: { seasonId },
    include: {
      basePlayer: {
        select: {
          id: true,
          player_id: true,
          name: true,
          seasonalPlayerStats: {
            where: { seasonId },
            select: {
              position: true,
              position_group: true,
              overallRating: true,
              realWorldClub: true
            }
          }
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          managerName: true
        }
      },
      round: {
        select: {
          id: true,
          roundNumber: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <TransfersClient 
        transfers={transfers} 
        seasonId={seasonId}
        seasonName={season.name}
      />
    </div>
  )
}
