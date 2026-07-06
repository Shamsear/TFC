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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/auction`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Auction
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Bulk Tiebreakers
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            {season.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-white/[0.01] border border-white/5 shadow-md">
            <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-mono">Total</div>
            <div className="text-2xl font-black text-white font-mono">{tiebreakers.length}</div>
          </div>
        </div>
      </div>

      <div>
        {/* Active Tiebreakers */}
        {activeTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
              Active Tiebreakers ({activeTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTiebreakers.map((tiebreaker) => (
                <Link
                  key={tiebreaker.id}
                  href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                  className="block rounded-2xl bg-red-500/[0.01] border border-red-500/10 hover:border-red-500/20 hover:bg-white/[0.02] transition-all p-6 shadow-md hover:shadow-red-500/[0.02] cursor-pointer group backdrop-blur-xl"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <Image
                        src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                        alt={tiebreaker.basePlayer.name}
                        width={64}
                        height={64}
                        unoptimized={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-white mb-1 uppercase tracking-tight group-hover:text-red-400 transition-colors truncate">{tiebreaker.basePlayer.name}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                        Round {tiebreaker.round.roundNumber}
                        {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 font-mono">
                      <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Base Price</div>
                      <div className="text-sm font-extrabold text-white uppercase tracking-tight">£{tiebreaker.basePrice.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 font-mono">
                      <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Highest Bid</div>
                      <div className="text-sm font-extrabold text-[#E8A800] uppercase tracking-tight">
                        £{(tiebreaker.currentHighestBid || tiebreaker.basePrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span className="text-gray-500">{tiebreaker.teamsRemaining} teams remaining</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest font-mono bg-red-500/25 text-red-400 border border-red-500/25">LIVE</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tiebreakers */}
        {pendingTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              Pending Tiebreakers ({pendingTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingTiebreakers.map((tiebreaker) => (
                <Link
                  key={tiebreaker.id}
                  href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                  className="block rounded-2xl bg-amber-500/[0.01] border border-amber-500/10 hover:border-amber-500/20 hover:bg-white/[0.02] transition-all p-6 shadow-md hover:shadow-amber-500/[0.02] cursor-pointer group backdrop-blur-xl"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <Image
                        src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                        alt={tiebreaker.basePlayer.name}
                        width={64}
                        height={64}
                        unoptimized={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-white mb-1 uppercase tracking-tight group-hover:text-[#FFB347] transition-colors truncate">{tiebreaker.basePlayer.name}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                        Round {tiebreaker.round.roundNumber}
                        {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 font-mono">
                      <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Base Price</div>
                      <div className="text-sm font-extrabold text-white uppercase tracking-tight">£{tiebreaker.basePrice.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 font-mono">
                      <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Teams</div>
                      <div className="text-sm font-extrabold text-white uppercase tracking-tight">{tiebreaker.participants.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span className="text-gray-500">Not started</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest font-mono bg-amber-500/25 text-amber-400 border border-amber-500/25">PENDING</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tiebreakers */}
        {completedTiebreakers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Completed Tiebreakers ({completedTiebreakers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTiebreakers.map((tiebreaker) => {
                const winner = tiebreaker.participants.find(p => p.teamId === tiebreaker.currentHighestTeamId)
                return (
                  <Link
                    key={tiebreaker.id}
                    href={`/sub-admin/${seasonId}/auction/bulk-tiebreakers/${tiebreaker.id}`}
                    className="block rounded-2xl bg-emerald-500/[0.01] border border-emerald-500/10 hover:border-emerald-500/20 hover:bg-white/[0.02] transition-all p-6 shadow-md hover:shadow-emerald-500/[0.02] cursor-pointer group backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        <Image
                          src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                          alt={tiebreaker.basePlayer.name}
                          width={64}
                          height={64}
                          unoptimized={true}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-white mb-1 uppercase tracking-tight group-hover:text-emerald-400 transition-colors truncate">{tiebreaker.basePlayer.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                          Round {tiebreaker.round.roundNumber}
                          {tiebreaker.round.position && ` • ${tiebreaker.round.position}`}
                        </div>
                      </div>
                    </div>
                    {winner && (
                      <div className="mb-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-emerald-400 mb-1.5 uppercase tracking-widest font-mono font-extrabold">Winner</div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 relative">
                            <Image
                              src={winner.team.logoUrl}
                              alt={winner.team.name}
                              fill
                              unoptimized={true}
                              className="object-cover p-0.5"
                            />
                          </div>
                          <div className="text-sm font-extrabold text-white truncate uppercase tracking-tight">{winner.team.name}</div>
                        </div>
                        <div className="text-xs text-[#E8A800] mt-1.5 font-bold font-mono">
                          £{tiebreaker.currentHighestBid?.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono">
                      <span className="text-gray-500">Resolved</span>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest font-mono bg-emerald-500/25 text-emerald-400 border border-emerald-500/25">COMPLETED</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tiebreakers.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-xl shadow-md p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">No Bulk Tiebreakers</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
              There are no bulk tiebreakers for this season yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
