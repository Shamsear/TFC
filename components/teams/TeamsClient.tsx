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
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  const currentTeams = selectedView === 'overall' ? overallTeams : (seasonTeams[selectedView] || [])
  const currentStats = selectedView === 'overall' ? overallStats : (seasonStats[selectedView] || overallStats)
  const isOverallView = selectedView === 'overall'

  return (
    <>
      {/* Filter Tabs */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Overall Tab */}
          <button
            onClick={() => setSelectedView('overall')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base whitespace-nowrap transition-all ${
              selectedView === 'overall'
                ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-lg'
                : 'bg-[#111111] text-[#7A7367] border border-white/10 hover:border-[#E8A800]/30 hover:text-[#F5F0E8]'
            }`}
          >
            Overall
          </button>

          {/* Season Tabs */}
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => setSelectedView(season.id)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedView === season.id
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-lg'
                  : 'bg-[#111111] text-[#7A7367] border border-white/10 hover:border-[#E8A800]/30 hover:text-[#F5F0E8]'
              }`}
            >
              {season.name}
              {season.isActive && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Header with Stats */}
      <div className="mb-6 sm:mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1 sm:mb-2">
              {isOverallView ? 'All Teams' : seasons.find(s => s.id === selectedView)?.name}
            </h1>
            <p className="text-sm sm:text-base text-[#D4CCBB]">
              {isOverallView ? 'Overall statistics across all seasons' : 'Season-specific team statistics'}
            </p>
          </div>
          
          {/* Inline Stats */}
          <div className="flex items-center gap-4 sm:gap-8">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{currentStats.totalTeams}</div>
              <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Teams</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{currentStats.totalPlayers}</div>
              <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Players</div>
            </div>
            <div className="hidden sm:block">
              <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{formatCurrency(currentStats.totalSpent)}</div>
              <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Total Spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {currentTeams.length === 0 ? (
        <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Teams Found</h3>
          <p className="text-sm sm:text-base text-[#D4CCBB]">
            {isOverallView ? 'No teams available' : 'No teams in this season'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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
                className="group rounded-xl bg-[#111111] border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
              >
                {/* Team Header with Logo */}
                <div className="mb-3 sm:mb-5">
                  <div className="flex items-center gap-3 mb-2 sm:mb-3">
                    <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="md" />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-black text-[#F5F0E8] mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                        {team.name}
                      </h3>
                      <div className="text-xs text-[#7A7367] truncate">{team.managerName}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7A7367]">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{players} players</span>
                    </div>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-[#FFB347]">{wins} wins</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-3 sm:mb-5">
                  <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                    <span className="text-[#D4CCBB]">Total Spent</span>
                    <span className="text-[#F5F0E8] font-bold">{formatCurrency(spent)}</span>
                  </div>
                  {!isOverallView && budget > 0 && (
                    <>
                      <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FFC93A] to-[#E8A800] rounded-full transition-all"
                          style={{ width: `${100 - spentPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#7A7367] mt-1 sm:mt-1.5">
                        <span>Remaining Budget: {formatCurrency(budget)}</span>
                        <span>{spentPercentage.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Seasons Badge (Overall view only) */}
                {isOverallView && (
                  <div className="mb-3 sm:mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/20">
                      <svg className="w-3 h-3 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-bold text-[#E8A800]">{team.seasonsCount} {team.seasonsCount === 1 ? 'Season' : 'Seasons'}</span>
                    </div>
                  </div>
                )}

                {/* View Link */}
                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10">
                  <span className="text-xs sm:text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                    View Team
                  </span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
