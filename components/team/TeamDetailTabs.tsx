'use client'

import { useState } from 'react'
import Link from 'next/link'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'
import ReadonlySquadFormation from '@/components/team/ReadonlySquadFormation'

interface Team {
  id: string
  name: string
  logoUrl: string
  managerName: string
}

interface Player {
  id: string
  playerId?: string
  name: string
  photoUrl: string
  position: string
  position_group?: string | null
  overallRating: number
  realWorldClub: string
  soldPrice: number
}

interface CurrentSeason {
  id: string
  playerCount: number
  totalSpent: number
  averageRating: number
  remainingBudget: number
  positionCounts: Record<string, number>
  squad: Record<string, Player[]>
  formation?: any
  tournaments?: any[]
}

interface HistoricalSeason {
  seasonId: string
  seasonName: string
  startingPurse: number
  finalBudget: number | null
  currentBudget: number
  trophiesWon: number
  played?: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDiff?: number
  points?: number
}

interface TeamDetailTabsProps {
  team: Team
  currentSeason: CurrentSeason
  historicalSeasons: HistoricalSeason[]
  seasonId: string
  viewerRole?: 'team' | 'admin' // Determines which routes to use for player links
}

type Tab = 'season' | 'overall'
type SeasonSubTab = 'stats' | 'squad' | 'formation' | 'tournaments'

