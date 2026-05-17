'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface Bid {
  id: string
  bidAmount: number
  priority: number
  basePlayer: {
    id: string
    player_id: string | null
    name: string
    photoUrl: string | null
    seasonalPlayerStats: Array<{
      position: string
      position_group: string | null
      overallRating: number
    }>
  }
}

interface SquadPlayer {
  id: string
  soldPrice: number
  basePlayer: {
    id: string
    player_id: string | null
    name: string
    photoUrl: string | null
    seasonalPlayerStats: Array<{
      position: string
      position_group: string | null
      overallRating: number
    }>
  }
}

interface TeamDashboardTabsProps {
  activeBids: Bid[]
  squadPlayers: SquadPlayer[]
}

export default function TeamDashboardTabs({ activeBids, squadPlayers }: TeamDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'bids' | 'squad' | 'builder'>('bids')

  return (
    <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('bids')}
          className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-bold transition-all ${
            activeTab === 'bids'
              ? 'bg-[#E8A800]/10 text-[#E8A800] border-b-2 border-[#E8A800]'
              : 'text-[#D4CCBB] hover:bg-white/5'
          }`}
        >
          Active Bids
          {activeBids.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E8A800]/20 text-[#E8A800] text-xs">
              {activeBids.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-bold transition-all ${
            activeTab === 'squad'
              ? 'bg-[#E8A800]/10 text-[#E8A800] border-b-2 border-[#E8A800]'
              : 'text-[#D4CCBB] hover:bg-white/5'
          }`}
        >
          Squad
          {squadPlayers.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
              {squadPlayers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-bold transition-all ${
            activeTab === 'builder'
              ? 'bg-[#E8A800]/10 text-[#E8A800] border-b-2 border-[#E8A800]'
              : 'text-[#D4CCBB] hover:bg-white/5'
          }`}
        >
          Squad Builder
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6">
        {/* Active Bids Tab */}
        {activeTab === 'bids' && (
          <div>
            {activeBids.length > 0 ? (
              <div className="space-y-3">
                {activeBids.map((bid) => {
                  const stats = bid.basePlayer.seasonalPlayerStats[0]
                  const position = stats?.position || 'N/A'
                  const positionGroup = stats?.position_group
                  const rating = stats?.overallRating || 0

                  return (
                    <div
                      key={bid.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#E8A800]/50 transition-all"
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(`${bid.basePlayer.player_id || bid.basePlayer.id}.webp`)}
                          alt={bid.basePlayer.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm sm:text-base truncate">
                          {bid.basePlayer.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                            {positionGroup && positionGroup !== 'ALL' ? `${position}-${positionGroup}` : position}
                          </span>
                          <span className="text-xs text-[#7A7367]">OVR {rating}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm sm:text-base font-black text-[#E8A800]">
                          £{bid.bidAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#7A7367]">Priority {bid.priority}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[#7A7367] text-sm">No active bids</p>
              </div>
            )}
          </div>
        )}

        {/* Squad Tab */}
        {activeTab === 'squad' && (
          <div>
            {squadPlayers.length > 0 ? (
              <div className="space-y-3">
                {squadPlayers.map((player) => {
                  const stats = player.basePlayer.seasonalPlayerStats[0]
                  const position = stats?.position || 'N/A'
                  const positionGroup = stats?.position_group
                  const rating = stats?.overallRating || 0

                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <Image
                          src={getPlayerPhotoUrl(`${player.basePlayer.player_id || player.basePlayer.id}.webp`)}
                          alt={player.basePlayer.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm sm:text-base truncate">
                          {player.basePlayer.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                            {positionGroup && positionGroup !== 'ALL' ? `${position}-${positionGroup}` : position}
                          </span>
                          <span className="text-xs text-[#7A7367]">OVR {rating}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm sm:text-base font-black text-white">
                          £{player.soldPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Link
                  href="/team/squad"
                  className="block text-center py-3 rounded-lg bg-[#E8A800]/10 hover:bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] font-bold text-sm transition-all"
                >
                  View Full Squad
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-[#7A7367] text-sm">No players in squad</p>
              </div>
            )}
          </div>
        )}

        {/* Squad Builder Tab */}
        {activeTab === 'builder' && (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/30 flex items-center justify-center text-[#E8A800] mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-2">Build Your Formation</h3>
            <p className="text-[#7A7367] text-sm mb-4 sm:mb-6">
              Arrange your squad in different formations and save lineups
            </p>
            <Link
              href="/team/squad/builder"
              className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-bold text-sm transition-all"
            >
              Open Squad Builder
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
