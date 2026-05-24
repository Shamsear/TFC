import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'

export const dynamic = 'force-dynamic'

interface BulkTiebreakersListPageProps {
  params: Promise<{ seasonId: string }>
}

export default async function BulkTiebreakersListPage({ params }: BulkTiebreakersListPageProps) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Verify season exists
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true }
  })

  if (!season) {
    notFound()
  }

  // Fetch all bulk tiebreakers for this season
  const tiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      round: {
        seasonId: seasonId
      }
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
          id: true,
          roundNumber: true,
          position: true
        }
      },
      participants: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        }
      }
    },
    orderBy: [
      { status: 'asc' }, // pending, active, completed
      { round: { roundNumber: 'desc' } },
      { id: 'desc' }
    ]
  })

  const pendingTiebreakers = tiebreakers.filter(t => t.status === 'pending')
  const activeTiebreakers = tiebreakers.filter(t => t.status === 'active')
  const completedTiebreakers = tiebreakers.filter(t => t.status === 'completed')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/sub-admin/${seasonId}/auction`}
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">Bulk Tiebreakers</h1>
              <p className="text-sm text-[#D4CCBB]">{season.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-[#7A7367] mb-1">Total</div>
                <div className="text-2xl font-bold text-white">{tiebreakers.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Active Tiebreakers */}
        {activeTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              Active Tiebreakers ({activeTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTiebreakers.map((tiebreaker) => (
                <Link
                  key={tiebreaker.id}
                  href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                  className="block rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                        alt={tiebreaker.basePlayer.name}
                        width={64}
                        height={64}
                        unoptimized={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white mb-1">{tiebreaker.basePlayer.name}</div>
                      <div className="text-xs text-[#7A7367]">
                        Round {tiebreaker.round.roundNumber}
                        {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-[#7A7367] mb-1">Base Price</div>
                      <div className="text-sm font-bold text-white">£{tiebreaker.basePrice.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-[#7A7367] mb-1">Highest Bid</div>
                      <div className="text-sm font-bold text-[#E8A800]">
                        £{(tiebreaker.currentHighestBid || tiebreaker.basePrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7A7367]">{tiebreaker.teamsRemaining} teams remaining</span>
                    <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 font-medium">LIVE</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tiebreakers */}
        {pendingTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              Pending Tiebreakers ({pendingTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingTiebreakers.map((tiebreaker) => (
                <Link
                  key={tiebreaker.id}
                  href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                  className="block rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      <Image
                        src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                        alt={tiebreaker.basePlayer.name}
                        width={64}
                        height={64}
                        unoptimized={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white mb-1">{tiebreaker.basePlayer.name}</div>
                      <div className="text-xs text-[#7A7367]">
                        Round {tiebreaker.round.roundNumber}
                        {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-[#7A7367] mb-1">Base Price</div>
                      <div className="text-sm font-bold text-white">£{tiebreaker.basePrice.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-[#7A7367] mb-1">Teams</div>
                      <div className="text-sm font-bold text-white">{tiebreaker.participants.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7A7367]">Not started</span>
                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-medium">PENDING</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tiebreakers */}
        {completedTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Completed Tiebreakers ({completedTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTiebreakers.map((tiebreaker) => {
                const winner = tiebreaker.participants.find(p => p.teamId === tiebreaker.currentHighestTeamId)
                return (
                  <Link
                    key={tiebreaker.id}
                    href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                    className="block rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                        <Image
                          src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                          alt={tiebreaker.basePlayer.name}
                          width={64}
                          height={64}
                          unoptimized={true}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white mb-1">{tiebreaker.basePlayer.name}</div>
                        <div className="text-xs text-[#7A7367]">
                          Round {tiebreaker.round.roundNumber}
                          {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                        </div>
                      </div>
                    </div>
                    {winner && (
                      <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-emerald-400 mb-1">Winner</div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded overflow-hidden">
                            <Image
                              src={winner.team.logoUrl}
                              alt={winner.team.name}
                              width={24}
                              height={24}
                              unoptimized={true}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-sm font-bold text-white">{winner.team.name}</div>
                        </div>
                        <div className="text-xs text-[#E8A800] mt-1">
                          £{tiebreaker.currentHighestBid?.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7A7367]">Resolved</span>
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-medium">COMPLETED</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tiebreakers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Bulk Tiebreakers</h3>
            <p className="text-sm text-[#7A7367]">
              There are no bulk tiebreakers for this season yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
