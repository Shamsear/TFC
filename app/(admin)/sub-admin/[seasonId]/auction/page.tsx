import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import RoundsListClient from '@/components/auction/RoundsListClient'

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
    select: {
      id: true,
      roundNumber: true,
      position: true,
      position_group: true,
      roundType: true,
      status: true,
      startTime: true,
      endTime: true,
      maxBidsPerTeam: true,
      basePrice: true,
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

  // Fetch active bulk tiebreakers
  const activeTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      round: {
        seasonId
      },
      status: 'pending'
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true
        }
      },
      round: {
        select: {
          roundNumber: true
        }
      },
      _count: {
        select: {
          participants: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
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
              href={`/sub-admin/${seasonId}/auction/create`}
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
        {/* Active Tiebreakers Alert */}
        {activeTiebreakers.length > 0 && (
          <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-2 border-purple-500/30 p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-black text-purple-300 mb-2">
                  🔴 Active Tiebreakers ({activeTiebreakers.length})
                </h3>
                <p className="text-sm sm:text-base text-[#D4CCBB] mb-4">
                  Teams are currently bidding in live tiebreakers. Click to monitor in real-time.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeTiebreakers.map((tb) => (
                    <Link
                      key={tb.id}
                      href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tb.id}`}
                      className="block p-4 rounded-lg bg-black/30 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                          <img
                            src={tb.basePlayer.photoUrl}
                            alt={tb.basePlayer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-sm truncate">
                            {tb.basePlayer.name}
                          </div>
                          <div className="text-xs text-[#7A7367]">
                            Round {tb.round.roundNumber}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-400">
                          {tb._count.participants} teams
                        </span>
                        <span className="text-[#E8A800] font-medium">
                          £{(tb.currentHighestBid || tb.basePrice).toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
              href={`/sub-admin/${seasonId}/auction/create`}
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
