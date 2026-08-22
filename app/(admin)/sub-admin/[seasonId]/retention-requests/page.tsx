import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RetentionRequestsAdminClient from '@/components/admin/RetentionRequestsAdminClient'

export const metadata = {
  title: 'Retention Requests - Admin',
}

interface Props {
  params: Promise<{
    seasonId: string
  }>
}

export default async function RetentionRequestsAdminPage({ params }: Props) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/login')
  }

  const { seasonId } = await params

  // Get season info
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true },
  })

  if (!season) {
    redirect('/sub-admin')
  }

  // Get all retention requests for this season
  const requests = await prisma.retention_requests.findMany({
    where: {
      seasonId,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
          photoUrl: true,
        },
      },
      previousSeason: {
        select: {
          id: true,
          name: true,
          seasonNumber: true,
        },
      },
      retentionWindow: {
        select: {
          id: true,
          name: true,
          status: true,
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
      { submittedAt: 'desc' },
    ],
  })

  // Get active retention window
  const activeWindow = await prisma.retention_windows.findFirst({
    where: {
      seasonId,
      status: 'ACTIVE',
    },
  })

  return (
    <RetentionRequestsAdminClient
      seasonId={seasonId}
      seasonName={season.name}
      requests={requests.map((req) => ({
        id: req.id,
        playerId: req.playerId,
        playerName: req.playerName,
        oldSquadValue: req.oldSquadValue,
        notes: req.notes,
        submittedAt: req.submittedAt?.toISOString() || '',
        processedAt: req.processedAt?.toISOString() || null,
        status: (req.status || 'pending') as string,
        rejectionReason: req.rejectionReason,
        team: req.team,
        basePlayer: req.basePlayer,
        previousSeason: req.previousSeason,
        retentionWindow: req.retentionWindow,
        processor: req.processor ? { ...req.processor, name: req.processor.name || '' } : null,
        retentionWindowId: req.retentionWindowId,
      }))}
      activeWindow={
        activeWindow
          ? {
              id: activeWindow.id,
              name: activeWindow.name,
              startDate: activeWindow.startDate.toISOString(),
              endDate: activeWindow.endDate.toISOString(),
              status: activeWindow.status,
              retentionLimit: activeWindow.retentionLimit,
            }
          : null
      }
    />
  )
}
