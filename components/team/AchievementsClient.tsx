'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BADGE_DEFINITIONS, 
  calculateLevelFromXP, 
  getCumulativeXPForLevel, 
  getXPForNextLevel, 
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

interface XPHistoryItem {
  id: string;
  amount: number;
  xpType: string;
  description: string;
  matchId: string | null;
  badgeKey: string | null;
  createdAt: string | Date;
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

interface AchievementsClientProps {
  team: TeamData;
}

export function AchievementsClient({ team }: AchievementsClientProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDef | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trophies' | 'ledger'>('trophies');

  // Level Progression Math
  const level = team.level;
  const currentXP = team.xp;
  const levelStartXP = getCumulativeXPForLevel(level);
  const xpInCurrentLevel = currentXP - levelStartXP;
  const xpNeededForNextLevel = getXPForNextLevel(level);
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  // Rank Details
  const rank = getRankDetails(level);

  // Unlocked Badges lookup map
  const unlockedMap = new Map<string, UnlockedBadge>();
  team.unlockedBadges.forEach(b => {
    unlockedMap.set(b.badgeKey, b);
  });

  const allBadges = Object.values(BADGE_DEFINITIONS);
  const totalEarned = team.unlockedBadges.length;

  const handleBadgeClick = (badge: BadgeDef) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-red-400 bg-red-950/40 border border-red-500/20';
      case 'GOLD': return 'text-amber-400 bg-amber-950/40 border border-amber-500/20';
      case 'SILVER': return 'text-slate-300 bg-slate-800/40 border border-slate-500/20';
      default: return 'text-orange-400 bg-orange-950/40 border border-orange-500/20';
    }
  };

  const getTierGlowColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'rgba(239, 68, 68, 0.4)';
      case 'GOLD': return 'rgba(245, 158, 11, 0.4)';
      case 'SILVER': return 'rgba(148, 163, 184, 0.4)';
      default: return 'rgba(249, 115, 22, 0.4)';
    }
  };

  const getRomanNumeral = (key: string) => {
    if (key.endsWith('_1')) return 'I';
    if (key.endsWith('_2')) return 'II';
    if (key.endsWith('_3')) return 'III';
    return '';
  };

  const getBadgeImageFilter = (badgeKey: string, unlocked: boolean) => {
    if (!unlocked) {
      return { filter: 'grayscale(1) opacity(0.2) contrast(0.7) brightness(0.6)' };
    }

    let filter = '';
    // Silver Tier (Level 1 Streaks)
    if (badgeKey.endsWith('_1')) {
      filter = 'hue-rotate(185deg) saturate(1.4) brightness(1.1) contrast(1.1)';
    }
    // Gold Tier (Level 2 Streaks)
    else if (badgeKey.endsWith('_2')) {
      filter = 'hue-rotate(42deg) saturate(1.8) brightness(1.2) contrast(1.1)';
    }
    // Platinum Tier (Level 3 Streaks)
    else if (badgeKey.endsWith('_3')) {
      filter = 'hue-rotate(325deg) saturate(2) brightness(1.1) contrast(1.2)';
    }

    return filter ? { filter } : {};
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 px-4 md:px-8 font-sans selection:bg-[#E8A800] selection:text-black relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#E8A800]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Back Link to Team Dashboard */}
        <Link 
          href="/team"
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-gray-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider transform active:scale-95 group"
        >
          <svg className="w-4 h-4 text-[#E8A800] transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Profile Card & Level progression */}
        <div className="relative rounded-2xl bg-neutral-900/40 border border-white/10 backdrop-blur-xl p-6 md:p-8 mb-8 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          {/* Dynamic color spotlight based on current rank color */}
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: rank.color }}
          ></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Logo and Rank Emblem */}
            <div className="relative">
              <div 
                className="relative h-28 w-28 md:h-32 md:w-32 overflow-hidden rounded-2xl border border-white/10 p-1.5 bg-black/40 shadow-2xl transition-all duration-300"
                style={{ boxShadow: `0 0 40px ${rank.color}20` }}
              >
                <img
                  src={team.logoUrl}
                  alt={`${team.name} Logo`}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
              {/* Floating Rank Emblem Overlay */}
              <div 
                className="absolute -bottom-3 -right-3 h-12 w-12 md:h-14 md:w-14 rounded-full border bg-[#0d0d10] p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center backdrop-blur-xl group hover:scale-110 transition-transform duration-200"
                title={`${rank.title} Emblem`}
                style={{ borderColor: `${rank.color}30` }}
              >
                <Image
                  src={rank.badgePath}
                  alt={rank.title}
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Info and Progression */}
            <div className="flex-1 w-full text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  {team.name}
                </h1>
                
                {/* Level Tag with Micro Rank Emblem */}
                <span 
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mx-auto md:mx-0 border w-fit"
                  style={{ 
                    borderColor: `${rank.color}40`, 
                    color: rank.color,
                    backgroundColor: `${rank.color}0c`
                  }}
                >
                  <Image
                    src={rank.badgePath}
                    alt={rank.title}
                    width={16}
                    height={16}
                    className="object-contain animate-[pulse_3s_infinite]"
                  />
                  Lvl {level} • {rank.title}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">Manager: {team.managerName}</p>
              <p className="text-xs text-gray-500 mb-6 max-w-xl leading-relaxed">
                Earn XP from match results, clean sheets, high scores, and badge unlocks to level up your franchise!
              </p>

              {/* Progress Bar Container */}
              <div className="max-w-2xl">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold">Level Progress</span>
                  <span className="font-bold font-mono text-cyan-400">{xpInCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP</span>
                </div>
                
                <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/[0.06] p-[1.5px]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(6,182,212,0.4)] relative"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundImage: `linear-gradient(90deg, ${rank.color}, #06b6d4)`
                    }}
                  >
                    {/* Glowing highlight indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_6px_#fff]" />
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-mono">
                  <span>Lvl {level}</span>
                  <span>{team.xp.toLocaleString()} Total XP</span>
                  <span>Lvl {level + 1}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Cabinet */}
            <div className="flex gap-6 border-t border-white/[0.06] pt-6 md:pt-0 md:border-t-0 md:border-l md:pl-8 w-full md:w-auto justify-around md:justify-start">
              <div className="text-center">
                <div className="text-3xl font-black text-cyan-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.15)]">{totalEarned}</div>
                <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-1">Earned Badges</div>
              </div>
              <div className="w-[1px] h-10 bg-white/10 hidden md:block"></div>
              <div className="text-center">
                <div className="text-3xl font-black text-purple-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(192,132,252,0.15)]">
                  {Math.round((totalEarned / allBadges.length) * 100)}%
                </div>
                <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-1">Completion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Switcher Tab */}
        <div className="flex gap-4 mb-8 border-b border-white/[0.06] pb-4">
          <button
            onClick={() => setActiveTab('trophies')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 border cursor-pointer ${
              activeTab === 'trophies'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-white/[0.01] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
            </svg>
            Trophy Room Showcase
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 border cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.01] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            XP Progression Ledger
          </button>
        </div>

        {activeTab === 'trophies' ? (
          <>
            {/* Showcase / Badge Grid Section */}
            <div className="mb-6 flex items-center justify-between animate-[fadeIn_0.3s_ease-out]">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                </svg>
                Trophy Showcase Cabinet
                <span className="text-xs font-semibold text-gray-500 font-mono ml-2">({totalEarned} / {allBadges.length} unlocked)</span>
              </h2>
            </div>

            {/* Badges Grid Cabinet */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 animate-[fadeIn_0.3s_ease-out]">
              {allBadges.map(badge => {
                const unlocked = unlockedMap.get(badge.key);
                const tierColor = getTierColorClass(badge.tier);
                const glowColor = getTierGlowColor(badge.tier);

                return (
                  <div 
                    key={badge.key}
                    onClick={() => handleBadgeClick(badge)}
                    className={`relative group rounded-xl p-5 border text-center transition-all duration-300 select-none cursor-pointer flex flex-col items-center justify-between overflow-hidden ${
                      unlocked 
                        ? 'bg-neutral-900/40 hover:bg-neutral-900/60 border-white/[0.08] hover:border-[#E8A800]/30 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(232,168,0,0.08)]' 
                        : 'bg-black/30 border-white/[0.03] opacity-60 hover:opacity-80'
                    }`}
                  >
                    {/* Visual indicator check */}
                    {unlocked && (
                      <span className="absolute top-2.5 right-2.5 h-4 w-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center text-[9px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        ✓
                      </span>
                    )}

                    {/* Locked backdrop display overlay */}
                    {!unlocked && (
                      <div className="absolute inset-0 bg-[#070708]/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl z-20">
                        <div className="w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Badge Image */}
                    <div className="mb-4 relative h-16 w-16 flex items-center justify-center z-10">
                      <Image
                        src={badge.image}
                        alt={badge.name}
                        width={64}
                        height={64}
                        className={`object-contain transition-all duration-300 ${
                          unlocked ? 'group-hover:scale-110' : ''
                        }`}
                        style={getBadgeImageFilter(badge.key, !!unlocked)}
                        priority={badge.key.startsWith('UNSTOPPABLE') || badge.key.startsWith('INVINCIBLE')}
                      />
                      
                      {/* Tier Roman Numeral overlay for streak badges */}
                      {getRomanNumeral(badge.key) && (
                        <div className={`absolute -bottom-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border backdrop-blur-md ${
                          badge.key.endsWith('_3') 
                            ? 'bg-red-950/80 text-red-400 border-red-500/30'
                            : badge.key.endsWith('_2')
                            ? 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                            : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                        }`}>
                          TIER {getRomanNumeral(badge.key)}
                        </div>
                      )}

                      {/* Subtle hover backlight glow for unlocked badges */}
                      {unlocked && (
                        <div 
                          className="absolute inset-0 blur-lg rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
                          style={{ backgroundColor: glowColor }}
                        ></div>
                      )}
                    </div>

                    {/* Badge Details */}
                    <div className="w-full z-10">
                      <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mx-auto mb-2.5 ${tierColor}`}>
                        {badge.tier}
                      </div>
                      <h3 className={`text-sm font-semibold tracking-tight leading-snug line-clamp-1 ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                        {badge.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 leading-normal font-medium">
                        {unlocked ? 'Unlocked' : 'Locked'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-neutral-900/40 border border-white/10 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.5)] animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                XP Progression Audit Ledger
                <span className="text-xs font-semibold text-gray-500 font-mono ml-2">({team.xpHistory.length} logs)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-2xl">
                Detailed audit trace of every single experience point (XP) awarded to the manager. All XP sources are verified and validated directly against final scorelines.
              </p>
            </div>

            {team.xpHistory.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl bg-black/20">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-300">No Ledger Logs Available</h3>
                <p className="text-xs text-gray-500 mt-1">This team has not yet completed any matches in the current season.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40">
                <table className="w-full border-collapse text-left text-sm text-gray-300 font-sans">
                  <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-gray-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-4 font-semibold">XP Source</th>
                      <th className="px-6 py-4 font-semibold">Details</th>
                      <th className="px-6 py-4 font-semibold text-right">Points</th>
                      <th className="px-6 py-4 font-semibold text-right">Earned Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {team.xpHistory.map(log => {
                      let typeLabelColor = 'text-gray-400 bg-gray-900/40 border-gray-800';
                      if (log.xpType === 'MATCH_WON') typeLabelColor = 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/20';
                      if (log.xpType === 'GOAL_SCORED') typeLabelColor = 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/20';
                      if (log.xpType === 'BADGE_UNLOCKED') typeLabelColor = 'text-amber-400 bg-amber-950/20 border border-amber-500/20';
                      if (log.xpType === 'MATCH_PLAYED') typeLabelColor = 'text-blue-400 bg-blue-950/20 border border-blue-500/20';

                      return (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${typeLabelColor}`}>
                              {log.xpType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 leading-normal text-xs text-gray-300 font-medium">
                            {log.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-black font-mono text-cyan-400">
                            +{log.amount} XP
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-500 font-mono">
                            {new Date(log.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Interactive Detail Modal Popup */}
        {isModalOpen && selectedBadge && typeof document !== 'undefined' && createPortal(
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center px-4 backdrop-blur-md bg-black/75 transition-all duration-300 cursor-pointer animate-[fadeIn_0.2s_ease-out]"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-[#0d0d10] border border-white/10 p-6 md:p-8 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] cursor-default animate-[slideDown_0.3s_cubic-bezier(0.16,1,0.3,1)]"
              style={{ 
                boxShadow: `0 0 50px ${getTierGlowColor(selectedBadge.tier)}15`,
              }}
            >
              {/* Aura Background Glow inside modal */}
              <div 
                className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none"
                style={{ backgroundColor: getTierGlowColor(selectedBadge.tier) }}
              ></div>

              {/* Close Button */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Contents */}
              <div className="flex flex-col items-center text-center relative z-10 pt-4">
                {/* Big Glowing Image (ALWAYS IN FULL COLOR) */}
                <div className="relative h-28 w-28 mb-6 flex items-center justify-center">
                  <Image
                    src={selectedBadge.image}
                    alt={selectedBadge.name}
                    width={112}
                    height={112}
                    className="object-contain"
                    style={getBadgeImageFilter(selectedBadge.key, true)}
                  />
                  {getRomanNumeral(selectedBadge.key) && (
                    <div className={`absolute -bottom-2 px-3 py-1 rounded text-[10px] font-extrabold tracking-widest border backdrop-blur-md ${
                      selectedBadge.key.endsWith('_3') 
                        ? 'bg-red-950/80 text-red-400 border-red-500/30'
                        : selectedBadge.key.endsWith('_2')
                        ? 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                        : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                    }`}>
                      TIER {getRomanNumeral(selectedBadge.key)}
                    </div>
                  )}
                  {unlockedMap.get(selectedBadge.key) && (
                    <div 
                      className="absolute inset-0 blur-2xl rounded-full opacity-40 pointer-events-none"
                      style={{ backgroundColor: getTierGlowColor(selectedBadge.tier) }}
                    ></div>
                  )}
                </div>

                {/* Tier Badge */}
                <div className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 ${getTierColorClass(selectedBadge.tier)}`}>
                  {selectedBadge.tier} Badge
                </div>

                {/* Name */}
                <h3 className="text-2xl font-bold tracking-tight mb-2 text-white">
                  {selectedBadge.name}
                </h3>

                {/* XP bounty */}
                <div className="text-cyan-400 text-sm font-semibold mb-6 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  +{selectedBadge.xpAward} XP Reward
                </div>

                {/* Divider */}
                <div className="w-full h-[1px] bg-white/5 mb-6"></div>

                {/* Description Box */}
                <div className="w-full bg-white/[0.01] border border-white/5 rounded-xl p-4 mb-6">
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest text-left mb-1 font-bold">Requirement</h4>
                  <p className="text-sm text-gray-300 text-left leading-relaxed">
                    {selectedBadge.description}
                  </p>
                </div>

                {/* Unlocked Details */}
                {unlockedMap.get(selectedBadge.key) ? (
                  <div className="w-full text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                      </svg>
                      Earned on {new Date(unlockedMap.get(selectedBadge.key)!.unlockedAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] text-gray-500 border border-white/5 rounded-lg text-xs font-medium">
                      <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 00-2.25 2.25z" />
                      </svg>
                      Not Yet Unlocked
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>

      {/* Standard Style animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}} />
    </div>
  );
}
