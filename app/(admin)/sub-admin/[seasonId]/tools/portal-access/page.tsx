import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import MaintenanceToggle from '@/components/admin/MaintenanceToggle'
import { isMaintenanceModeActive } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

interface PortalAccessPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function PortalAccessPage({ params }: PortalAccessPageProps) {
  const session = await auth()

  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  })

  if (!season) {
    notFound()
  }

  const isMaintenance = await isMaintenanceModeActive()

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
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Portal Access Control
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} • Control Public & Team Portal Visibility
        </p>
      </div>

      {/* Interactive Toggle Card */}
      <div className="mb-8">
        <MaintenanceToggle initialMaintenance={isMaintenance} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base">When Locked (Opening Shortly)</h3>
          </div>
          <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
            <li>Public visitors are redirected to <code className="text-[#E8A800]">/maintenance</code> with an "Opening Shortly" screen.</li>
            <li>Team managers attempting to access <code className="text-[#E8A800]">/team/*</code> are also redirected to <code className="text-[#E8A800]">/maintenance</code>.</li>
            <li>Admins (Super Admin & Sub Admin) retain full access to manage auctions, squads, and seasons.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base">When Live (Unlocked)</h3>
          </div>
          <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
            <li>All public pages (homepage, players, matches, auctions, rankings) are visible to everyone.</li>
            <li>Team managers can log in and manage their bids and squads in <code className="text-[#E8A800]">/team</code>.</li>
            <li>Everything functions normally.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
