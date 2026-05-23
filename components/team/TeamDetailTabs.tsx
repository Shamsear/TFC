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
}

interface TeamDetailTabsProps {
  team: Team
  currentSeason: CurrentSeason
  historicalSeasons: HistoricalSeason[]
  seasonId: string
}

type Tab = 'season' | 'overall'
type SeasonSubTab = 'stats' | 'squad' | 'formation' | 'tournaments'

export default function TeamDetailTabs({
  team,
  currentSeason,
  historicalSeasons,
  seasonId
}: TeamDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('season')
  const [seasonSubTab, setSeasonSubTab] = useState<SeasonSubTab>('stats')

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
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

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('season')}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'season'
              ? 'bg-[#E8A800] text-[#0a0a0a]'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Current Season
        </button>
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'overall'
              ? 'bg-[#E8A800] text-[#0a0a0a]'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Overall History
        </button>
      </div>

      {/* Season Sub-Tabs */}
      {activeTab === 'season' && (
        <div className="flex gap-2 overflow-x-auto pl-4">
          <button
            onClick={() => setSeasonSubTab('stats')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              seasonSubTab === 'stats'
                ? 'bg-[#E8A800]/20 border-2 border-[#E8A800] text-[#E8A800]'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setSeasonSubTab('squad')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              seasonSubTab === 'squad'
                ? 'bg-[#E8A800]/20 border-2 border-[#E8A800] text-[#E8A800]'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Squad List ({currentSeason.playerCount})
          </button>
          <button
            onClick={() => setSeasonSubTab('formation')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              seasonSubTab === 'formation'
                ? 'bg-[#E8A800]/20 border-2 border-[#E8A800] text-[#E8A800]'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Starting 11
          </button>
          <button
            onClick={() => setSeasonSubTab('tournaments')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              seasonSubTab === 'tournaments'
                ? 'bg-[#E8A800]/20 border-2 border-[#E8A800] text-[#E8A800]'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Tournaments
          </button>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6">
        {activeTab === 'season' && seasonSubTab === 'stats' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white mb-4">Season Statistics</h3>
            
            {/* Financial Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                <div className="text-sm text-[#7A7367] mb-2">Total Spent</div>
                <div className="text-2xl font-black text-[#FFB347]">
                  {formatCurrency(currentSeason.totalSpent)}
                </div>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                <div className="text-sm text-[#7A7367] mb-2">Remaining Budget</div>
                <div className="text-2xl font-black text-emerald-400">
                  {formatCurrency(currentSeason.remainingBudget)}
                </div>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                <div className="text-sm text-[#7A7367] mb-2">Average Rating</div>
                <div className="text-2xl font-black text-[#E8A800]">
                  {currentSeason.averageRating}
                </div>
              </div>
            </div>

            {/* Squad Composition */}
            <div>
              <h4 className="text-lg font-black text-white mb-4">Squad Composition</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(currentSeason.positionCounts)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([position, count]) => (
                  <div
                    key={position}
                    className={`rounded-lg border p-3 text-center ${getPositionColor(position)}`}
                  >
                    <div className="font-bold text-lg">{count}</div>
                    <div className="text-xs opacity-80">{position}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'squad' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white mb-4">Current Squad</h3>
            
            {Object.keys(currentSeason.squad).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-[#7A7367] mb-4">No players in squad</div>
                <Link
                  href={`/sub-admin/${seasonId}/auction`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A800] text-[#0a0a0a] rounded-lg font-bold hover:bg-[#FFC93A] transition-all"
                >
                  Go to Auction
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(currentSeason.squad)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([position, players]) => (
                  <div key={position}>
                    <h4 className={`text-lg font-black mb-3 ${getPositionColor(position).split(' ')[2]}`}>
                      {position} ({players.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {players
                        .sort((a, b) => b.overallRating - a.overallRating)
                        .map((player) => (
                        <Link
                          key={player.id}
                          href={`/sub-admin/${seasonId}/all-players/${player.id}`}
                          className="rounded-xl bg-black/30 border border-white/5 hover:border-[#E8A800]/30 hover:bg-black/50 transition-all p-4 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                              <img
                                src={player.photoUrl}
                                alt={player.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white group-hover:text-[#E8A800] transition-colors truncate">
                                {player.name}
                              </div>
                              <div className="text-xs text-[#7A7367] truncate">
                                {player.realWorldClub}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-bold text-[#E8A800]">
                                  {player.overallRating} OVR
                                </span>
                                <PositionGroupBadge position={player.position} group={player.position_group} size="sm" />
                                <span className="text-xs font-bold text-emerald-400">
                                  £{player.soldPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'formation' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white mb-4">Formation</h3>
            <ReadonlySquadFormation 
              formation={currentSeason.formation} 
              allPlayers={Object.values(currentSeason.squad).flat()}
            />
          </div>
        )}

        {activeTab === 'season' && seasonSubTab === 'tournaments' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white mb-4">Tournament Performances</h3>
            
            {!currentSeason.tournaments || currentSeason.tournaments.length === 0 ? (
              <div className="text-center py-12 text-[#7A7367] bg-black/30 rounded-xl border border-white/5">
                No tournament data available for this season.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSeason.tournaments.map((t: any) => (
                  <div key={t.id} className="rounded-xl bg-black/30 border border-white/5 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-white mb-1">{t.tournament.name}</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300">
                            {t.tournament.tournamentType.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            t.tournament.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            t.tournament.status === 'ONGOING' ? 'bg-[#E8A800]/20 text-[#E8A800]' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {t.tournament.status}
                          </span>
                        </div>
                      </div>
                      {t.groupName && (
                        <div className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-bold">
                          Group {t.groupName}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-xs text-[#7A7367] mb-1">P</div>
                        <div className="font-bold">{t.played}</div>
                      </div>
                      <div className="bg-emerald-500/10 rounded-lg p-2">
                        <div className="text-xs text-emerald-500/70 mb-1">W</div>
                        <div className="font-bold text-emerald-400">{t.won}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-xs text-[#7A7367] mb-1">D</div>
                        <div className="font-bold">{t.drawn}</div>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-2">
                        <div className="text-xs text-red-500/70 mb-1">L</div>
                        <div className="font-bold text-red-400">{t.lost}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                      <div className="flex gap-4 text-[#7A7367]">
                        <span>GF: <span className="text-white font-medium">{t.goalsFor}</span></span>
                        <span>GA: <span className="text-white font-medium">{t.goalsAgainst}</span></span>
                        <span>GD: <span className="text-white font-medium">{t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}</span></span>
                      </div>
                      <div className="font-black text-[#E8A800] text-xl">
                        {t.points} <span className="text-sm font-medium text-[#7A7367]">pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overall' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white mb-4">Historical Performance</h3>
            
            {historicalSeasons.length === 0 ? (
              <div className="text-center py-12 text-[#7A7367]">
                No historical data available
              </div>
            ) : (
              <div className="space-y-4">
                {historicalSeasons.map((season) => (
                  <div
                    key={season.seasonId}
                    className="rounded-xl bg-black/30 border border-white/5 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-white mb-1">{season.seasonName}</h4>
                        <div className="text-sm text-[#7A7367]">
                          Starting Purse: {formatCurrency(season.startingPurse)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm font-bold text-emerald-400">
                            {formatCurrency(season.currentBudget)}
                          </div>
                          <div className="text-xs text-[#7A7367]">Current</div>
                        </div>
                        
                        {season.finalBudget !== null && (
                          <div className="text-center">
                            <div className="text-sm font-bold text-purple-400">
                              {formatCurrency(season.finalBudget)}
                            </div>
                            <div className="text-xs text-[#7A7367]">Final</div>
                          </div>
                        )}
                        
                        {season.trophiesWon > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="font-bold text-sm">{season.trophiesWon}</span>
                          </div>
                        )}
                      </div>
                    </div>
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