import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'

interface ToolsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function ToolsPage({ params }: ToolsPageProps) {
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

  const tools = [
    {
      title: 'Release Requests',
      description: 'Manage player release requests from teams',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/release-requests`,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      textColor: 'text-yellow-400'
    },
    {
      title: 'Swap Requests',
      description: 'Manage player swap requests between teams',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/swap-requests`,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      textColor: 'text-cyan-400'
    },
    {
      title: 'Player Management',
      description: 'Transfer players between teams or release players from teams',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/player-management`,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400'
    },
    {
      title: 'Balance Audit',
      description: 'Check team balances for discrepancies and fix errors',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/balance-audit`,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400'
    },
    {
      title: 'Transfer Corrections',
      description: 'Fix incorrect player allocations and swap players',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/transfer-fix`,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400'
    },
    {
      title: 'Ledger Flow Fix',
      description: 'Recalculate and fix financial ledger balance flow',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/ledger-fix`,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400'
    },
    {
      title: 'Player Replacement',
      description: 'Replace deleted/invalid players and update ledger',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/player-replacement`,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-400'
    },
    {
      title: 'Financial Ledger Management',
      description: 'View and delete financial ledger entries',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/audit-logs`,
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
      textColor: 'text-gray-400'
    },
    {
      title: 'News Manager',
      description: 'Check and manually trigger news generation for matches',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      href: `/sub-admin/${seasonId}/tools/news-manager`,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      textColor: 'text-indigo-400'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Admin Tools
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} - Player management and balance tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all p-6 group backdrop-blur-xl shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className={`w-14 h-14 rounded-xl ${tool.bgColor} border ${tool.borderColor} flex items-center justify-center ${tool.textColor} mb-4 group-hover:scale-110 transition-transform`}>
                {tool.icon}
              </div>
              <h3 className="text-xl font-black text-white mb-2 group-hover:text-[#E8A800] transition-colors uppercase tracking-tight">
                {tool.title}
              </h3>
              <p className="text-[#7A7367] text-xs font-medium mb-6 uppercase tracking-wider">{tool.description}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
              Open Tool
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
