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
}

export default function PlayerDetailTabs({ 
  transferHistory, 
  statsContent
}: PlayerDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')

  return (
    <>
      {/* Tab Switcher - Premium Glass Capsule */}
      <div className="flex p-1 bg-[#0D0D0D]/95 border border-white/5 rounded-2xl max-w-[280px] mb-6 backdrop-blur-xl shadow-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#E8A800] text-black font-black'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#E8A800] text-black font-black'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Player Stats */}
          {statsContent}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono mb-4 sm:mb-6">Transfer & Transaction Ledger</h2>
          
          {transferHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">No transfer ledger records</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {transferHistory.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className="rounded-3xl bg-white/[0.01] border border-white/5 p-4 hover:border-[#E8A800]/30 hover:bg-white/[0.02] transition-all duration-300 hover:-translate-y-0.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group"
                >
                  {/* Left Side: Transfer badge & Team info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Transfer Number Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center group-hover:border-[#E8A800]/50 transition-colors shadow-md">
                      <span className="text-xs font-black font-mono text-[#E8A800]">#{transferHistory.length - index}</span>
                    </div>

                    {/* Team Logo */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 p-1.5 flex items-center justify-center shadow-inner">
                      <img
                        src={transfer.teamLogo || '/default-team-logo.png'}
                        alt={transfer.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Transfer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-white uppercase font-mono tracking-tight truncate">{transfer.teamName}</h3>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[9px] font-bold tracking-wider font-mono uppercase">
                          {transfer.seasonName}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-black font-mono tracking-wider uppercase ${
                          transfer.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          transfer.status === 'RELEASED' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          transfer.status === 'SWAPPED_OUT' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                          'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                          {transfer.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider font-mono text-gray-500">
                        <div className="flex items-center gap-1.5 text-[#E8A800]">
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
                  <div className="hidden sm:block flex-shrink-0 transform group-hover:translate-x-1 transition-transform duration-300">
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
