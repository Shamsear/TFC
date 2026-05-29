'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import ReadonlySquadFormation from '@/components/team/ReadonlySquadFormation'

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
  teamSquad?: any
}

export default function TeamDashboardTabs({ activeBids, squadPlayers, teamSquad }: TeamDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'bids' | 'squad' | 'builder'>('bids')

  // Map squadPlayers to the format expected by ReadonlySquadFormation
  const allPlayers = squadPlayers.map(p => ({
    id: p.basePlayer.id,
    name: p.basePlayer.name,
    photoUrl: getPlayerPhotoUrl(`${p.basePlayer.player_id || p.basePlayer.id}.webp`),
    position: p.basePlayer.seasonalPlayerStats[0]?.position || 'N/A',
    overallRating: p.basePlayer.seasonalPlayerStats[0]?.overallRating || 0,
    playerId: p.basePlayer.player_id || p.basePlayer.id
  }))

  const getPositionColor = (pos: string) => {
    switch (pos.toUpperCase()) {
      case 'GK': return 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
      case 'CB': return 'bg-blue-500/10 border-blue-500/25 text-blue-400'
      case 'LB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'RB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'DMF': return 'bg-green-600/10 border-green-600/25 text-green-500'
      case 'CMF': return 'bg-green-500/10 border-green-500/25 text-green-400'
      case 'LMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'RMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'AMF': return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
      case 'SS': return 'bg-orange-500/10 border-orange-500/25 text-orange-400'
      case 'LWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'RWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'CF': return 'bg-red-500/10 border-red-500/25 text-red-400'
      default: return 'bg-gray-500/10 border-gray-500/25 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Headers (Glass Capsule toggle) */}
      <div className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('bids')}
          className={`flex-1 px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'bids'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Active Bids
          {activeBids.length > 0 && (
            <span className={`ml-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black leading-none ${activeTab === 'bids' ? 'bg-[#0a0a0a]/10 text-black' : 'bg-[#E8A800]/10 text-[#E8A800]'}`}>
              {activeBids.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'squad'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Squad list
          {squadPlayers.length > 0 && (
            <span className={`ml-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black leading-none ${activeTab === 'squad' ? 'bg-[#0a0a0a]/10 text-black' : 'bg-cyan-500/10 text-cyan-400'}`}>
              {squadPlayers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('builder')}
          className={`flex-1 px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'builder'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Squad Builder
        </button>
      </div>

      {/* Tab Content inside glowing glass card */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        
        {/* Active Bids Tab */}
        {activeTab === 'bids' && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            {activeBids.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBids.map((bid) => {
                  const stats = bid.basePlayer.seasonalPlayerStats[0]
                  const position = stats?.position || 'N/A'
                  const positionGroup = stats?.position_group
                  const rating = stats?.overallRating || 0

                  return (
                    <div
                      key={bid.id}
                      className="relative block rounded-2xl bg-[#0d0d0d]/40 border border-white/5 p-4 hover:border-amber-500/30 hover:bg-white/[0.02] transition-all duration-300 group shadow-md"
                    >
                      <div className="flex gap-4 items-center">
                        {/* Photo Frame */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-amber-500/20 transition-colors shadow-inner">
                          <img
                            src={getPlayerPhotoUrl(`${bid.basePlayer.player_id || bid.basePlayer.id}.webp`)}
                            alt={bid.basePlayer.name}
                            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                          />
                        </div>

                        {/* Player Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-white text-sm sm:text-base leading-tight truncate group-hover:text-[#FFB347] transition-colors">
                            {bid.basePlayer.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider ${getPositionColor(position)}`}>
                              {positionGroup && positionGroup !== 'ALL' ? `${position} • ${positionGroup}` : position}
                            </span>
                            <span className="text-[9px] font-black text-amber-400 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              ★ {rating} OVR
                            </span>
                          </div>
                        </div>

                        {/* Bid Details */}
                        <div className="text-right flex-shrink-0 pl-2">
                          <div className="text-sm sm:text-base font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                            £{bid.bidAmount.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mt-0.5">Priority #{bid.priority}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-500 mx-auto mb-4 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-white mb-0.5">No Active Bids Found</h3>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Acquire premium players during draft auctions to place bids.</p>
              </div>
            )}
          </div>
        )}

        {/* Squad Tab */}
        {activeTab === 'squad' && (
          <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
            {squadPlayers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {squadPlayers.map((player) => {
                    const stats = player.basePlayer.seasonalPlayerStats[0]
                    const position = stats?.position || 'N/A'
                    const positionGroup = stats?.position_group
                    const rating = stats?.overallRating || 0

                    return (
                      <div
                        key={player.id}
                        className="relative block rounded-2xl bg-[#0d0d0d]/40 border border-white/5 p-4 hover:border-amber-500/30 hover:bg-white/[0.02] transition-all duration-300 group shadow-md"
                      >
                        <div className="flex gap-4 items-center">
                          {/* Photo Frame */}
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 group-hover:border-amber-500/20 transition-colors shadow-inner">
                            <img
                              src={getPlayerPhotoUrl(`${player.basePlayer.player_id || player.basePlayer.id}.webp`)}
                              alt={player.basePlayer.name}
                              className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                            />
                          </div>

                          {/* Player Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-white text-sm sm:text-base leading-tight truncate group-hover:text-[#FFB347] transition-colors">
                              {player.basePlayer.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider ${getPositionColor(position)}`}>
                                {positionGroup && positionGroup !== 'ALL' ? `${position} • ${positionGroup}` : position}
                              </span>
                              <span className="text-[9px] font-black text-amber-400 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                ★ {rating} OVR
                              </span>
                            </div>
                          </div>

                          {/* Price Tag */}
                          <div className="text-right flex-shrink-0 pl-2">
                            <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                              £{player.soldPrice.toLocaleString()}
                            </div>
                            <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider mt-0.5">Purchased</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* View Full Squad Link */}
                <Link
                  href="/team/squad"
                  className="relative flex items-center justify-center gap-2 px-5 py-3 bg-[#E8A800]/10 border border-[#E8A800]/20 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/20 text-[#E8A800] rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md select-none w-full"
                >
                  View Full Squad Roster
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-500 mx-auto mb-4 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-white mb-0.5">No Players Registered</h3>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Draft players during auction window to register squad roster.</p>
              </div>
            )}
          </div>
        )}

        {/* Squad Builder Tab */}
        {activeTab === 'builder' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-4">
              <ReadonlySquadFormation
                formation={teamSquad?.formation}
                allPlayers={allPlayers}
              />
            </div>
            
            <div className="flex justify-center">
              <Link
                href="/team/squad/builder"
                className="relative inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
              >
                {teamSquad?.formation ? 'Launch Pitch Editor' : 'Launch Squad Builder'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
