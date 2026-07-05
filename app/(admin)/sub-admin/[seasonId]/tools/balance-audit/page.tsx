import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import BalanceAuditClient from '@/components/admin/BalanceAuditClient'

interface BalanceAuditPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function BalanceAuditPage({ params }: BalanceAuditPageProps) {
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

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Balance Audit
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} - Check and fix team balance discrepancies
        </p>
      </div>

      <BalanceAuditClient seasonId={seasonId} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
