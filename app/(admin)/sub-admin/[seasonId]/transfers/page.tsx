import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import TransfersClient from '@/components/admin/TransfersClient'
import { resolveTeamManagerNames } from '@/lib/resolve-manager'

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

  // Resolve current managers for all teams
  const teamIds = [...new Set(transfers.map(t => t.teamId))]
  const mgrMap = await resolveTeamManagerNames(teamIds, seasonId)

  // Override team.managerName with resolved current manager
  const transfersWithManagers = transfers.map(t => ({
    ...t,
    team: {
      ...t.team,
      managerName: mgrMap.get(t.teamId) || t.team.managerName
    }
  }))

  return (
    <TransfersClient 
      transfers={transfersWithManagers} 
      seasonId={seasonId}
      seasonName={season.name}
    />
  )
}
