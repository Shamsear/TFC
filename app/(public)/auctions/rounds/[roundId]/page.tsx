import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RoundDetailPageProps {
  params: Promise<{ roundId: string }>
}

async function getRoundData(roundId: string) {
  try {
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      include: {
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!round) {
      return null
    }

    // Get results (transfer history) for this round
    const results = await prisma.transfer_history.findMany({
      where: { roundId: round.id },
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {
              where: { seasonId: round.seasonId }
            }
          }
        },
        team: true
      },
      orderBy: { soldPrice: 'desc' }
    })

    // Transform results
    const transformedResults = results.map(result => ({
      id: result.id,
      soldPrice: result.soldPrice,
      playerName: result.basePlayer.name,
      playerPhoto: getPlayerPhotoUrl(`${result.basePlayer.player_id || result.basePlayer.id}.webp`),
      position: result.basePlayer.seasonalPlayerStats[0]?.position || 'Unknown',
      overall: result.basePlayer.seasonalPlayerStats[0]?.overallRating || 0,
      teamName: result.team.name,
      teamLogo: result.team.logoUrl,
      createdAt: result.createdAt
    }))

    return {
      round,
      results: transformedResults
    }
  } catch (error) {
    console.error('Error fetching round data:', error)
    return null
  }
}

export default async function RoundDetailPage({ params }: RoundDetailPageProps) {
  const { roundId } = await params
  const data = await getRoundData(roundId)

  if (!data) {
    notFound()
  }

  const { round, results } = data
  const isActive = round.status === 'active'
  const isCompleted = round.status === 'completed'
  
  const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Link */}
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auctions
          </Link>

          {/* Round Header */}
          <div className="rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/30 p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl sm:text-4xl font-black text-white">
                    Round {round.roundNumber}
                  </h1>
                  {isActive && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      LIVE
                    </span>
                  )}
                  {isCompleted && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                      COMPLETED
                    </span>
                  )}
                </div>
                <p className="text-gray-400">{round.season.name}</p>
              </div>
              {isActive && round.endTime && (
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-[#FFB347]">
                    {hoursRemaining > 0 && `${hoursRemaining}h `}
                    {minutesRemaining}m
                  </div>
                  <div className="text-sm text-gray-400">remaining</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-black/30 p-4">
                <div className="text-xs text-gray-400 mb-1">Position</div>
                <div className="text-lg font-bold text-white">{round.position || 'All'}</div>
              </div>
              <div className="rounded-lg bg-black/30 p-4">
                <div className="text-xs text-gray-400 mb-1">Type</div>
                <div className="text-lg font-bold text-white">
                  {round.roundType === 'normal' ? 'Normal' : 'Bulk'}
                </div>
              </div>
              {round.roundType === 'bulk' && round.maxBidsPerTeam && (
                <div className="rounded-lg bg-black/30 p-4">
                  <div className="text-xs text-gray-400 mb-1">Max Selections</div>
                  <div className="text-lg font-bold text-white">{round.maxBidsPerTeam}</div>
                </div>
              )}
              {round.basePrice && (
                <div className="rounded-lg bg-black/30 p-4">
                  <div className="text-xs text-gray-400 mb-1">Base Price</div>
                  <div className="text-lg font-bold text-[#E8A800]">£{round.basePrice.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div>
            <h2 className="text-2xl font-black text-white mb-6">
              {isCompleted ? 'Auction Results' : isActive ? 'Current Results' : 'Results'}
            </h2>

            {results.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">No Results Yet</h3>
                <p className="text-gray-400">
                  {isActive ? 'Results will appear as the auction progresses' : 'No players were sold in this round'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/50 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        <img
                          src={result.playerPhoto}
                          alt={result.playerName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white mb-1 truncate">{result.playerName}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-white/10">{result.position}</span>
                          <span>OVR {result.overall}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        {result.teamLogo && (
                          <div className="w-6 h-6 rounded overflow-hidden">
                            <img src={result.teamLogo} alt={result.teamName} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-sm text-gray-400 truncate">{result.teamName}</span>
                      </div>
                      <span className="text-lg font-black text-[#E8A800]">
                        £{result.soldPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
