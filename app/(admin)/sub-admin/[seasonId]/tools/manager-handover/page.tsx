import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import ManagerHandoverClient from '@/components/admin/ManagerHandoverClient'

interface PageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function ManagerHandoverPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
    redirect('/')
  }

  const { seasonId } = await params

  if (session.user.role === 'SUB_ADMIN') {
    const subAdminSeason = await prisma.sub_admin_seasons.findUnique({
      where: {
        userId_seasonId: {
          userId: session.user.id,
          seasonId,
        },
      },
    })
    if (!subAdminSeason) {
      redirect('/sub-admin')
    }
  }

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        where: { isActive: true },
        include: {
          team: { select: { id: true, name: true, logoUrl: true, managerName: true } },
          managerTenures: true,
          homeMatches: { where: { status: 'COMPLETED' }, select: { id: true } },
          awayMatches: { where: { status: 'COMPLETED' }, select: { id: true } }
        },
        orderBy: {
          team: { name: 'asc' }
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  // Fetch all managers for autocomplete list
  const allManagers = await prisma.managers.findMany({
    select: { id: true, name: true, photoUrl: true },
    orderBy: { name: 'asc' }
  })

  const formattedSeasonTeams = season.seasonTeams.map(st => ({
    id: st.id,
    teamId: st.teamId,
    teamName: st.team.name,
    teamLogo: st.team.logoUrl,
    currentManagerName: st.managerName || st.team.managerName,
    matchCount: st.homeMatches.length + st.awayMatches.length,
    hasHandover: st.managerTenures.length > 0
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/tools`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider leading-none bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
          Mid-Season Manager Handover
        </h1>
        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-2">
          {season.name} • Transfer team management and divide match stats seamlessly
        </p>
      </div>

      {/* Interactive Handover Component */}
      <ManagerHandoverClient
        seasonId={seasonId}
        seasonName={season.name}
        seasonTeams={formattedSeasonTeams}
        allManagers={allManagers}
      />
    </div>
  )
}
