interface Standing {
  id: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  position: number | null
  groupName: string | null
  seasonTeam: {
    team: {
      name: string
      logoUrl: string
    }
  }
}

interface StandingsTableProps {
  standings: Standing[]
  groups: any[]
}

export default function StandingsTable({ standings, groups }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="text-lg font-black text-white uppercase tracking-wider font-mono mb-2">No standings available</div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
          Standings will be generated once matches are played
        </p>
      </div>
    )
  }

  // Group standings by group name if groups exist
  const groupedStandings = groups.length > 0
    ? groups.reduce((acc, group) => {
        acc[group.name] = standings.filter(s => s.groupName === group.name)
        return acc
      }, {} as Record<string, Standing[]>)
    : { 'Overall': standings }

  return (
    <div className="space-y-6">
      {Object.entries(groupedStandings).map(([groupName, groupStandings]) => (
        <div key={groupName} className="rounded-3xl border border-white/5 bg-[#0D0D0D]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
          {groups.length > 0 && (
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E8A800] shadow-[0_0_10px_rgba(232,168,0,0.5)]" />
              <span className="font-black text-sm text-white uppercase tracking-wider font-mono">{groupName}</span>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-4 py-3 sm:px-5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest w-12">#</th>
                  <th className="px-4 py-3 sm:px-5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest min-w-[120px] sm:min-w-[180px]">Team</th>
                  <th className="px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">P</th>
                  <th className="px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">W</th>
                  <th className="px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">D</th>
                  <th className="px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">L</th>
                  <th className="hidden sm:table-cell px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">GF</th>
                  <th className="hidden sm:table-cell px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">GA</th>
                  <th className="px-2 py-3 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">GD</th>
                  <th className="px-4 py-3 sm:px-5 text-center text-[10px] font-black text-[#E8A800] uppercase tracking-widest w-16">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(groupStandings as Standing[]).map((standing, index) => {
                  const pos = standing.position ?? index + 1
                  const posColor =
                    pos === 1 ? 'bg-[#E8A800]/10 text-[#E8A800] border-[#E8A800]/25' :
                    pos === 2 ? 'bg-white/10 text-white border-white/10' :
                    pos === 3 ? 'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/25' :
                    'bg-white/[0.01] text-gray-500 border border-white/5'
                  const goalDiff = standing.goalsFor - standing.goalsAgainst

                  return (
                    <tr
                      key={standing.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${posColor}`}>
                          {pos}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2">
                          <div className="relative w-6 h-6 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/5 p-0.5">
                            {standing.seasonTeam.team.logoUrl ? (
                              <img src={standing.seasonTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-[9px] font-bold">
                                {standing.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-xs text-white uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                            {standing.seasonTeam.team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center text-gray-300 font-bold">{standing.played}</td>
                      <td className="px-2 py-3 text-center text-emerald-400 font-black">{standing.won}</td>
                      <td className="px-2 py-3 text-center text-gray-300 font-bold">{standing.drawn}</td>
                      <td className="px-2 py-3 text-center text-red-400 font-black">{standing.lost}</td>
                      <td className="hidden sm:table-cell px-2 py-3 text-center text-gray-400">{standing.goalsFor}</td>
                      <td className="hidden sm:table-cell px-2 py-3 text-center text-gray-400">{standing.goalsAgainst}</td>
                      <td className={`px-2 py-3 text-center font-black ${
                        goalDiff > 0 ? 'text-emerald-400' :
                        goalDiff < 0 ? 'text-red-400' :
                        'text-gray-500'
                      }`}>
                        {goalDiff > 0 ? '+' : ''}{goalDiff}
                      </td>
                      <td className="px-4 py-3 sm:px-5 text-center">
                        <div className="w-10 h-6 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] font-black flex items-center justify-center text-[11px] mx-auto">
                          {standing.points}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] font-extrabold uppercase tracking-wider text-gray-500 font-mono mt-4">
        <div><span className="text-white">P</span> - Played</div>
        <div><span className="text-white">W</span> - Won</div>
        <div><span className="text-white">D</span> - Drawn</div>
        <div><span className="text-white">L</span> - Lost</div>
        <div className="hidden sm:inline-block"><span className="text-white">GF</span> - Goals For</div>
        <div className="hidden sm:inline-block"><span className="text-white">GA</span> - Goals Against</div>
        <div><span className="text-white">GD</span> - Goal Difference</div>
        <div><span className="text-[#E8A800]">Pts</span> - Points</div>
      </div>
    </div>
  )
}
