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

  return (
    <div className="relative">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />

      {/* Filter Tabs (Glass capsule style) */}
      <div className="mb-8">
        <div className="inline-flex gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl max-w-full overflow-x-auto scrollbar-none">
          {/* Overall Tab */}
          <button
            onClick={() => setSelectedView('overall')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer ${
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
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
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
                {isOverallView ? 'All Teams' : seasons.find(s => s.id === selectedView)?.name}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1 uppercase tracking-wider">
              {isOverallView ? 'Overall statistics across all seasons' : 'Season-specific team statistics'}
            </p>
          </div>
          
          {/* Inline Stats Header */}
          <div className="flex items-center gap-6 sm:gap-10">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">{currentStats.totalTeams}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Teams</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">{currentStats.totalPlayers}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Players</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">{formatCurrency(currentStats.totalSpent)}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-sans">Total Spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {currentTeams.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl relative overflow-hidden">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-black text-white mb-1">No Teams Found</h3>
          <p className="text-gray-400 text-xs uppercase tracking-wider">
            {isOverallView ? 'No teams available' : 'No teams registered in this season'}
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
                href={`/teams/${team.id}`}
                className="relative block rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 p-5 hover:border-amber-500/30 hover:bg-white/[0.01] hover:shadow-[0_0_30px_rgba(232,168,0,0.05)] transition-all duration-300 group cursor-pointer overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                {/* Team Header with Logo */}
                <div className="mb-5 relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 p-1 flex-shrink-0 shadow-lg ring-2 ring-white/5 group-hover:ring-amber-500/20 transition-all flex items-center justify-center">
                      <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="sm" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-white mb-0.5 group-hover:text-[#FFB347] transition-colors truncate">
                        {team.name}
                      </h3>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{team.managerName}</div>
                    </div>
                  </div>
                  
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
                </div>

                {/* Stats Ledger */}
                <div className="mb-4 relative z-10">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-extrabold uppercase tracking-widest text-[9px]">Total Invested</span>
                    <span className="text-emerald-400 font-black font-mono">{formatCurrency(spent)}</span>
                  </div>
                  {!isOverallView && budget > 0 && (
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

                {/* Seasons Badge (Overall view only) */}
                {isOverallView && (
                  <div className="mb-4 relative z-10">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider text-amber-400">
                      📅 {team.seasonsCount} {team.seasonsCount === 1 ? 'Season' : 'Seasons'}
                    </div>
                  </div>
                )}

                {/* View Link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
                  <span className="text-xs font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors uppercase tracking-wider">
                    View Team
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
