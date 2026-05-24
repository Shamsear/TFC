import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SwapRequestsAdminClient from '@/components/admin/SwapRequestsAdminClient'

export const metadata = {
  title: 'Swap Requests | Admin Tools',
  description: 'Manage player swap requests',
}

export default async function SwapRequestsAdminPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Get season
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
  })

  if (!season) {
    redirect('/sub-admin')
  }

  // Get all swap requests for this season
  const requests = await prisma.swap_requests.findMany({
    where: {
      seasonId,
    },
    include: {
      requestingTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      targetTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      players: {
        include: {
          basePlayer: {
            select: {
              id: true,
              name: true,
              player_id: true,
            },
          },
          fromTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          toTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      processor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // pending first
      { submittedAt: 'desc' },
    ],
  })

  // Transform for client
  const transformedRequests = requests.map(req => ({
    id: req.id,
    requestingTeamId: req.requestingTeamId,
    requestingTeamName: req.requestingTeam.name,
    requestingTeamLogo: req.requestingTeam.logoUrl,
    targetTeamId: req.targetTeamId,
    targetTeamName: req.targetTeam.name,
    targetTeamLogo: req.targetTeam.logoUrl,
    status: req.status,
    submittedAt: req.submittedAt.toISOString(),
    processedAt: req.processedAt?.toISOString() || null,
    processedBy: req.processor?.name || null,
    rejectionReason: req.rejectionReason,
    players: req.players.map(p => ({
      id: p.id,
      playerId: p.playerId,
      playerName: p.playerName,
      playerPhotoId: p.basePlayer.player_id || p.basePlayer.id,
      fromTeamId: p.fromTeamId,
      fromTeamName: p.fromTeam.name,
      toTeamId: p.toTeamId,
      toTeamName: p.toTeam.name,
      playerValue: p.playerValue,
    })),
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SwapRequestsAdminClient
          seasonId={seasonId}
          seasonName={season.name}
          swapWindowOpen={season.swapWindowOpen}
          requests={transformedRequests}
        />
      </div>
    </div>
  )
}
