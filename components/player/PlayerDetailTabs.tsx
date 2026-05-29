'use client'

import { useState } from 'react'

interface Transfer {
  id: string
  seasonName: string
  teamName: string
  teamLogo: string
  soldPrice: number
  status: string
  createdAt: Date
}

interface PlayerDetailTabsProps {
  transferHistory: Transfer[]
  statsContent: React.ReactNode
  currentTeam: {
    id: string
    name: string
    logoUrl: string
    soldPrice: number
  } | null
  season: {
    id: string
    name: string
  }
}

export default function PlayerDetailTabs({ 
  transferHistory, 
  statsContent, 
  currentTeam, 
  season
}: PlayerDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')

  return (
    <>
      {/* Tab Switcher - Premium Glass Capsule */}
      <div className="flex p-1 bg-white/[0.02] border border-white/10 rounded-xl max-w-[280px] mb-6 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_4px_12px_rgba(232,168,0,0.15)] font-black'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_4px_12px_rgba(232,168,0,0.15)] font-black'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Current Team Overview Block */}
          {currentTeam ? (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-white/[0.01] to-[#E8A800]/10 border border-[#E8A800]/30 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-[#E8A800]/30 shadow-[0_0_15px_rgba(232,168,0,0.1)] group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={currentTeam.logoUrl}
                    alt={currentTeam.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs lg:text-sm text-[#E8A800] mb-1 font-black uppercase tracking-wider">Current Team</div>
                  <div className="text-xl lg:text-2xl font-black text-white mb-2">{currentTeam.name}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                      <span className="text-emerald-500 font-bold text-xs">Acquired:</span>
                      <span className="text-emerald-400 font-black text-base lg:text-lg">£{currentTeam.soldPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-400 hidden sm:inline">•</div>
                    <div className="text-gray-300 font-bold text-xs uppercase tracking-wider bg-white/5 border border-white/10 px-3 py-1 rounded-xl">{season.name}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-950/20 border border-blue-500/30 p-6 text-center shadow-lg relative overflow-hidden backdrop-blur-md">
              <div className="absolute inset-0 bg-blue-500/[0.02] rounded-full blur-2xl pointer-events-none" />
              <div className="text-blue-400 font-black text-xs uppercase tracking-widest mb-2">Registration Status</div>
              <div className="text-white font-black text-2xl lg:text-3xl mb-2 tracking-tight">Free Agent</div>
              <div className="text-gray-400 text-xs font-semibold">Available for acquisition in {season.name}</div>
            </div>
          )}

          {/* Player Stats */}
          {statsContent}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6 tracking-tight">Transfer & Transaction Ledger</h2>
          
          {transferHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">No transfer ledger records</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {transferHistory.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className="rounded-xl bg-white/[0.02] border border-white/10 p-3 sm:p-4 hover:border-[#E8A800]/30 hover:bg-white/[0.05] transition-all hover:scale-[1.01] shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative group"
                >
                  {/* Left Side: Transfer badge & Team info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Transfer Number Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center group-hover:border-[#E8A800]/50 transition-colors shadow-md">
                      <span className="text-sm font-black text-[#E8A800]">#{transferHistory.length - index}</span>
                    </div>

                    {/* Team Logo */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 p-1 flex items-center justify-center shadow-inner">
                      <img
                        src={transfer.teamLogo}
                        alt={transfer.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Transfer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white truncate">{transfer.teamName}</h3>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold tracking-wider uppercase">
                          {transfer.seasonName}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-black tracking-wider uppercase ${
                          transfer.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          transfer.status === 'RELEASED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          transfer.status === 'SWAPPED_OUT' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                          'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          {transfer.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>£{transfer.soldPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(transfer.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Arrow Indicator on Desktop */}
                  <div className="hidden sm:block flex-shrink-0 transform group-hover:translate-x-1 transition-transform">
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