export default function TeamDetailTabs({
  team,
  currentSeason,
  historicalSeasons,
  seasonId,
  viewerRole = 'admin' // Default to admin for backward compatibility
}: TeamDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('season')
  const [seasonSubTab, setSeasonSubTab] = useState<SeasonSubTab>('tournaments')

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
  }

  // Generate player detail URL based on viewer role
  const getPlayerUrl = (playerId: string) => {
    if (viewerRole === 'team') {
      return `/team/players/${playerId}`
    }
    return `/sub-admin/${seasonId}/all-players/${playerId}`
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const positionOrder = [
    'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LMF', 'RMF', 'LWF', 'RWF', 'SS', 'CF'
  ]
  const getPositionSortIndex = (pos: string) => {
    const idx = positionOrder.indexOf(pos.toUpperCase())
    return idx === -1 ? 99 : idx
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Main Tabs (Glassmorphic) */}
      <div className="flex gap-3 overflow-x-auto p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl w-fit">
        <button
          onClick={() => setActiveTab('season')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
            activeTab === 'season'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_25px_rgba(232,168,0,0.3)]'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
          </svg>
          Current Season
        </button>
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
            activeTab === 'overall'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_0_25px_rgba(232,168,0,0.3)]'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overall History
        </button>
      </div>

      {/* Season Sub-Tabs (Pill Glass design) */}
      {activeTab === 'season' && (
        <div className="flex gap-2 overflow-x-auto pl-1">
          <button
            onClick={() => setSeasonSubTab('tournaments')}
            className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'tournaments'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Tournaments
          </button>
          <button
            onClick={() => setSeasonSubTab('squad')}
            className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'squad'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Squad List ({currentSeason.playerCount})
          </button>
          <button
            onClick={() => setSeasonSubTab('formation')}
            className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'formation'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Starting 11
          </button>
          <button
            onClick={() => setSeasonSubTab('stats')}
            className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'stats'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Budget & Auction Stats
          </button>
        </div>
      )}

      {/* Main Panel Content (Glassmorphic Container) */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {activeTab === 'season' && seasonSubTab === 'stats' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-xl font-black text-white tracking-tight">Franchise Budget & Auction Stats</h3>
            
            {/* Financial Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-black/40 border border-white/5 p-6 hover:border-[#FFB347]/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB347]/5 rounded-full blur-2xl group-hover:bg-[#FFB347]/10 transition-colors pointer-events-none"></div>
                <div className="text-xs font-bold text-[#7A7367] uppercase tracking-wider mb-2">Total Spent</div>
                <div className="text-3xl font-black text-[#FFB347] font-mono">
                  {formatCurrency(currentSeason.totalSpent)}
                </div>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/5 p-6 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
                <div className="text-xs font-bold text-[#7A7367] uppercase tracking-wider mb-2">Remaining Budget</div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(currentSeason.remainingBudget)}
                </div>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl group-hover:bg-[#E8A800]/10 transition-colors pointer-events-none"></div>
                <div className="text-xs font-bold text-[#7A7367] uppercase tracking-wider mb-2">Average Rating</div>
                <div className="text-3xl font-black text-[#E8A800] font-mono">
                  {currentSeason.averageRating} <span className="text-xs font-medium text-gray-500">OVR</span>
                </div>
              </div>
            </div>

            {/* Squad Composition */}
            <div className="border-t border-white/5 pt-8">
              <h4 className="text-lg font-black text-white mb-6 tracking-tight">Squad Composition</h4>
              {Object.keys(currentSeason.positionCounts).length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">No positions registered yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(currentSeason.positionCounts)
                    .sort(([a], [b]) => getPositionSortIndex(a) - getPositionSortIndex(b))
                    .map(([position, count]) => {
                      const posColor = getPositionColor(position).split(' ');
                      const bg = posColor[0];
                      const border = posColor[1];
                      const text = posColor[2];

                      return (
                        <div
                          key={position}
                          className={`rounded-xl border p-4 text-center transition-all duration-300 hover:scale-[1.03] ${bg} ${border}`}
                        >
                          <div className="font-extrabold text-2xl text-white font-mono">{count}</div>
                          <div className={`text-xs font-black uppercase mt-1.5 ${text}`}>{position}</div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'squad' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white tracking-tight">Active Season Roster</h3>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                {currentSeason.playerCount} Players
              </span>
            </div>
            
            {Object.keys(currentSeason.squad).length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-black/20">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-gray-400 font-bold mb-2">No players in squad</div>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">You haven&apos;t won or assigned any players to your squad roster for the current active season yet.</p>
                <Link
                  href={viewerRole === 'team' ? '/team/auction' : `/sub-admin/${seasonId}/auction`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-xl font-extrabold text-sm hover:scale-[1.03] transition-all cursor-pointer shadow-lg"
                >
                  Go to Live Auction
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(currentSeason.squad)
                  .sort(([a], [b]) => getPositionSortIndex(a) - getPositionSortIndex(b))
                  .map(([position, players]) => {
                    const posColor = getPositionColor(position).split(' ');
                    const textClass = posColor[2];

                    return (
                      <div key={position} className="space-y-4">
                        <h4 className={`text-md font-black uppercase tracking-wider flex items-center gap-2 ${textClass}`}>
                          <span className="w-1.5 h-3 bg-current rounded-full"></span>
                          {position} <span className="text-xs font-normal text-gray-500 font-mono">({players.length})</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {players
                            .sort((a, b) => b.overallRating - a.overallRating)
                            .map((player) => (
                            <Link
                              key={player.id}
                              href={getPlayerUrl(player.playerId || player.id)}
                              className="rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/20 hover:bg-white/[0.02] transition-all duration-300 p-4 group flex items-center gap-4 relative overflow-hidden"
                            >
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-900 border border-white/10 flex-shrink-0">
                                <img
                                  src={player.photoUrl}
                                  alt={player.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-white group-hover:text-cyan-400 transition-colors duration-200 truncate text-sm">
                                  {player.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {player.realWorldClub}
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[11px] font-black text-[#E8A800] bg-[#E8A800]/5 px-2 py-0.5 rounded border border-[#E8A800]/10 font-mono">
                                    {player.overallRating} OVR
                                  </span>
                                  <PositionGroupBadge position={player.position} group={player.position_group} size="sm" />
                                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono">
                                    £{player.soldPrice.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Corner Link Hover Glow */}
                              <div className="absolute top-3 right-3 text-gray-600 group-hover:text-cyan-400 transition-colors pointer-events-none">
                                <svg className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'formation' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-xl font-black text-white tracking-tight">Starting 11 Formation</h3>
            <div className="rounded-2xl border border-white/5 bg-black/40 overflow-hidden shadow-inner">
              <ReadonlySquadFormation 
                formation={currentSeason.formation} 
                allPlayers={Object.values(currentSeason.squad).flat()}
              />
            </div>
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'tournaments' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-xl font-black text-white tracking-tight">Tournament Standings & Performance</h3>
            
            {!currentSeason.tournaments || currentSeason.tournaments.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-black/20 text-gray-500">
                No active tournament entries registered for this season.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentSeason.tournaments.map((t: any) => (
                  <div key={t.id} className="rounded-2xl bg-black/40 border border-white/5 p-6 hover:border-white/10 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h4 className="font-extrabold text-lg text-white mb-1.5 tracking-tight">{t.tournament.name}</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                            {t.tournament.tournamentType.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-extrabold border ${
                            t.tournament.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            t.tournament.status === 'ONGOING' ? 'bg-[#E8A800]/10 text-[#E8A800] border-[#E8A800]/20' :
                            'bg-gray-500/10 text-gray-400 border-white/10'
                          }`}>
                            {t.tournament.status}
                          </span>
                        </div>
                      </div>
                      {t.groupName && (
                        <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase font-mono">
                          Group {t.groupName}
                        </div>
                      )}
                    </div>
                    
                    {/* W / D / L Box */}
                    <div className="grid grid-cols-4 gap-3 text-center mb-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Played</div>
                        <div className="font-extrabold text-white text-lg font-mono">{t.played}</div>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <div className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-wider mb-1">Won</div>
                        <div className="font-extrabold text-emerald-400 text-lg font-mono">{t.won}</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Drawn</div>
                        <div className="font-extrabold text-white text-lg font-mono">{t.drawn}</div>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                        <div className="text-[10px] text-red-500/60 font-bold uppercase tracking-wider mb-1">Lost</div>
                        <div className="font-extrabold text-red-400 text-lg font-mono">{t.lost}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-4">
                      <div className="flex gap-4 text-gray-500 font-semibold font-mono">
                        <span>GF: <span className="text-white">{t.goalsFor}</span></span>
                        <span>GA: <span className="text-white">{t.goalsAgainst}</span></span>
                        <span>GD: <span className={t.goalDiff >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                        </span></span>
                      </div>
                      <div className="font-black text-[#E8A800] text-xl font-mono flex items-baseline gap-1">
                        {t.points} <span className="text-xs font-normal text-gray-500">pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overall' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-xl font-black text-white tracking-tight">Historical Franchise Cabinet</h3>
            
            {historicalSeasons.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-black/20 text-gray-500">
                No historical records registered.
              </div>
            ) : (
              <div className="space-y-6">
                {historicalSeasons.map((season) => (
                  <div
                    key={season.seasonId}
                    className="rounded-2xl bg-black/40 border border-white/5 p-6 hover:border-white/10 transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div>
                        <h4 className="font-extrabold text-white text-lg tracking-tight mb-1.5">{season.seasonName}</h4>
                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">
                          Starting Purse: {formatCurrency(season.startingPurse)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
                        <div className="text-center min-w-[70px]">
                          <div className="text-sm font-extrabold text-emerald-400 font-mono">
                            {formatCurrency(season.currentBudget)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Current</div>
                        </div>
                        
                        {season.finalBudget !== null && (
                          <div className="text-center min-w-[70px]">
                            <div className="text-sm font-extrabold text-purple-400 font-mono">
                              {formatCurrency(season.finalBudget)}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Final</div>
                          </div>
                        )}
                        
                        {season.trophiesWon > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8A800]/15 border border-[#E8A800]/30 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]">
                            <svg className="w-4 h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="font-extrabold text-sm font-mono">{season.trophiesWon} Won</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Standings Stats Grid */}
                    {season.played !== undefined && season.played > 0 && (
                      <div className="mt-5 grid grid-cols-4 gap-2 text-center sm:grid-cols-8 border-t border-white/5 pt-5">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Played</div>
                          <div className="font-extrabold text-white text-sm font-mono">{season.played}</div>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5">
                          <div className="text-[10px] text-emerald-500/60 uppercase tracking-wider mb-1 font-bold">Won</div>
                          <div className="font-extrabold text-emerald-400 text-sm font-mono">{season.won}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Drawn</div>
                          <div className="font-extrabold text-white text-sm font-mono">{season.drawn}</div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2.5">
                          <div className="text-[10px] text-red-500/60 uppercase tracking-wider mb-1 font-bold">Lost</div>
                          <div className="font-extrabold text-red-400 text-sm font-mono">{season.lost}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">GF</div>
                          <div className="font-extrabold text-white text-sm font-mono">{season.goalsFor}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">GA</div>
                          <div className="font-extrabold text-white text-sm font-mono">{season.goalsAgainst}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">GD</div>
                          <div className="font-extrabold text-white text-sm font-mono">
                            {season.goalDiff !== undefined && season.goalDiff > 0 ? `+${season.goalDiff}` : season.goalDiff}
                          </div>
                        </div>
                        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-2.5">
                          <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1 font-bold">Points</div>
                          <div className="font-extrabold text-cyan-400 text-sm font-mono">{season.points}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}