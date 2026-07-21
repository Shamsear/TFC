'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import TournamentMatches from './TournamentMatches'
import TournamentTable, { StandingRow } from './TournamentTable'
import TournamentStats, { TeamStatRow } from './TournamentStats'

interface TournamentViewProps {
  tournament: {
    id: string
    name: string
    tournamentType: string
    startDate: Date
    endDate: Date | null
    season: {
      id: string
      name: string
    }
    status: string
  }
  matches: any[]
  rounds: string[]
  initialRound?: string
  standings: StandingRow[]
  teams: TeamStatRow[]
}

export default function TournamentView({
  tournament,
  matches,
  rounds,
  initialRound,
  standings,
  teams,
}: TournamentViewProps) {
  const [activeTab, setActiveTab] = useState<'overall' | 'matches' | 'table' | 'stats'>('overall')
  const isHistorical = ['TFCS-1', 'TFCS-2', 'TFCS-3'].includes(tournament.season.id)

  const completedMatches = matches.filter(m => m.status === 'COMPLETED')
  const liveMatches = matches.filter(m => m.status === 'LIVE')
  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED')

  // Group standings by group for quick view
  const byGroup = standings.reduce<Record<string, StandingRow[]>>((acc, s) => {
    const g = s.groupName || 'Overall'
    ;(acc[g] ??= []).push(s)
    return acc
  }, {})

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
      case 'LIVE':
        return 'bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse'
      default:
        return 'bg-white/5 border border-white/10 text-gray-400'
    }
  }

  const tournamentStatusStyle = (s: string) => {
    if (s === 'IN_PROGRESS' || s === 'active') return 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-400'
    if (s === 'COMPLETED' || s === 'completed') return 'bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'UPCOMING' || s === 'draft') return 'bg-[#ff6600]/10 border border-[#ff6600]/30 text-[#ff6600]'
    return 'bg-white/5 border border-white/10 text-[#D4CCBB]'
  }

  return (
    <div className="space-y-6">
      {/* Back Button Header */}
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer mb-2"
      >
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>All Tournaments</span>
      </Link>

      {/* Tournament Hero Card */}
      <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 sm:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black text-[#E8A800] uppercase bg-[#E8A800]/10 border border-[#E8A800]/20 px-3 py-1 rounded-xl shadow-[0_0_8px_rgba(232,168,0,0.05)]">
                  {tournament.tournamentType.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white mb-1.5 tracking-tight">{tournament.name}</h1>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">{tournament.season.name}</p>
            </div>
            <span className={`self-start px-4 py-2 rounded-full border text-xs font-black tracking-wider uppercase whitespace-nowrap ${tournamentStatusStyle(tournament.status)}`}>
              {tournament.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Meta statistics grid */}
          <div className={`grid gap-4 mb-6 ${isHistorical ? 'grid-cols-2 max-w-md' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Start Date</div>
              <div className="font-bold text-white text-sm sm:text-base">{formatDate(tournament.startDate)}</div>
            </div>
            {tournament.endDate && (
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">End Date</div>
                <div className="font-bold text-white text-sm sm:text-base">{formatDate(tournament.endDate)}</div>
              </div>
            )}
            {!isHistorical && (
              <>
                <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Matches</div>
                  <div className="font-bold text-white text-sm sm:text-base">{matches.length}</div>
                </div>
                <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Completed</div>
                  <div className="font-bold text-[#E8A800] text-sm sm:text-base">{completedMatches.length}</div>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('table')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/10 hover:from-[#E8A800]/30 hover:to-[#FFB347]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(232,168,0,0.1)] hover:scale-[1.02] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
              </svg>
              View Table
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Team Stats
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher Navigation */}
      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto scrollbar-none backdrop-blur-md shadow-inner">
        {[
          { id: 'overall', label: 'Overall' },
          ...(!isHistorical ? [{ id: 'matches', label: 'Matches' }] : []),
          ...(tournament.tournamentType !== 'KNOCKOUT_ONLY' ? [{ id: 'table', label: 'Table' }] : []),
          { id: 'stats', label: 'Stats' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_4px_12px_rgba(232,168,0,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overall' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches Column (Left) */}
          {!isHistorical ? (
            <div className="lg:col-span-2 space-y-6">
              {/* Live Matches */}
              {liveMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Live Now</h2>
                  </div>
                  <div className="space-y-3">
                    {liveMatches.map((m) => (
                      <MatchCard key={m.id} match={m} statusStyle={getStatusColor} formatDate={formatDate} formatTime={formatTime} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Matches */}
              {upcomingMatches.length > 0 && (
                <div>
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Upcoming Matches</h2>
                  <div className="space-y-3">
                    {upcomingMatches.slice(0, 10).map((m) => (
                      <MatchCard key={m.id} match={m} statusStyle={getStatusColor} formatDate={formatDate} formatTime={formatTime} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {completedMatches.length > 0 && (
                <div>
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Recent Results</h2>
                  <div className="space-y-3">
                    {completedMatches.slice(0, 10).map((m) => (
                      <MatchCard key={m.id} match={m} statusStyle={getStatusColor} formatDate={formatDate} formatTime={formatTime} />
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 && (
                <div className="rounded-2xl bg-dark-100 border border-white/5 p-12 text-center shadow-lg">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">No matches scheduled yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 space-y-6">
              {/* Historical Stats Brief Overview Card */}
              <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <h2 className="text-base font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)] animate-pulse" />
                    Tournament Stats Summary
                  </h2>
                  
                  {/* Headline Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { icon: '⚽', value: Math.round(standings.reduce((sum, s) => sum + (s.played || 0), 0) / 2), label: 'Matches Played', color: 'bg-blue-500/[0.02] border-blue-500/10 text-blue-400' },
                      { icon: '🥅', value: standings.reduce((sum, s) => sum + (s.goalsFor || 0), 0), label: 'Total Goals', color: 'bg-emerald-500/[0.02] border-emerald-500/10 text-emerald-400' },
                      { icon: '📊', value: (standings.reduce((sum, s) => sum + (s.played || 0), 0) > 0 ? (standings.reduce((sum, s) => sum + (s.goalsFor || 0), 0) / (standings.reduce((sum, s) => sum + (s.played || 0), 0) / 2)).toFixed(1) : '0.0'), label: 'Avg Goals / Match', color: 'bg-[#E8A800]/[0.02] border-[#E8A800]/10 text-[#E8A800]' },
                      { icon: '🧤', value: teams.reduce((sum, t) => sum + (t.cleanSheets || 0), 0), label: 'Clean Sheets', color: 'bg-purple-500/[0.02] border-purple-500/10 text-purple-400' },
                    ].map(({ icon, value, label, color }) => (
                      <div key={label} className={`relative rounded-2xl p-4 text-center backdrop-blur-xl shadow-md overflow-hidden ${color} border`}>
                        <div className="text-xl mb-1">{icon}</div>
                        <div className="text-xl sm:text-2xl font-black text-white">{value}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1 leading-snug">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Top Performers Section */}
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {/* Top Scorer (Boot winner) */}
                    {teams.length > 0 && (() => {
                      const topScorer = [...teams].sort((a, b) => b.goalsFor - a.goalsFor)[0]
                      return (
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🥇</span>
                            <div>
                              <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">Top Attack (Most Goals)</div>
                              <div className="text-sm font-black text-white">{topScorer.teamName}</div>
                            </div>
                          </div>
                          <span className="text-base font-black text-emerald-400">{topScorer.goalsFor} Goals</span>
                        </div>
                      )
                    })()}

                    {/* Top Defense (Glove winner) */}
                    {teams.length > 0 && (() => {
                      const topDefense = [...teams].sort((a, b) => (a.goalsAgainst - b.goalsAgainst) || ((b.cleanSheets || 0) - (a.cleanSheets || 0)))[0]
                      return (
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🧤</span>
                            <div>
                              <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">Top Defense (Least Conceded)</div>
                              <div className="text-sm font-black text-white">{topDefense.teamName}</div>
                            </div>
                          </div>
                          <span className="text-base font-black text-blue-400">{topDefense.goalsAgainst} GA</span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standings Sidebar (Right) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Standings Overview</h2>
              <button
                onClick={() => setActiveTab('table')}
                className="text-xs font-black text-[#E8A800] hover:text-[#FFB347] transition-colors uppercase tracking-wider hover:underline"
              >
                Full Table →
              </button>
            </div>

            {Object.keys(byGroup).length === 0 ? (
              <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 text-center shadow-lg">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">No standings data yet</p>
              </div>
            ) : (
              Object.entries(byGroup).map(([groupName, rows]) => (
                <div key={groupName} className="rounded-2xl bg-dark-100 border border-white/5 overflow-hidden shadow-lg">
                  {Object.keys(byGroup).length > 1 && (
                    <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01]">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{groupName}</span>
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    {rows.slice(0, 5).map((s, idx) => {
                      const pos = s.position ?? idx + 1
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-transparent hover:bg-white/[0.03] transition-all"
                        >
                          <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black ${
                            pos === 1 ? 'bg-gradient-to-br from-amber-400 to-[#E8A800] text-black shadow-[0_0_8px_rgba(232,168,0,0.3)] animate-pulse' :
                            pos === 2 ? 'bg-gray-300 text-black' :
                            pos === 3 ? 'bg-amber-700 text-white' :
                            'bg-white/5 text-gray-500'
                          }`}>{pos}</span>
                          <div className="relative w-6 h-6 flex-shrink-0 rounded-md overflow-hidden bg-black/30 border border-white/5 p-0.5">
                            {s.seasonTeam.team.logoUrl ? (
                              <Image src={s.seasonTeam.team.logoUrl} alt={s.seasonTeam.team.name} fill className="object-contain p-0.5" sizes="24px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-gray-500 bg-white/5">
                                {s.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="flex-1 text-xs font-black truncate text-gray-300">
                            {s.seasonTeam.team.name}
                          </span>
                          <span className="text-xs font-black flex-shrink-0 text-white">{s.points} pts</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-xl">
          <TournamentMatches matches={matches} teamLinkBase="/teams" />
        </div>
      )}

      {activeTab === 'table' && tournament.tournamentType !== 'KNOCKOUT_ONLY' && (
        <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Tournament Table</h2>
          </div>
          <TournamentTable standings={standings} teamLinkBase="/teams" />
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="rounded-2xl bg-dark-100 border border-white/5 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Tournament Stats</h2>
          </div>
          <TournamentStats teams={teams} teamLinkBase="/teams" hideShareOptions={true} />
        </div>
      )}
    </div>
  )
}

function MatchCard({
  match,
  statusStyle,
  formatDate,
  formatTime,
}: {
  match: any
  statusStyle: (s: string) => string
  formatDate: (d: Date) => string
  formatTime: (d: Date) => string
}) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-white/5 bg-dark-100/40 p-4 hover:border-[#E8A800]/30 hover:bg-dark-200 transition-all duration-300 shadow-md"
    >
      <div className="flex items-center justify-between gap-2 mb-3 text-[10px] sm:text-xs font-black text-gray-500 tracking-wider uppercase">
        <div className="flex items-center gap-2">
          {match.round && <span>{match.round.toUpperCase()}</span>}
        </div>
        <div className="flex items-center gap-2.5">
          <span>{formatDate(match.matchDate)} {formatTime(match.matchDate)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusStyle(match.status)}`}>
            {match.status === 'IN_PROGRESS' ? 'LIVE' : match.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 items-center gap-2 mt-4">
        {/* Home Team */}
        <div className="col-span-3 flex items-center gap-2.5 justify-end">
          <span className="font-black text-xs sm:text-sm text-right truncate text-gray-300">{match.homeTeam.team.name}</span>
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/5 p-0.5 shadow-md">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain p-0.5" sizes="32px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">
                {match.homeTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="col-span-1 text-center">
          {match.homeScore !== null && match.awayScore !== null ? (
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-white/5 mx-auto w-fit shadow-md">
              <span className="text-sm sm:text-base font-black text-[#E8A800]">{match.homeScore}</span>
              <span className="text-gray-600 text-xs font-black">–</span>
              <span className="text-sm sm:text-base font-black text-[#E8A800]">{match.awayScore}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/5 mx-auto w-fit shadow-md">
              <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">VS</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="col-span-3 flex items-center gap-2.5 justify-start">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/5 p-0.5 shadow-md">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain p-0.5" sizes="32px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">
                {match.awayTeam.team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-black text-xs sm:text-sm truncate text-gray-300">{match.awayTeam.team.name}</span>
        </div>
      </div>
    </Link>
  )
}
