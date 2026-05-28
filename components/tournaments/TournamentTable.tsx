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
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
        <svg className="w-14 h-14 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-bold text-[#F5F0E8] mb-1">No Standings Yet</h3>
        <p className="text-sm text-[#7A7367]">Standings will appear once matches are completed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(byGroup).map(([groupName, rows]) => (
        <div key={groupName} className="rounded-xl border border-white/10 bg-[#111111] overflow-hidden">
          {/* Group header */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E8A800]" />
            <span className="font-black text-sm text-[#F5F0E8] uppercase tracking-wider">{groupName}</span>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-2 py-3 sm:px-5 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider w-8">#</th>
                  <th className="px-2 py-3 sm:px-5 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider min-w-[100px] sm:min-w-[160px]">Team</th>
                  <th className="px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">P</th>
                  <th className="px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">W</th>
                  <th className="px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">D</th>
                  <th className="px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">L</th>
                  <th className="hidden sm:table-cell px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">GF</th>
                  <th className="hidden sm:table-cell px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">GA</th>
                  <th className="px-1.5 py-3 sm:px-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#7A7367] uppercase tracking-wider">GD</th>
                  <th className="px-3 py-3 sm:px-5 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-[#E8A800] uppercase tracking-wider">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isMe = myTeamId && row.teamId === myTeamId
                  const pos = row.position ?? idx + 1
                  const posColor =
                    pos === 1 ? 'bg-[#E8A800] text-[#0a0a0a]' :
                    pos === 2 ? 'bg-[#C0C0C0] text-[#0a0a0a]' :
                    pos === 3 ? 'bg-[#CD7F32] text-[#0a0a0a]' :
                    'bg-white/5 text-[#7A7367]'

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-white/5 last:border-0 transition-colors ${
                        isMe ? 'bg-[#E8A800]/8' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-2 py-2.5 sm:px-5 sm:py-4">
                        <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded sm:rounded-md flex items-center justify-center text-[10px] sm:text-sm font-black ${posColor}`}>
                          {pos}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 sm:px-5 sm:py-4">
                        <Link
                          href={`${teamLinkBase}/${row.seasonTeam.team.id}`}
                          className={`flex items-center gap-1.5 sm:gap-3 group/link`}
                        >
                          <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 rounded-md overflow-hidden">
                            {row.seasonTeam.team.logoUrl ? (
                              <Image
                                src={row.seasonTeam.team.logoUrl}
                                alt={row.seasonTeam.team.name}
                                fill
                                className="object-contain"
                                sizes="(max-width: 640px) 24px, 40px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#7A7367] text-[9px] sm:text-xs font-bold bg-white/5">
                                {row.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={`font-bold text-xs sm:text-base group-hover/link:text-[#E8A800] transition-colors truncate max-w-[80px] sm:max-w-none ${isMe ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
                            {row.seasonTeam.team.name}
                            {isMe && <span className="ml-1 text-[8px] font-black text-[#E8A800]/60 uppercase sm:inline hidden">You</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] font-medium text-xs sm:text-base">{row.played}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-emerald-400 font-bold text-xs sm:text-base">{row.won}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] font-medium text-xs sm:text-base">{row.drawn}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-red-400 font-bold text-xs sm:text-base">{row.lost}</td>
                      <td className="hidden sm:table-cell px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] text-xs sm:text-base">{row.goalsFor}</td>
                      <td className="hidden sm:table-cell px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] text-xs sm:text-base">{row.goalsAgainst}</td>
                      <td className={`px-1.5 py-2.5 sm:px-3 sm:py-4 text-center font-bold text-xs sm:text-base ${row.goalDiff > 0 ? 'text-emerald-400' : row.goalDiff < 0 ? 'text-red-400' : 'text-[#7A7367]'}`}>
                        {row.goalDiff > 0 ? '+' : ''}{row.goalDiff}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-4 text-center">
                        <span className={`font-black text-sm sm:text-lg ${isMe ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
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
