'use client'

import Link from 'next/link'
import Image from 'next/image'

export interface StandingRow {
  id: string
  teamId: string
  groupName?: string | null
  position?: number | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  seasonTeam: {
    team: {
      id: string
      name: string
      logoUrl?: string | null
    }
  }
}

interface TournamentTableProps {
  standings: StandingRow[]
  /** season_teams.id of the logged-in user's team (for highlighting) */
  myTeamId?: string | null
  /** base path for team profile links, e.g. "/teams" or "/team/squad" */
  teamLinkBase?: string
}

export default function TournamentTable({ standings, myTeamId, teamLinkBase = '/teams' }: TournamentTableProps) {
  // Group by groupName
  const byGroup = standings.reduce<Record<string, StandingRow[]>>((acc, s) => {
    const g = s.groupName || 'Overall'
    ;(acc[g] ??= []).push(s)
    return acc
  }, {})

  if (Object.keys(byGroup).length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-12 text-center backdrop-blur-md shadow-lg">
        <svg className="w-14 h-14 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-bold text-white mb-1">No Standings Table Generated</h3>
        <p className="text-sm text-gray-500 font-medium">Standings will be compiled once matches begin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(byGroup).map(([groupName, rows]) => (
        <div key={groupName} className="rounded-2xl border border-white/10 bg-white/[0.01] overflow-hidden backdrop-blur-md shadow-2xl">
          {/* Group header */}
          <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)] animate-pulse" />
            <span className="font-black text-sm text-white uppercase tracking-widest">{groupName}</span>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-black/20 text-gray-400">
                  <th className="px-3 py-4 sm:px-5 sm:py-4.5 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider w-12">Rank</th>
                  <th className="px-3 py-4 sm:px-5 sm:py-4.5 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider min-w-[140px] sm:min-w-[200px]">Franchise</th>
                  <th className="px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-10">P</th>
                  <th className="px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-10">W</th>
                  <th className="px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-10">D</th>
                  <th className="px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-10">L</th>
                  <th className="hidden sm:table-cell px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-12">GF</th>
                  <th className="hidden sm:table-cell px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-12">GA</th>
                  <th className="px-2 py-4 sm:px-3 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-12">GD</th>
                  <th className="px-4 py-4 sm:px-5 sm:py-4.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider w-16 text-[#E8A800]">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, idx) => {
                  const isMe = myTeamId && row.teamId === myTeamId
                  const pos = row.position ?? idx + 1
                  const posColor =
                    pos === 1 ? 'bg-gradient-to-br from-amber-400 to-[#E8A800] text-black font-black shadow-[0_0_10px_rgba(232,168,0,0.3)] animate-pulse' :
                    pos === 2 ? 'bg-[#C0C0C0] text-black font-black' :
                    pos === 3 ? 'bg-[#CD7F32] text-white font-black' :
                    'bg-white/5 text-gray-500 font-bold'

                  return (
                    <tr
                      key={row.id}
                      className={`transition-all duration-200 ${
                        isMe 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-y border-emerald-500/20 shadow-inner' 
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Rank Position */}
                      <td className="px-3 py-3 sm:px-5 sm:py-4">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs tracking-tight ${posColor}`}>
                          {pos}
                        </div>
                      </td>

                      {/* Team Link & Logo */}
                      <td className="px-3 py-3 sm:px-5 sm:py-4">
                        <Link
                          href={`${teamLinkBase}/${row.seasonTeam.team.id}`}
                          className="flex items-center gap-2 sm:gap-3 group/link w-fit"
                        >
                          <div className="relative w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-inner group-hover/link:scale-105 transition-transform duration-200">
                            {row.seasonTeam.team.logoUrl ? (
                              <Image
                                src={row.seasonTeam.team.logoUrl}
                                alt={row.seasonTeam.team.name}
                                fill
                                className="object-contain p-0.5"
                                sizes="(max-width: 640px) 28px, 40px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#7A7367] text-[9px] sm:text-xs font-black bg-white/5">
                                {row.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={`font-black text-xs sm:text-base group-hover/link:text-[#FFC93A] transition-colors truncate max-w-[95px] sm:max-w-none ${isMe ? 'text-[#E8A800]' : 'text-gray-200'}`}>
                            {row.seasonTeam.team.name}
                            {isMe && <span className="ml-2 text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase sm:inline hidden shadow-[0_0_8px_rgba(16,185,129,0.1)]">You</span>}
                          </span>
                        </Link>
                      </td>

                      {/* Match record details */}
                      <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-gray-400 font-bold text-xs sm:text-base">{row.played}</td>
                      <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-emerald-400 font-black text-xs sm:text-base">{row.won}</td>
                      <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-gray-400 font-bold text-xs sm:text-base">{row.drawn}</td>
                      <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-red-400 font-black text-xs sm:text-base">{row.lost}</td>
                      
                      {/* GF & GA */}
                      <td className="hidden sm:table-cell px-2 py-3 sm:px-3 sm:py-4 text-center text-gray-400 font-semibold text-xs sm:text-base">{row.goalsFor}</td>
                      <td className="hidden sm:table-cell px-2 py-3 sm:px-3 sm:py-4 text-center text-gray-400 font-semibold text-xs sm:text-base">{row.goalsAgainst}</td>
                      
                      {/* Goal Difference */}
                      <td className={`px-2 py-3 sm:px-3 sm:py-4 text-center font-black text-xs sm:text-base ${row.goalDiff > 0 ? 'text-emerald-400' : row.goalDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {row.goalDiff > 0 ? '+' : ''}{row.goalDiff}
                      </td>

                      {/* Points */}
                      <td className="px-4 py-3 sm:px-5 sm:py-4 text-center">
                        <span className={`font-black text-sm sm:text-xl drop-shadow-[0_0_4px_rgba(232,168,0,0.1)] ${isMe ? 'text-[#E8A800]' : 'text-white'}`}>
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
