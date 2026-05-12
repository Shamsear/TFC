import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function getAuctionResults() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { results: [], seasonName: null, stats: { totalPlayers: 0, totalSpent: 0, avgPrice: 0 } }
    }

    // Get all auction results (transfer history)
    const results = await prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {
              where: { seasonId: activeSeason.id }
            }
          }
        },
        team: true,
        round: {
          select: {
            roundNumber: true,
            roundType: true,
            position: true
          }
        }
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
      nationality: result.basePlayer.seasonalPlayerStats[0]?.nationality || 'Unknown',
      teamName: result.team.name,
      teamLogo: result.team.logoUrl,
      roundNumber: result.round?.roundNumber,
      roundType: result.round?.roundType,
      createdAt: result.createdAt
    }))

    // Calculate stats
    const totalSpent = results.reduce((sum, r) => sum + r.soldPrice, 0)
    const avgPrice = results.length > 0 ? Math.round(totalSpent / results.length) : 0

    return {
      results: transformedResults,
      seasonName: activeSeason.name,
      stats: {
        totalPlayers: results.length,
        totalSpent,
        avgPrice
      }
    }
  } catch (error) {
    console.error('Error fetching auction results:', error)
    return { results: [], seasonName: null, stats: { totalPlayers: 0, totalSpent: 0, avgPrice: 0 } }
  }
}

export default async function AuctionResultsPage() {
  const data = await getAuctionResults()

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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Auction Results
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              {data.seasonName ? `${data.seasonName} — All players sold in auctions` : 'Browse all auction results'}
            </p>
          </div>

          {/* Stats */}
          {data.stats.totalPlayers > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Players Sold</div>
                <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.totalPlayers}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Total Spent</div>
                <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">
                  £{(data.stats.totalSpent / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Avg Price</div>
                <div className="text-2xl sm:text-3xl font-black text-[#FFB347]">
                  £{(data.stats.avgPrice / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {data.results.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">No Results Yet</h3>
              <p className="text-gray-400">Auction results will appear here once players are sold</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/50 transition-all"
                >
                  {/* Player Info */}
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
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-white/10">{result.position}</span>
                        <span>OVR {result.overall}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{result.nationality}</div>
                    </div>
                  </div>

                  {/* Round Info */}
                  {result.roundNumber && (
                    <div className="mb-3 text-xs text-gray-400">
                      Round {result.roundNumber} • {result.roundType === 'normal' ? 'Normal' : 'Bulk'}
                    </div>
                  )}

                  {/* Team & Price */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {result.teamLogo && (
                        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                          <img src={result.teamLogo} alt={result.teamName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-sm text-gray-400 truncate">{result.teamName}</span>
                    </div>
                    <span className="text-lg font-black text-[#E8A800] ml-2">
                      £{result.soldPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
