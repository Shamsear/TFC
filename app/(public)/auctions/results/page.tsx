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
      where: { seasonId: activeSeason.id, status: 'ACTIVE' },
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Link */}
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer mb-6"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auctions
          </Link>

          {/* Header */}
          <div className="mb-12 border-b border-white/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
                  AUCTION RESULTS
                </h1>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  {data.seasonName ? `${data.seasonName} — Ledger of all finalized acquisitions` : 'Browse all auction results'}
                </p>
              </div>

              {/* Stats */}
              {data.stats.totalPlayers > 0 && (
                <div className="flex items-center gap-6 sm:gap-8">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.totalPlayers}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Players Sold</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                      £{(data.stats.totalSpent / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Total Spent</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">
                      £{(data.stats.avgPrice / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Avg Price</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {data.results.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-dark-100 border border-white/5 shadow-md">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 uppercase tracking-wide">No Results Yet</h3>
              <p className="text-sm text-gray-400">Auction results will appear here once players are sold</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.results.map((result) => (
                <div
                  key={result.id}
                  className="group rounded-2xl bg-dark-100 border border-white/5 p-5 hover:border-[#E8A800]/30 hover:bg-dark-200 transition-all shadow-md hover:shadow-neon-glow duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Player Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 p-0.5">
                        <img
                          src={result.playerPhoto}
                          alt={result.playerName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-white text-base mb-1 truncate group-hover:text-[#E8A800] transition-colors">{result.playerName}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[10px] font-black uppercase text-gray-400">
                            {result.position}
                          </span>
                          <span className="px-2 py-0.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-md text-[10px] font-black text-[#E8A800]">
                            OVR {result.overall}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1">{result.nationality}</div>
                      </div>
                    </div>

                    {/* Round Info */}
                    {result.roundNumber && (
                      <div className="mb-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                        Round {result.roundNumber} • {result.roundType === 'normal' ? 'Normal' : 'Bulk'}
                      </div>
                    )}
                  </div>

                  {/* Team & Price */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {result.teamLogo ? (
                        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-black/40 border border-white/5 p-0.5">
                          <img src={result.teamLogo} alt={result.teamName} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded flex-shrink-0 bg-white/5 flex items-center justify-center text-[8px] font-black text-gray-500">
                          {result.teamName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-400 font-bold truncate">{result.teamName}</span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#00ff88] drop-shadow-[0_0_6px_rgba(0,255,136,0.2)] ml-2">
                      £{result.soldPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
