'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BADGE_DEFINITIONS, 
  getRankDetails,
  BadgeDef
} from '@/lib/achievements-math';

interface UnlockedBadge {
  id: string;
  badgeKey: string;
  badgeName: string;
  tier: string;
  seasonId: string | null;
  unlockedAt: string | Date;
}

interface TeamData {
  id: string;
  name: string;
  managerName: string;
  logoUrl: string;
  xp: number;
  level: number;
  unlockedBadges: UnlockedBadge[];
  xpHistory: XPHistoryItem[];
}

interface XPHistoryItem {
  id: string;
  amount: number;
  xpType: string;
  description: string;
  matchId: string | null;
  badgeKey: string | null;
  createdAt: string | Date;
}

interface Season {
  id: string;
  name: string;
}

interface AllTeamsAchievementsClientProps {
  teams: TeamData[];
  season: Season;
}

export function AllTeamsAchievementsClient({ teams, season }: AllTeamsAchievementsClientProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [modalTab, setModalTab] = useState<'badges' | 'xp'>('badges');

  const allBadges = Object.values(BADGE_DEFINITIONS);

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-red-400 bg-red-950/40 border border-red-500/20';
      case 'GOLD': return 'text-amber-400 bg-amber-950/40 border border-amber-500/20';
      case 'SILVER': return 'text-slate-300 bg-slate-800/40 border border-slate-500/20';
      default: return 'text-orange-400 bg-orange-950/40 border border-orange-500/20';
    }
  };

  const getBadgeImageFilter = (badgeKey: string) => {
    let filter = '';
    if (badgeKey.endsWith('_1')) {
      filter = 'hue-rotate(185deg) saturate(1.4) brightness(1.1) contrast(1.1)';
    } else if (badgeKey.endsWith('_2')) {
      filter = 'hue-rotate(42deg) saturate(1.8) brightness(1.2) contrast(1.1)';
    } else if (badgeKey.endsWith('_3')) {
      filter = 'hue-rotate(325deg) saturate(2) brightness(1.1) contrast(1.2)';
    }
    return filter ? { filter } : {};
  };

  const handleTeamClick = (team: TeamData) => {
    setSelectedTeam(team);
    setModalTab('badges'); // Reset to badges tab
    setIsModalOpen(true);
  };

  const filteredTeams = filterTier === 'ALL' 
    ? teams 
    : teams.filter(team => {
        const rank = getRankDetails(team.level);
        return rank.title.toUpperCase().includes(filterTier);
      });

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link 
          href={`/sub-admin/${season.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4 text-[#E8A800] transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          All Teams Achievements
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} • View badges and achievements for all teams
        </p>
      </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          <button
            onClick={() => setFilterTier('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterTier === 'ALL'
                ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] border border-transparent'
                : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            All Teams ({teams.length})
          </button>
          <button
            onClick={() => setFilterTier('BRONZE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterTier === 'BRONZE'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            Bronze Tier
          </button>
          <button
            onClick={() => setFilterTier('SILVER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterTier === 'SILVER'
                ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            Silver Tier
          </button>
          <button
            onClick={() => setFilterTier('GOLD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterTier === 'GOLD'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            Gold Tier
          </button>
          <button
            onClick={() => setFilterTier('PLATINUM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterTier === 'PLATINUM'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            Platinum Tier
          </button>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map(team => {
            const rank = getRankDetails(team.level);
            const badgeCount = team.unlockedBadges.length;
            const completionPercent = Math.round((badgeCount / allBadges.length) * 100);

            return (
              <div
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className="relative group rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-xl p-6 overflow-hidden shadow-md hover:border-[#E8A800]/25 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                {/* Rank color glow */}
                <div 
                  className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all duration-1000"
                  style={{ backgroundColor: rank.color }}
                />

                <div className="relative z-10">
                  {/* Team Logo and Rank */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div 
                        className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 p-1 bg-black/40"
                        style={{ boxShadow: `0 0 20px ${rank.color}20` }}
                      >
                        <img
                          src={team.logoUrl}
                          alt={`${team.name} Logo`}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      </div>
                      <div 
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border bg-[#0d0d10] p-1 flex items-center justify-center"
                        style={{ borderColor: `${rank.color}30` }}
                      >
                        <Image
                          src={rank.badgePath}
                          alt={rank.title}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                        {team.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-1">
                        {team.managerName}
                      </p>
                      <span 
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                        style={{ 
                          borderColor: `${rank.color}40`, 
                          color: rank.color,
                          backgroundColor: `${rank.color}0c`
                        }}
                      >
                        Lvl {team.level} • {rank.title}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center bg-black/30 rounded-lg p-3 border border-white/5">
                      <div className="text-xl font-black text-cyan-400 font-mono">
                        {badgeCount}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">
                        Badges
                      </div>
                    </div>
                    <div className="text-center bg-black/30 rounded-lg p-3 border border-white/5">
                      <div className="text-xl font-black text-purple-400 font-mono">
                        {completionPercent}%
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">
                        Complete
                      </div>
                    </div>
                    <div className="text-center bg-black/30 rounded-lg p-3 border border-white/5">
                      <div className="text-xl font-black font-mono" style={{ color: rank.color }}>
                        {team.xp.toLocaleString()}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">
                        Total XP
                      </div>
                    </div>
                  </div>

                  {/* Recent Badges Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      Recent:
                    </span>
                    <div className="flex gap-1.5 flex-1 overflow-hidden">
                      {team.unlockedBadges.slice(0, 5).map(badge => {
                        const badgeDef = BADGE_DEFINITIONS[badge.badgeKey];
                        if (!badgeDef) return null;
                        
                        return (
                          <div key={badge.id} className="relative h-8 w-8 flex-shrink-0">
                            <Image
                              src={badgeDef.image}
                              alt={badgeDef.name}
                              width={32}
                              height={32}
                              className="object-contain"
                              style={getBadgeImageFilter(badge.badgeKey)}
                            />
                          </div>
                        );
                      })}
                      {badgeCount === 0 && (
                        <span className="text-xs text-gray-600 italic">No badges yet</span>
                      )}
                    </div>
                  </div>

                  {/* View Details Hint */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500 group-hover:text-[#E8A800] transition-colors">
                    <span className="font-semibold">Click to view all badges</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl bg-black/20">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-300">No Teams Found</h3>
            <p className="text-xs text-gray-500 mt-1">No teams match the selected filter.</p>
          </div>
        )}
      </div>

      {/* Team Detail Modal */}
      {isModalOpen && selectedTeam && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-black/80 transition-all duration-300 cursor-pointer animate-[fadeIn_0.2s_ease-out]"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-[96vh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-3xl bg-[#0e0e0e]/95 border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl cursor-default flex flex-col"
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors duration-150 cursor-pointer z-50 bg-black/50 sm:bg-transparent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8">
              {/* Team Header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border border-white/10 p-1 sm:p-1.5 bg-black/40 flex-shrink-0">
                    <img
                      src={selectedTeam.logoUrl}
                      alt={`${selectedTeam.name} Logo`}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-1 truncate">
                      {selectedTeam.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      Manager: {selectedTeam.managerName}
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap text-[10px] sm:text-xs">
                      <span className="text-gray-500">
                        Level {selectedTeam.level}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-cyan-400 font-mono">
                        {selectedTeam.xp.toLocaleString()} XP
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-purple-400">
                        {selectedTeam.unlockedBadges.length} / {allBadges.length} Badges
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-white/[0.06] pb-3 sm:pb-4 overflow-x-auto">
                <button
                  onClick={() => setModalTab('badges')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 border cursor-pointer whitespace-nowrap ${
                    modalTab === 'badges'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-white/[0.01] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                  </svg>
                  <span className="hidden sm:inline">Badges</span>
                  <span className="sm:hidden">({selectedTeam.unlockedBadges.length})</span>
                  <span className="hidden sm:inline">({selectedTeam.unlockedBadges.length})</span>
                </button>
                <button
                  onClick={() => setModalTab('xp')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 border cursor-pointer whitespace-nowrap ${
                    modalTab === 'xp'
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.01] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="hidden sm:inline">XP History</span>
                  <span className="sm:hidden">({selectedTeam.xpHistory.length})</span>
                  <span className="hidden sm:inline">({selectedTeam.xpHistory.length})</span>
                </button>
              </div>

              {/* Tab Content */}
              {modalTab === 'badges' ? (
                /* Badges Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {allBadges.map(badge => {
                    const unlocked = selectedTeam.unlockedBadges.find(b => b.badgeKey === badge.key);
                    const tierColor = getTierColorClass(badge.tier);

                    return (
                      <div 
                        key={badge.key}
                        className={`relative rounded-xl p-3 sm:p-4 border text-center transition-all duration-300 ${
                          unlocked 
                            ? 'bg-white/[0.02] border-white/5 hover:border-white/10' 
                            : 'bg-white/[0.01] border-white/[0.02] opacity-35'
                        }`}
                      >
                        {unlocked && (
                          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-3 w-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center text-[8px] font-bold">
                            ✓
                          </span>
                        )}

                        <div className="mb-2 sm:mb-3 relative h-10 w-10 sm:h-12 sm:w-12 mx-auto flex items-center justify-center">
                          <Image
                            src={badge.image}
                            alt={badge.name}
                            width={48}
                            height={48}
                            className="object-contain"
                            style={unlocked ? getBadgeImageFilter(badge.key) : { filter: 'grayscale(1) opacity(0.3)' }}
                          />
                        </div>

                        <div className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded-full w-fit mx-auto mb-1.5 sm:mb-2 ${tierColor}`}>
                          {badge.tier}
                        </div>
                        <h3 className={`text-[9px] sm:text-[10px] font-semibold leading-tight line-clamp-2 ${unlocked ? 'text-white' : 'text-gray-600'}`}>
                          {badge.name}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* XP History */
                <div>
                  {selectedTeam.xpHistory.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 border border-dashed border-white/[0.08] rounded-xl bg-black/20">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-300">No XP History</h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">This team has not earned any XP yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.xpHistory.map(log => {
                        let typeLabelColor = 'text-gray-400 bg-gray-900/40 border-gray-800';
                        if (log.xpType === 'MATCH_WON') typeLabelColor = 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/20';
                        if (log.xpType === 'GOAL_SCORED') typeLabelColor = 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/20';
                        if (log.xpType === 'BADGE_UNLOCKED') typeLabelColor = 'text-amber-400 bg-amber-950/20 border border-amber-500/20';
                        if (log.xpType === 'MATCH_PLAYED') typeLabelColor = 'text-blue-400 bg-blue-950/20 border border-blue-500/20';
                        if (log.xpType === 'MATCH_DRAWN') typeLabelColor = 'text-yellow-400 bg-yellow-950/20 border border-yellow-500/20';

                        return (
                          <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-2 sm:gap-0 sm:flex-shrink-0">
                              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border ${typeLabelColor}`}>
                                {log.xpType.replace('_', ' ')}
                              </span>
                              <span className="sm:hidden text-xs font-black font-mono text-cyan-400">
                                +{log.amount}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] sm:text-xs text-gray-300 font-medium leading-relaxed">
                                {log.description}
                              </p>
                              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 font-mono">
                                {new Date(log.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="hidden sm:block flex-shrink-0">
                              <span className="text-sm font-black font-mono text-cyan-400">
                                +{log.amount}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
