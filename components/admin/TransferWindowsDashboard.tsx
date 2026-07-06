'use client'

import { useState } from 'react'
import ReleaseWindowsClient from './ReleaseWindowsClient'
import SwapWindowsClient from './SwapWindowsClient'

interface Props {
  seasonId: string
  seasonName: string
}

export default function TransferWindowsDashboard({ seasonId, seasonName }: Props) {
  const [activeTab, setActiveTab] = useState<'releases' | 'swaps'>('releases')

  return (
    <div>
      {/* Tab Navigation Wrapper */}
      <div className="border-b border-white/5 bg-white/[0.01] sticky top-0 z-40 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:h-16 gap-4 sm:gap-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[#E8A800] font-black text-lg sm:text-xl tracking-wider uppercase">TFC Windows</span>
              <span className="text-gray-500 hidden sm:block">|</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-md sm:bg-transparent sm:px-0 sm:py-0 font-mono">{seasonName}</span>
            </div>
            
            <div className="flex w-full sm:w-auto gap-2">
              <button
                onClick={() => setActiveTab('releases')}
                className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer ${
                  activeTab === 'releases'
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-md scale-105'
                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-gray-400'
                }`}
              >
                <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
                Release Windows
              </button>
              
              <button
                onClick={() => setActiveTab('swaps')}
                className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer ${
                  activeTab === 'swaps'
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-md scale-105'
                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-gray-400'
                }`}
              >
                <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Swap Windows
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Component Workspace */}
      <div className="py-4">
        {activeTab === 'releases' ? (
          <ReleaseWindowsClient seasonId={seasonId} seasonName={seasonName} />
        ) : (
          <SwapWindowsClient seasonId={seasonId} seasonName={seasonName} />
        )}
      </div>
    </div>
  )
}
