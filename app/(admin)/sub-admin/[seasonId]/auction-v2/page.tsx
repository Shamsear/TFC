import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import RoundsListClient from '@/components/auction-v2/RoundsListClient'

interface AuctionV2PageProps {
  params: Promise<{ seasonId: string }>
}

export default async function AuctionV2Page({ params }: AuctionV2PageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Fetch season
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      name: true,
      seasonNumber: true,
      isActive: true
    }
  })

  if (!season) {
    notFound()
  }

  // Fetch rounds for this season
  const rounds = await prisma.rounds.findMany({
    where: { seasonId },
    include: {
      _count: {
        select: {
          teamRoundBids: true,
          tiebreakers: true
        }
      }
    },
    orderBy: [
      { roundNumber: 'asc' }
    ]
  })

  // Calculate stats
  const totalRounds = rounds.length
  const activeRounds = rounds.filter(r => r.status === 'active').length
  const completedRounds = rounds.filter(r => r.status === 'completed').length
  const draftRounds = rounds.filter(r => r.status === 'draft').length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Auction Rounds
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                {season.name} — Manage auction rounds and bidding
              </p>
            </div>
            <Link
              href={`/sub-admin/${seasonId}/auction-v2/create`}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Round
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Rounds</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{totalRounds}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Active</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{activeRounds}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Completed</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-400">{completedRounds}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Draft</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">{draftRounds}</div>
          </div>
        </div>

        {/* Rounds List */}
        {rounds.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-2">No auction rounds yet</div>
            <p className="text-sm sm:text-base text-[#D4CCBB] mb-6">
              Create your first auction round to start the bidding process
            </p>
            <Link
              href={`/sub-admin/${seasonId}/auction-v2/create`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Round
            </Link>
          </div>
        ) : (
          <RoundsListClient
            seasonId={seasonId}
            initialRounds={rounds}
          />
        )}
      </div>
    </div>
  )
}
