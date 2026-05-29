'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface AuctionsViewProps {
  auctions: Array<{
    id: string
    auctionDate: Date
    description: string | null
    auctionSlots: Array<{
      position: string
      slotOrder: number
    }>
  }>
  auctionResults: Array<{
    id: string
    soldPrice: number
    createdAt: Date
    roundId: string | null
    roundStartTime: Date | null
    roundPosition: string | null
    roundPositionGroup: string | null
    basePlayer: {
      id: string
      playerId: string
      name: string
      photoUrl: string
      position: string
      overall: number
      nationality: string
    }
    team: {
      id: string
      name: string
      logoUrl: string
    }
  }>
  rounds?: Array<{
    id: string
    startTime: Date | null
    position: string | null
    position_group: string | null
  }>
  auctionToRoundsMap?: Record<string, string[]>
  seasonName: string | null
  initialAuctionId?: string
  initialPosition?: string
  backLink?: string
  backLabel?: string
  basePath?: string
  fromParam?: string
}

export default function AuctionsView({
  auctions,
  auctionResults,
  rounds = [],
  auctionToRoundsMap = {},
  seasonName,
  initialAuctionId,
  initialPosition,
  backLink = '/calendar',
  backLabel = 'Back to Calendar',
  basePath = '/auctions',
  fromParam
}: AuctionsViewProps) {
  const router = useRouter()
  const [selectedAuction, setSelectedAuction] = useState<string>(initialAuctionId || 'all')
  const [selectedPosition, setSelectedPosition] = useState<string>(initialPosition || 'all')

  useEffect(() => {
    if (initialAuctionId) {
      setSelectedAuction(initialAuctionId)
    }
    if (initialPosition) {
      setSelectedPosition(initialPosition)
    }
  }, [initialAuctionId, initialPosition])

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPositionColor = (pos: string) => {
    const p = pos.toUpperCase()
    if (p === 'GK') return 'border-[#E8A800]/30 bg-[#E8A800]/10 text-[#E8A800]'
    if (['CB', 'LB', 'RB'].includes(p)) return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
    if (['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].includes(p)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    if (['SS', 'LWF', 'RWF', 'CF'].includes(p)) return 'border-red-500/30 bg-red-500/10 text-red-400'
    return 'border-gray-500/30 bg-gray-500/10 text-gray-400'
  }

  const handleAuctionChange = (auctionId: string) => {
    const params = new URLSearchParams()
    if (auctionId !== 'all') params.set('auctionId', auctionId)
    if (selectedPosition !== 'all') params.set('position', selectedPosition)
    if (fromParam) params.set('from', fromParam)
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handlePositionChange = (position: string) => {
    const params = new URLSearchParams()
    if (selectedAuction !== 'all') params.set('auctionId', selectedAuction)
    if (position !== 'all') params.set('position', position)
    if (fromParam) params.set('from', fromParam)
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Get all unique positions from auction results
  const allPositions = Array.from(new Set(auctionResults.map(r => r.basePlayer.position)))

  // Filter results
  const filteredResults = auctionResults.filter(result => {
    // Filter by auction (using the auction-to-rounds mapping)
    if (selectedAuction !== 'all') {
      const roundIds = auctionToRoundsMap[selectedAuction] || []
      
      // If we have a mapping for this auction, use it strictly
      if (roundIds.length > 0) {
        // Check if this result's roundId is in the mapped rounds for this auction
        if (!result.roundId || !roundIds.includes(result.roundId)) {
          return false
        }
      } else {
        // No mapping exists - this means no rounds have been created/started for this auction yet
        // So there should be no results for this auction
        return false
      }
    }

    // Filter by position
    if (selectedPosition !== 'all' && result.basePlayer.position !== selectedPosition) {
      return false
    }

    return true
  })

  return (
    <div className="relative overflow-hidden space-y-6">
      {/* Back Button */}
      <Link
        href={backLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-gray-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider transform active:scale-95"
      >
        <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {backLabel}
      </Link>

      {/* Header */}
      <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/[0.02] rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-[#E8A800] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-black text-[#E8A800] uppercase tracking-widest">Auctions</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Auction Results</h1>
        <p className="text-sm font-semibold text-gray-400">Season: <span className="text-[#E8A800]">{seasonName || 'All Seasons'}</span></p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Auction Filter */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Filter by Auction Date</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAuctionChange('all')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                selectedAuction === 'all'
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-black shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                  : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              All Auctions
            </button>
            {auctions.map((auction) => (
              <button
                key={auction.id}
                onClick={() => handleAuctionChange(auction.id)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                  selectedAuction === auction.id
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-black shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {auction.description || formatDate(auction.auctionDate)}
              </button>
            ))}
          </div>
        </div>

        {/* Position Filter */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Filter by Position</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePositionChange('all')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                selectedPosition === 'all'
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-black shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                  : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              All Positions
            </button>
            {allPositions.map((position) => (
              <button
                key={position}
                onClick={() => handlePositionChange(position)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                  selectedPosition === position
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-black shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {position}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Players Sold ({filteredResults.length})
          </h2>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-16 text-gray-500 font-medium">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            No auction results found matching the filter criteria
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={`/team/players/${result.basePlayer.playerId}`}
                className="block p-4 rounded-2xl border bg-white/[0.01] border-white/5 hover:border-[#E8A800]/30 hover:bg-white/[0.03] transition-all duration-300 transform hover:scale-[1.01] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8A800]/[0.01] rounded-full blur-2xl pointer-events-none group-hover:bg-[#E8A800]/[0.02] transition-colors" />
                <div className="flex items-center gap-4 relative z-10">
                  {/* Player Photo */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white/[0.02] border border-white/10 flex-shrink-0">
                    <Image
                      src={result.basePlayer.photoUrl}
                      alt={result.basePlayer.name}
                      fill
                      unoptimized={true}
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Player Info & Details */}
                  <div className="flex-1 min-w-0">
                    {/* Player Name & Badges */}
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black tracking-wider uppercase ${getPositionColor(result.basePlayer.position)}`}>
                          {result.basePlayer.position}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.02] text-[10px] font-black text-gray-300">
                          OVR {result.basePlayer.overall}
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-white group-hover:text-[#FFB347] transition-colors mb-0.5 line-clamp-1">
                        {result.basePlayer.name}
                      </div>
                      <div className="text-xs text-gray-400 font-medium line-clamp-1">
                        {result.basePlayer.nationality}
                      </div>
                    </div>

                    {/* Team & Price - Stacked on mobile, side by side on desktop */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-t border-white/5 pt-2 mt-2">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Sold to</div>
                        <div className="text-xs sm:text-sm font-black text-white line-clamp-1">{result.team.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Price</div>
                        <div className="text-base sm:text-lg font-black text-emerald-400">
                          £{result.soldPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
