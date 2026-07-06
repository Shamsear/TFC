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

interface SeasonDetail {
  seasonId: string
  seasonName: string
  startingPurse: number
  finalBudget: number | null
  currentBudget: number
  trophiesWon: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  // Full season details
  playerCount: number
  totalSpent: number
  averageRating: number
  remainingBudget: number
  positionCounts: Record<string, number>
  squad: Record<string, Player[]>
  formation?: any
  tournaments: any[]
}

interface TeamDetailTabsProps {
  team: Team
  seasons: SeasonDetail[]
  seasonId?: string
  viewerRole?: 'team' | 'admin' | 'public'
}

type SeasonSubTab = 'stats' | 'squad' | 'formation' | 'tournaments'

export default function TeamDetailTabs({
  team,
  seasons,
  seasonId,
  viewerRole = 'admin'
}: TeamDetailTabsProps) {
  // Sort seasons in descending order (e.g., Season 4, Season 3, Season 2, Season 1)
  const sortedSeasons = [...seasons].sort((a, b) => {
    const numA = parseInt(a.seasonName.match(/\d+/)?.[0] || '0', 10)
    const numB = parseInt(b.seasonName.match(/\d+/)?.[0] || '0', 10)
    if (numA !== numB) {
      return numB - numA // Descending
    }
    return b.seasonId.localeCompare(a.seasonId)
  })

  // Default to the most recent season if available, otherwise 'overall'
  const [activeTab, setActiveTab] = useState<string>(sortedSeasons[0]?.seasonId || 'overall')
  const [seasonSubTab, setSeasonSubTab] = useState<SeasonSubTab>('tournaments')

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
  }

  const selectedSeason = seasons.find(s => s.seasonId === activeTab)

  // Generate player detail URL based on viewer role
  const getPlayerUrl = (playerId: string) => {
    if (viewerRole === 'team') {
      return `/team/players/${playerId}`
    }
    if (viewerRole === 'public') {
      return `/players/${playerId}`
    }
    const resolvedSeasonId = ['TFCS-1', 'TFCS-2', 'TFCS-3'].includes(activeTab) ? 'TFCS-4' : activeTab
    return `/sub-admin/${resolvedSeasonId}/all-players/${playerId}`
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
      {/* Main Tabs (Glassmorphic Scrollable) */}
      <div className="flex gap-3 overflow-x-auto p-1.5 bg-[#0D0D0D]/95 border border-white/5 rounded-2xl backdrop-blur-xl w-full sm:w-fit custom-scrollbar shadow-2xl">
        <button
          onClick={() => {
            setActiveTab('overall')
            setSeasonSubTab('tournaments')
          }}
          className={`px-5 py-2.5 rounded-xl font-black text-xs font-mono uppercase tracking-widest transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
            activeTab === 'overall'
              ? 'bg-[#E8A800] text-black shadow-[0_0_20px_rgba(232,168,0,0.2)]'
              : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overall History
        </button>

        {sortedSeasons.map((s) => (
          <button
            key={s.seasonId}
            onClick={() => {
              setActiveTab(s.seasonId)
              setSeasonSubTab('tournaments')
            }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs font-mono uppercase tracking-widest transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2 ${
              activeTab === s.seasonId
                ? 'bg-[#E8A800] text-black shadow-[0_0_20px_rgba(232,168,0,0.2)]'
                : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
            {s.seasonName}
          </button>
        ))}
      </div>

      {/* Season Sub-Tabs (Pill Glass design) */}
      {activeTab !== 'overall' && selectedSeason && (
        <div className="flex gap-2 overflow-x-auto pl-1 custom-scrollbar">
          <button
            onClick={() => setSeasonSubTab('tournaments')}
            className={`px-4 py-2 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'tournaments'
                ? 'bg-[#E8A800]/10 border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                : 'bg-white/[0.01] border-white/5 text-gray-500 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Tournaments
          </button>
          <button
            onClick={() => setSeasonSubTab('squad')}
            className={`px-4 py-2 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'squad'
                ? 'bg-[#E8A800]/10 border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                : 'bg-white/[0.01] border-white/5 text-gray-500 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Squad List ({selectedSeason.playerCount})
          </button>
          {!['TFCS-1', 'TFCS-2', 'TFCS-3'].includes(activeTab) && (
            <button
              onClick={() => setSeasonSubTab('formation')}
              className={`px-4 py-2 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
                seasonSubTab === 'formation'
                  ? 'bg-[#E8A800]/10 border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                  : 'bg-white/[0.01] border-white/5 text-gray-500 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              Starting 11
            </button>
          )}
          <button
            onClick={() => setSeasonSubTab('stats')}
            className={`px-4 py-2 rounded-xl font-black text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
              seasonSubTab === 'stats'
                ? 'bg-[#E8A800]/10 border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                : 'bg-white/[0.01] border-white/5 text-gray-500 hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            Budget & Auction Stats
          </button>
        </div>
      )}

      {/* Main Panel Content (Glassmorphic Container) */}
      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {activeTab !== 'overall' && seasonSubTab === 'stats' && selectedSeason && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Franchise Budget & Auction Stats</h3>
            
            {/* Financial Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
              <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl group-hover:bg-[#E8A800]/10 transition-colors pointer-events-none"></div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Spent</div>
                <div className="text-3xl font-black text-[#FFB347] font-mono">
                  {formatCurrency(selectedSeason.totalSpent)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Remaining Budget</div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(selectedSeason.remainingBudget)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl group-hover:bg-[#E8A800]/10 transition-colors pointer-events-none"></div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Average Rating</div>
                <div className="text-3xl font-black text-[#E8A800] font-mono">
                  {selectedSeason.averageRating} <span className="text-xs font-medium text-gray-500">OVR</span>
                </div>
              </div>
            </div>

            {/* Squad Composition */}
            <div className="border-t border-white/5 pt-8">
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono mb-6">Squad Composition</h4>
              {Object.keys(selectedSeason.positionCounts).length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs font-mono uppercase tracking-widest">No positions registered yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(selectedSeason.positionCounts)
                    .sort(([a], [b]) => getPositionSortIndex(a) - getPositionSortIndex(b))
                    .map(([position, count]) => {
                      const posColor = getPositionColor(position).split(' ');
                      const bg = posColor[0];
                      const border = posColor[1];
                      const text = posColor[2];

                      return (
                        <div
                          key={position}
                          className={`rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-[1.03] ${bg} ${border}`}
                        >
                          <div className="font-extrabold text-2xl text-white font-mono">{count}</div>
                          <div className={`text-[10px] font-black uppercase mt-1.5 font-mono ${text}`}>{position}</div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab !== 'overall' && seasonSubTab === 'squad' && selectedSeason && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Active Season Roster</h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#E8A800]/10 text-[#E8A800] text-[10px] font-black border border-[#E8A800]/25 font-mono">
                {selectedSeason.playerCount} Players
              </span>
            </div>
            
            {Object.keys(selectedSeason.squad).length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-3xl bg-black/20">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-gray-500 font-bold uppercase tracking-wider text-xs font-mono mb-2">No players in squad</div>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest font-mono max-w-sm mx-auto">There are no active players registered for this season.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(selectedSeason.squad)
                  .sort(([a], [b]) => getPositionSortIndex(a) - getPositionSortIndex(b))
                  .map(([position, players]) => {
                    const posColor = getPositionColor(position).split(' ');
                    const textClass = posColor[2];

                    return (
                      <div key={position} className="space-y-4">
                        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 font-mono ${textClass}`}>
                          <span className="w-1.5 h-3 bg-current rounded-full"></span>
                          {position} <span className="text-[10px] font-normal text-gray-600 font-mono">({players.length})</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {players
                            .sort((a, b) => b.overallRating - a.overallRating)
                            .map((player) => (
                            <Link
                              key={player.id}
                              href={getPlayerUrl(player.id)}
                              className="rounded-3xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/30 hover:bg-white/[0.02] transition-all duration-300 p-4 group flex items-center gap-4 relative overflow-hidden shadow-2xl"
                            >
                              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
                                <img
                                  src={player.photoUrl || '/default-player.png'}
                                  alt={player.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-white uppercase font-mono tracking-tight group-hover:text-[#E8A800] transition-colors duration-200 truncate text-sm">
                                  {player.name}
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono truncate mt-0.5">
                                  {player.realWorldClub}
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[9px] font-black text-[#E8A800] bg-[#E8A800]/5 px-2 py-0.5 rounded border border-[#E8A800]/10 font-mono">
                                    {player.overallRating} OVR
                                  </span>
                                  <PositionGroupBadge position={player.position} group={player.position_group} size="sm" />
                                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono">
                                    £{player.soldPrice.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="absolute top-3 right-3 text-gray-600 group-hover:text-[#E8A800] transition-colors pointer-events-none">
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

        {activeTab !== 'overall' && seasonSubTab === 'formation' && !['TFCS-1', 'TFCS-2', 'TFCS-3'].includes(activeTab) && selectedSeason && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Starting 11 Formation</h3>
            <div className="rounded-3xl border border-white/5 bg-black/40 overflow-hidden shadow-inner">
              <ReadonlySquadFormation 
                formation={selectedSeason.formation} 
                allPlayers={Object.values(selectedSeason.squad).flat()}
              />
            </div>
          </div>
        )}

        {activeTab !== 'overall' && seasonSubTab === 'tournaments' && selectedSeason && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Tournament Standings & Performance</h3>
            
            {!selectedSeason.tournaments || selectedSeason.tournaments.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-3xl bg-black/20 text-gray-500 font-mono text-xs uppercase tracking-widest">
                No tournament entries registered for this season.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedSeason.tournaments.map((t: any) => (
                  <div key={t.id} className="rounded-3xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h4 className="font-extrabold text-sm text-white uppercase tracking-tight font-mono mb-1.5">{t.tournament.name}</h4>
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider font-bold">
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
                        <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase font-mono">
                          Group {t.groupName}
                        </div>
                      )}
                    </div>
                    
                    {/* W / D / L Box */}
                    <div className="grid grid-cols-4 gap-3 text-center mb-6 font-mono">
                      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Played</div>
                        <div className="font-extrabold text-white text-lg">{t.played}</div>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <div className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-wider mb-1">Won</div>
                        <div className="font-extrabold text-emerald-400 text-lg">{t.won}</div>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Drawn</div>
                        <div className="font-extrabold text-white text-lg">{t.drawn}</div>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                        <div className="text-[9px] text-red-500/60 font-bold uppercase tracking-wider mb-1">Lost</div>
                        <div className="font-extrabold text-red-400 text-lg">{t.lost}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-4">
                      <div className="flex gap-4 text-gray-500 font-semibold font-mono text-[10px] uppercase">
                        <span>GF: <span className="text-white">{t.goalsFor}</span></span>
                        <span>GA: <span className="text-white">{t.goalsAgainst}</span></span>
                        <span>GD: <span className={t.goalDiff >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                        </span></span>
                      </div>
                      <div className="font-black text-[#E8A800] text-xl font-mono flex items-baseline gap-1">
                        {t.points} <span className="text-xs font-normal text-gray-500 font-mono">pts</span>
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
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Historical Franchise Cabinet</h3>
            
            {sortedSeasons.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-3xl bg-black/20 text-gray-500 font-mono text-xs uppercase tracking-widest">
                No historical records registered.
              </div>
            ) : (
              <div className="space-y-6">
                {sortedSeasons.map((s) => (
                  <div
                    key={s.seasonId}
                    className="rounded-3xl bg-white/[0.01] border border-white/5 p-6 hover:border-[#E8A800]/30 transition-all duration-300 shadow-2xl"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div>
                        <h4 className="font-extrabold text-white text-sm uppercase tracking-tight font-mono mb-1.5">{s.seasonName}</h4>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-mono">
                          Starting Purse: {formatCurrency(s.startingPurse)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
                        <div className="text-center min-w-[70px]">
                          <div className="text-sm font-extrabold text-emerald-400 font-mono">
                            {formatCurrency(s.currentBudget)}
                          </div>
                          <div className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-wider font-mono">Current</div>
                        </div>
                        
                        {s.finalBudget !== null && (
                          <div className="text-center min-w-[70px]">
                            <div className="text-sm font-extrabold text-purple-400 font-mono">
                              {formatCurrency(s.finalBudget)}
                            </div>
                            <div className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-wider font-mono">Final</div>
                          </div>
                        )}
                        
                        {s.trophiesWon > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]">
                            <svg className="w-4 h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="font-extrabold text-xs font-mono">{s.trophiesWon} Won</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Standings Stats Grid */}
                    {s.played !== undefined && s.played > 0 && (
                      <div className="mt-5 grid grid-cols-4 gap-2 text-center sm:grid-cols-8 border-t border-white/5 pt-5">
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold font-mono">Played</div>
                          <div className="font-extrabold text-white text-sm font-mono">{s.played}</div>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5">
                          <div className="text-[9px] text-emerald-500/60 uppercase tracking-wider mb-1 font-bold font-mono">Won</div>
                          <div className="font-extrabold text-emerald-400 text-sm font-mono">{s.won}</div>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold font-mono">Drawn</div>
                          <div className="font-extrabold text-white text-sm font-mono">{s.drawn}</div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2.5">
                          <div className="text-[9px] text-red-500/60 uppercase tracking-wider mb-1 font-bold font-mono">Lost</div>
                          <div className="font-extrabold text-red-400 text-sm font-mono">{s.lost}</div>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold font-mono">GF</div>
                          <div className="font-extrabold text-white text-sm font-mono">{s.goalsFor}</div>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold font-mono">GA</div>
                          <div className="font-extrabold text-white text-sm font-mono">{s.goalsAgainst}</div>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold font-mono">GD</div>
                          <div className="font-extrabold text-white text-sm font-mono">
                            {s.goalDiff !== undefined && s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                          </div>
                        </div>
                        <div className="bg-[#E8A800]/5 border border-[#E8A800]/10 rounded-xl p-2.5">
                          <div className="text-[9px] text-[#E8A800] uppercase tracking-wider mb-1 font-bold font-mono">Points</div>
                          <div className="font-extrabold text-[#E8A800] text-sm font-mono">{s.points}</div>
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