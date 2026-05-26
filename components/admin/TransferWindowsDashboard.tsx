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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Tab Navigation Wrapper */}
      <div className="border-b border-white/5 bg-[#111] sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-[#E8A800] font-black text-xl tracking-wider uppercase">TFC Windows</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm font-medium">{seasonName}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('releases')}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'releases'
                    ? 'bg-[#E8A800] text-[#0a0a0a] shadow-lg scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
                Release Windows
              </button>
              
              <button
                onClick={() => setActiveTab('swaps')}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'swaps'
                    ? 'bg-[#E8A800] text-[#0a0a0a] shadow-lg scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
