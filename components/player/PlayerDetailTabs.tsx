'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Transfer {
  id: string
  seasonName: string
  teamName: string
  teamLogo: string
  soldPrice: number
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
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#E8A800] text-[#0a0a0a]'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          OVERVIEW
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'history'
              ? 'bg-[#E8A800] text-[#0a0a0a]'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          TRANSFER HISTORY
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Current Team Overview */}
          {currentTeam ? (
            <div className="rounded-2xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/10 border-2 border-[#E8A800]/30 p-6">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border-2 border-[#E8A800]/50">
                  <Image
                    src={currentTeam.logoUrl}
                    alt={currentTeam.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs lg:text-sm text-[#E8A800] mb-1 font-bold uppercase tracking-wider">Current Team</div>
                  <div className="text-xl lg:text-2xl font-black text-white mb-2">{currentTeam.name}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-emerald-400 font-black text-lg lg:text-xl">${currentTeam.soldPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-400 hidden sm:inline">•</div>
                    <div className="text-gray-300 font-medium text-sm lg:text-base">{season.name}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 p-6 text-center">
              <div className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2">Status</div>
              <div className="text-white font-black text-2xl lg:text-3xl mb-2">Free Agent</div>
              <div className="text-gray-400 text-sm">Available for auction in {season.name}</div>
            </div>
          )}

          {/* Player Stats */}
          {statsContent}
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Transfer History</h2>
          
          {transferHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm sm:text-base text-gray-400">No transfer history available</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {transferHistory.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 hover:bg-white/[0.07] transition-all"
                >
                  {/* Mobile Layout */}
                  <div className="flex sm:hidden items-start gap-3">
                    {/* Transfer Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                      <span className="text-sm font-black text-[#E8A800]">#{transferHistory.length - index}</span>
                    </div>

                    {/* Team Logo & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                          <Image
                            src={transfer.teamLogo}
                            alt={transfer.teamName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-white truncate">{transfer.teamName}</h3>
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
                            {transfer.seasonName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>${transfer.soldPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(transfer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex items-center gap-4">
                    {/* Transfer Number */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                      <span className="text-lg font-black text-[#E8A800]">#{transferHistory.length - index}</span>
                    </div>

                    {/* Team Logo */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={transfer.teamLogo}
                        alt={transfer.teamName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Transfer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-white truncate">{transfer.teamName}</h3>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex-shrink-0">
                          {transfer.seasonName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-emerald-400 font-bold">${transfer.soldPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs">{new Date(transfer.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
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
