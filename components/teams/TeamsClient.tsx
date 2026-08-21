'use client'

import { useState } from 'react'
import Link from 'next/link'
import TeamLogo from '@/components/team/TeamLogo'

interface Season {
  id: string
  name: string
  isActive: boolean
}

interface TeamData {
  id: string
  managerId: string | null
  managerPhotoUrl: string | null
  name: string
  managerName: string
  logoUrl: string
  totalPlayers: number
  totalSpent: number
  totalWins: number
  currentBudget: number
  seasonsCount: number
  // Season-specific data
  seasonPlayers?: number
  seasonSpent?: number
  seasonWins?: number
  seasonBudget?: number
}

interface TeamsClientProps {
  overallTeams: TeamData[]
  seasonTeams: Record<string, TeamData[]>
  seasons: Season[]
  overallStats: {
    totalTeams: number
    totalPlayers: number
    totalSpent: number
  }
  seasonStats: Record<string, {
    totalTeams: number
    totalPlayers: number
    totalSpent: number
  }>
}

export default function TeamsClient({ 
  overallTeams, 
  seasonTeams, 
  seasons,
  overallStats,
  seasonStats
}: TeamsClientProps) {
  const [selectedView, setSelectedView] = useState<'overall' | string>('overall')

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`
    }
    return `£${(amount / 1000).toFixed(0)}K`
  }

  const currentTeams = selectedView === 'overall' ? overallTeams : (seasonTeams[selectedView] || [])
  const currentStats = selectedView === 'overall' ? overallStats : (seasonStats[selectedView] || overallStats)
  const isOverallView = selectedView === 'overall'

  // Check if active season is S1-S3 (hide players/invested for legacy seasons)
  const activeSeasonName = seasons.find(s => s.id === selectedView)?.name || ''
  const activeSeasonNum = parseInt(activeSeasonName.match(/\d+/)?.[0] || '0', 10)
  const isLegacySeason = !isOverallView && activeSeasonNum >= 1 && activeSeasonNum <= 3

  return (
    <div className="relative">


      {/* Filter Tabs (Glass capsule style) */}
      <div className="mb-8">
        <div className="inline-flex gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl max-w-full overflow-x-auto scrollbar-none">
          {/* Overall Tab */}
          <button
            onClick={() => setSelectedView('overall')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              selectedView === 'overall'
                ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            Overall
          </button>

          {/* Season Tabs */}
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => setSelectedView(season.id)}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer flex items-center gap-2 ${
                selectedView === season.id
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_20px_rgba(232,168,0,0.25)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {season.name}
              {season.isActive && (
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Header with Stats */}
      <div className="mb-8 relative z-10 border-b border-white/5 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                {isOverallView ? 'All Managers' : seasons.find(s => s.id === selectedView)?.name}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1 uppercase tracking-wider">
              {isOverallView ? 'All registered managers' : 'Season-specific manager statistics'}
            </p>
          </div>
          
          {/* Inline Stats Header */}
          <div className="flex items-center gap-6 sm:gap-10">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">{currentStats.totalTeams}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Managers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {currentTeams.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center relative overflow-hidden">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-black text-white mb-1">No Managers Found</h3>
          <p className="text-gray-400 text-xs uppercase tracking-wider">
            {isOverallView ? 'No managers available' : 'No managers registered in this season'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {currentTeams.map((team) => {
            const players = isOverallView ? team.totalPlayers : team.seasonPlayers!
            const spent = isOverallView ? team.totalSpent : team.seasonSpent!
            const wins = isOverallView ? team.totalWins : team.seasonWins!
            const budget = isOverallView ? team.currentBudget : team.seasonBudget!
            const spentPercentage = budget > 0 ? ((spent / (budget + spent)) * 100) : 0

            return (
              <Link
                key={team.id}
                href={team.managerId ? `/managers/${team.managerId}` : `/managers`}
                className="relative block rounded-2xl bg-[#0d0d0d]/40 border border-white/5 p-5 hover:border-amber-500/30 hover:bg-white/[0.01] group cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                {/* Manager Header with Logo */}
                <div className="mb-5 relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 p-1 flex-shrink-0 shadow-lg ring-2 ring-white/5 group-hover:ring-amber-500/20 transition-all flex items-center justify-center">
                      {team.managerPhotoUrl ? (
                        <img
                          src={team.managerPhotoUrl}
                          alt={team.managerName}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="sm" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-white mb-0.5 group-hover:text-[#FFB347] transition-colors truncate">
                        {team.managerName}
                      </h3>
                      {!isOverallView && (
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{team.name}</div>
                      )}
                    </div>
                  </div>
                  
                  {isOverallView ? (
                    <div className="mt-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <svg className="w-3 h-3 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{team.seasonsCount} {team.seasonsCount === 1 ? 'Season' : 'Seasons'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {!isLegacySeason && (
                        <div className="flex items-center gap-3 text-xs text-[#7A7367]">
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400">{players} players</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">{wins} wins</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Stats Ledger (Season view only, not for S1-S3) */}
                {!isOverallView && !isLegacySeason && (
                  <div className="mb-4 relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-extrabold uppercase tracking-widest text-[9px]">Total Invested</span>
                      <span className="text-emerald-400 font-black font-mono">{formatCurrency(spent)}</span>
                    </div>
                    {budget > 0 && (
                      <>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#FFC93A] to-[#E8A800] rounded-full transition-all"
                            style={{ width: `${100 - spentPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-gray-600 mt-1 font-bold font-mono">
                          <span>REMAINING: {formatCurrency(budget)}</span>
                          <span>{spentPercentage.toFixed(0)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* View Link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
                  <span className="text-xs font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors uppercase tracking-wider">
                    View Manager
                  </span>
                  <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
