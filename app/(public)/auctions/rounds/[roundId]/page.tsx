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
      where: { roundId: round.id, status: 'ACTIVE' },
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
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)))
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)))

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

          {/* Round Header Card */}
          <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      Round {round.roundNumber}
                    </h1>
                    {isActive && (
                      <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88] shadow-md shadow-[#00ff88]/5 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-ping"></span>
                        LIVE
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800] shadow-md shadow-[#E8A800]/5">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">{round.season.name}</p>
                </div>
                {isActive && round.endTime && (
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-mono font-black text-[#E8A800] animate-pulse">
                      {hoursRemaining > 0 && `${hoursRemaining}h `}
                      {minutesRemaining}m
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">remaining</div>
                  </div>
                )}
              </div>

              {/* Detail parameters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg sm:col-span-2 lg:col-span-1">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Position Group</div>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                    {round.position ? (
                      round.position.split(',').map((pos: string) => {
                        const trimmedPos = pos.trim().toUpperCase()
                        let colorClass = 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                        if (trimmedPos === 'GK') colorClass = 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                        else if (['CB', 'LB', 'RB'].includes(trimmedPos)) colorClass = 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                        else if (['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].includes(trimmedPos)) colorClass = 'bg-green-500/20 border-green-500/30 text-green-400'
                        else if (['SS', 'LWF', 'RWF', 'CF'].includes(trimmedPos)) colorClass = 'bg-red-500/20 border-red-500/30 text-red-400'
                        
                        return (
                          <span key={trimmedPos} className={`px-1.5 py-0.5 rounded text-[10px] font-black border font-mono ${colorClass}`}>
                            {trimmedPos}
                          </span>
                        )
                      })
                    ) : (
                      <span className="font-black text-white text-sm uppercase">ALL</span>
                    )}
                  </div>
                </div>
                <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Round Type</div>
                  <div className="font-black text-white text-sm sm:text-base uppercase">
                    {round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}
                  </div>
                </div>
                {round.roundType === 'bulk' && round.maxBidsPerTeam && (
                  <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Max Selections</div>
                    <div className="font-black text-white text-sm sm:text-base">{round.maxBidsPerTeam}</div>
                  </div>
                )}
                {round.basePrice && (
                  <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Base Price</div>
                    <div className="font-black text-[#00ff88] text-sm sm:text-base font-mono">£{round.basePrice.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results grid */}
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)] animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                {isCompleted ? 'Auction Results' : isActive ? 'Acquired Ledger' : 'Ledger'}
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-dark-100 border border-white/5 shadow-md">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 uppercase tracking-wide">No Results Yet</h3>
                <p className="text-sm text-gray-400">
                  {isActive ? 'Results will appear as the auction round progresses' : 'No players were sold in this round'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result) => (
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
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[10px] font-black uppercase text-gray-400">
                              {result.position}
                            </span>
                            <span className="px-2 py-0.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-md text-[10px] font-black text-[#E8A800]">
                              OVR {result.overall}
                            </span>
                          </div>
                        </div>
                      </div>
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
        </div>
      </main>
    </div>
  )
}
