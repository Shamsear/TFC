'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Transfer {
  id: string
  soldPrice: number
  createdAt: Date
  roundId: string | null
  basePlayer: {
    id: string
    player_id: string | null
    name: string
    seasonalPlayerStats: Array<{
      position: string
      position_group: string | null
      overallRating: number
      realWorldClub: string | null
    }>
  }
  team: {
    id: string
    name: string
    logoUrl: string
    managerName: string
  }
  round?: {
    id: string
    roundNumber: number
  } | null
}

interface TransfersClientProps {
  transfers: Transfer[]
  seasonId: string
  seasonName: string
}

export default function TransfersClient({ transfers, seasonId, seasonName }: TransfersClientProps) {
  const [selectedRound, setSelectedRound] = useState<string>('all')

  // Get unique rounds
  const rounds = useMemo(() => {
    const roundMap = new Map<string, { id: string; roundNumber: number }>()
    transfers.forEach(transfer => {
      if (transfer.round) {
        roundMap.set(transfer.round.id, transfer.round)
      }
    })
    return Array.from(roundMap.values()).sort((a, b) => a.roundNumber - b.roundNumber)
  }, [transfers])

  // Filter transfers by round
  const filteredTransfers = useMemo(() => {
    if (selectedRound === 'all') return transfers
    return transfers.filter(t => t.round?.id === selectedRound)
  }, [transfers, selectedRound])

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
    return `$${amount.toLocaleString()}`
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

  const totalSpent = filteredTransfers.reduce((sum, t) => sum + t.soldPrice, 0)
  const averagePrice = filteredTransfers.length > 0 ? Math.round(totalSpent / filteredTransfers.length) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Season
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Transfer History
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {seasonName} • Complete auction and transfer records
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-8">
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-[#E8A800]/20 duration-300">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Total Transfers</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{filteredTransfers.length}</div>
        </div>

        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-[#FFB347]/20 duration-300">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Total Spent</div>
          <div className="text-2xl sm:text-3xl font-black text-[#FFB347] font-mono">
            {formatCurrency(totalSpent)}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-[#E8A800]/20 duration-300">
          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Average Price</div>
          <div className="text-2xl sm:text-3xl font-black text-[#E8A800] font-mono">
            {formatCurrency(averagePrice)}
          </div>
        </div>
      </div>

      {/* Round Filter */}
      {rounds.length > 0 && (
        <div className="mb-6">
          <SearchableSelect
            label="Filter by Round"
            value={selectedRound}
            options={[
              { value: 'all', label: `All Rounds (${transfers.length})` },
              ...rounds.map((round) => ({
                value: round.id,
                label: `Round ${round.roundNumber} (${transfers.filter(t => t.round?.id === round.id).length})`
              }))
            ]}
            onChange={setSelectedRound}
            enableSearch={true}
            className="w-full sm:w-64"
          />
        </div>
      )}

      {/* Transfer List */}
      {filteredTransfers.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
          <div className="text-lg sm:text-xl font-black text-white mb-2 uppercase tracking-wide">
            {selectedRound === 'all' ? 'No Transfers Yet' : 'No Transfers in This Round'}
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono mb-6">
            {selectedRound === 'all' 
              ? 'No players have been sold in this season yet. Start an auction to see transfers here.'
              : 'No players were sold in this round. Try selecting a different round.'}
          </p>
          {selectedRound === 'all' && (
            <Link
              href={`/sub-admin/${seasonId}/auction`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-[#E8A800]/25"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Auction
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/20 hover:bg-white/[0.02] transition-all p-4 sm:p-6 backdrop-blur-xl shadow-md"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                {/* Player Info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                    <img
                      src={getPlayerPhotoUrl(`${transfer.basePlayer.player_id || transfer.basePlayer.id}.webp`)}
                      alt={transfer.basePlayer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 truncate">
                      {transfer.basePlayer.name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-2 truncate">
                      {transfer.basePlayer.seasonalPlayerStats[0]?.realWorldClub || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 sm:py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider font-mono ${getPositionColor(transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A')}`}>
                        {transfer.basePlayer.seasonalPlayerStats[0]?.position || 'N/A'}
                      </span>
                      <PositionGroupBadge 
                        position={transfer.basePlayer.seasonalPlayerStats[0]?.position || ''} 
                        group={transfer.basePlayer.seasonalPlayerStats[0]?.position_group} 
                        size="sm" 
                      />
                      <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-[10px] font-extrabold uppercase tracking-wider font-mono">
                        {transfer.basePlayer.seasonalPlayerStats[0]?.overallRating || 0} OVR
                      </span>
                      {transfer.round && (
                        <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                          R{transfer.round.roundNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow - Hidden on mobile */}
                <div className="hidden lg:block text-gray-600">
                  <svg className="w-6 h-6 lg:w-8 lg:h-8 animate-[pulse_4s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>

                {/* Team Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                    <img
                      src={transfer.team.logoUrl}
                      alt={transfer.team.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 truncate">
                      {transfer.team.name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono truncate">
                      Manager: {transfer.team.managerName}
                    </div>
                  </div>
                </div>

                {/* Price & Date */}
                <div className="flex items-center justify-between lg:flex-col lg:items-end lg:text-right gap-2 border-t lg:border-t-0 border-white/5 pt-2 lg:pt-0">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#E8A800] font-mono">
                    {formatCurrency(transfer.soldPrice)}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono lg:whitespace-nowrap">
                    {formatDate(transfer.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
