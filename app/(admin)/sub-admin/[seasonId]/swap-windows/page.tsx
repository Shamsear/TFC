import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import SwapWindowsClient from '@/components/admin/SwapWindowsClient'
import { checkAdminRole } from '@/lib/auth-utils'

interface SwapWindowsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function SwapWindowsPage({ params }: SwapWindowsPageProps) {
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <SwapWindowsClient 
        seasonId={seasonId}
        seasonName={season.name}
      />
    </div>
  )
}
