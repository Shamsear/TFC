import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import MissedBidsClient from '@/components/admin/MissedBidsClient'

interface MissedBidsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function MissedBidsPage({ params }: MissedBidsPageProps) {
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

  return <MissedBidsClient initialSeasonId={seasonId} />
}
