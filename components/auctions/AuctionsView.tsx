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
  seasonName: string | null
  initialAuctionId?: string
  initialPosition?: string
  backLink?: string
  backLabel?: string
}

export default function AuctionsView({
  auctions,
  auctionResults,
  seasonName,
  initialAuctionId,
  initialPosition,
  backLink = '/calendar',
  backLabel = 'Back to Calendar'
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price)
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
      // Defenders
      case 'CB': return 'bg-[#4A90E2]/10 border-[#4A90E2]/30 text-[#4A90E2]'
      case 'LB': return 'bg-[#5BA3F5]/10 border-[#5BA3F5]/30 text-[#5BA3F5]'
      case 'RB': return 'bg-[#5BA3F5]/10 border-[#5BA3F5]/30 text-[#5BA3F5]'
      // Midfielders
      case 'DMF': return 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#4CAF50]'
      case 'CMF': return 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
      case 'LMF': return 'bg-[#66BB6A]/10 border-[#66BB6A]/30 text-[#66BB6A]'
      case 'RMF': return 'bg-[#66BB6A]/10 border-[#66BB6A]/30 text-[#66BB6A]'
      case 'AMF': return 'bg-[#26A69A]/10 border-[#26A69A]/30 text-[#26A69A]'
      // Forwards
      case 'SS': return 'bg-[#FF9800]/10 border-[#FF9800]/30 text-[#FF9800]'
      case 'LWF': return 'bg-[#F44336]/10 border-[#F44336]/30 text-[#F44336]'
      case 'RWF': return 'bg-[#F44336]/10 border-[#F44336]/30 text-[#F44336]'
      case 'CF': return 'bg-[#E53935]/10 border-[#E53935]/30 text-[#E53935]'
      default: return 'bg-white/5 border-white/10 text-[#7A7367]'
    }
  }

  const handleAuctionChange = (auctionId: string) => {
    setSelectedAuction(auctionId)
    const params = new URLSearchParams()
    if (auctionId !== 'all') params.set('auctionId', auctionId)
    if (selectedPosition !== 'all') params.set('position', selectedPosition)
    router.push(`/auctions${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handlePositionChange = (position: string) => {
    setSelectedPosition(position)
    const params = new URLSearchParams()
    if (selectedAuction !== 'all') params.set('auctionId', selectedAuction)
    if (position !== 'all') params.set('position', position)
    router.push(`/auctions${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Get all unique positions from auction results
  const allPositions = Array.from(new Set(auctionResults.map(r => r.basePlayer.position)))

  // Filter results
  const filteredResults = auctionResults.filter(result => {
    // Filter by auction (using createdAt to match auction date)
    if (selectedAuction !== 'all') {
      const auction = auctions.find(a => a.id === selectedAuction)
      if (auction) {
        const auctionDate = new Date(auction.auctionDate)
        const resultDate = new Date(result.createdAt)
        // Check if result was created on the same day as auction
        if (auctionDate.toDateString() !== resultDate.toDateString()) {
          return false
        }
      }
    }

    // Filter by position
    if (selectedPosition !== 'all' && result.basePlayer.position !== selectedPosition) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href={backLink}
        className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {backLabel}
      </Link>

      {/* Header */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold text-[#E8A800] uppercase">Auctions</span>
        </div>
        <h1 className="text-3xl font-black text-[#F5F0E8] mb-2">Auction Results</h1>
        <p className="text-[#D4CCBB]">{seasonName || 'All Seasons'}</p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Auction Filter */}
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
          <label className="block text-sm font-bold text-[#F5F0E8] mb-3">Filter by Auction Date</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAuctionChange('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedAuction === 'all'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
              }`}
            >
              All Auctions
            </button>
            {auctions.map((auction) => (
              <button
                key={auction.id}
                onClick={() => handleAuctionChange(auction.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedAuction === auction.id
                    ? 'bg-[#E8A800] text-[#0a0a0a]'
                    : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
                }`}
              >
                {auction.description || formatDate(auction.auctionDate)}
              </button>
            ))}
          </div>
        </div>

        {/* Position Filter */}
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
          <label className="block text-sm font-bold text-[#F5F0E8] mb-3">Filter by Position</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePositionChange('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedPosition === 'all'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
              }`}
            >
              All Positions
            </button>
            {allPositions.map((position) => (
              <button
                key={position}
                onClick={() => handlePositionChange(position)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedPosition === position
                    ? 'bg-[#E8A800] text-[#0a0a0a]'
                    : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
                }`}
              >
                {position}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xl font-black text-[#F5F0E8]">
            Players Sold ({filteredResults.length})
          </h2>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-12 text-[#7A7367]">
            No auction results found
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={`/players/${result.basePlayer.playerId}`}
                className="block p-3 sm:p-4 rounded-lg border bg-[#111111] border-white/10 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Player Photo */}
                  <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    <Image
                      src={result.basePlayer.photoUrl}
                      alt={result.basePlayer.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Player Info & Details */}
                  <div className="flex-1 min-w-0">
                    {/* Player Name & Badges */}
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getPositionColor(result.basePlayer.position)}`}>
                          {result.basePlayer.position}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-white/10 text-xs font-bold text-[#F5F0E8]">
                          {result.basePlayer.overall}
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-black text-[#F5F0E8] mb-0.5 line-clamp-1">
                        {result.basePlayer.name}
                      </div>
                      <div className="text-xs text-[#D4CCBB] line-clamp-1">
                        {result.basePlayer.nationality}
                      </div>
                    </div>

                    {/* Team & Price - Stacked on mobile, side by side on desktop */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div>
                        <div className="text-xs text-[#7A7367] mb-0.5">Sold to</div>
                        <div className="text-xs sm:text-sm font-bold text-[#F5F0E8] line-clamp-1">{result.team.name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#7A7367] mb-0.5">Price</div>
                        <div className="text-base sm:text-lg font-black text-[#E8A800]">
                          ${formatPrice(result.soldPrice)}
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
