import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import TransferWindowsDashboard from '@/components/admin/TransferWindowsDashboard'
import { checkAdminRole } from '@/lib/auth-utils'

interface TransferWindowsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function TransferWindowsPage({ params }: TransferWindowsPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const isAdmin = await checkAdminRole(session.user.id)
  if (!isAdmin) {
    redirect('/')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  })

  if (!season) {
    notFound()
  }

  return (
    <TransferWindowsDashboard 
      seasonId={seasonId}
      seasonName={season.name}
    />
  )
}
