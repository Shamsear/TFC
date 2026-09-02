import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import BanTeamClient from '@/components/admin/BanTeamClient'

interface BanTeamPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function BanTeamPage({ params }: BanTeamPageProps) {
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

  const seasons = await prisma.seasons.findMany({
    select: { id: true, name: true, seasonNumber: true },
    orderBy: { seasonNumber: 'desc' }
  })

  return <BanTeamClient initialSeasonId={seasonId} seasons={seasons} />
}
