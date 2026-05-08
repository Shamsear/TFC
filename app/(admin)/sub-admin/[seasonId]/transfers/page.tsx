import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

interface TransfersPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function TransfersPage({ params }: TransfersPageProps) {
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

  // Get all transfers for this season
  const transfers = await prisma.transfer_history.findMany({
    where: { seasonId },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: { seasonId }
          }
        }
      },
      team: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0)
  const averagePrice = transfers.length > 0 ? Math.round(totalSpent / transfers.length) : 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Transfer History
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {season.name} - Complete auction and transfer records
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Transfers</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{transfers.length}</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Spent</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">
              {formatCurrency(totalSpent)}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Average Price</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#E8A800]">
              {formatCurrency(averagePrice)}
            </div>
          </div>
        </div>

        {/* Transfer List */}
        {transfers.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mb-2">No Transfers Yet</div>
            <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
              No players have been sold in this season yet. Start an auction to see transfers here.
            </p>
            <Link
              href={`/sub-admin/${seasonId}/auction`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Auction
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  {/* Player Info */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                      <Image
                        src={transfer.basePlayer.photoUrl}
                        alt={transfer.basePlayer.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 truncate">
                        {transfer.basePlayer.name}
                      </div>
                      <div className="text-xs sm:text-sm text-[#7A7367] mb-2 truncate">
                        {transfer.basePlayer.seasonalPlayerStats[0]?.realWorldClub || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 sm:py-1 rounded-lg border text-xs font-bold ${getPositionColor(transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A')}`}>
                          {transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A'}
                        </span>
                        <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold">
                          {transfer.basePlayer.seasonalPlayerStats[0]?.overallRating || 0} OVR
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow - Hidden on mobile */}
                  <div className="hidden lg:block text-[#7A7367]">
                    <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {/* Team Info */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                      <Image
                        src={transfer.team.logoUrl}
                        alt={transfer.team.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 truncate">
                        {transfer.team.name}
                      </div>
                      <div className="text-xs sm:text-sm text-[#7A7367] truncate">
                        Manager: {transfer.team.managerName}
                      </div>
                    </div>
                  </div>

                  {/* Price & Date */}
                  <div className="flex items-center justify-between lg:flex-col lg:items-end lg:text-right gap-2">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#E8A800]">
                      {formatCurrency(transfer.soldPrice)}
                    </div>
                    <div className="text-xs text-[#7A7367] lg:whitespace-nowrap">
                      {formatDate(transfer.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
