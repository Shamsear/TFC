import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import PlayerManagementClient from '@/components/admin/PlayerManagementClient'

interface PlayerManagementPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function PlayerManagementPage({ params }: PlayerManagementPageProps) {
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

  // Get all teams in the season
  const teams = await prisma.season_teams.findMany({
    where: { seasonId },
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
      team: {
        name: 'asc'
      }
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Player Management
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} - Transfer or release players
        </p>
      </div>

      <PlayerManagementClient seasonId={seasonId} teams={teams} />
    </div>
  )
}
