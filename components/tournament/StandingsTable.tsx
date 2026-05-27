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
      <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
        <div className="text-xl font-bold text-white mb-2">No standings available</div>
        <p className="text-gray-400">
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
        <div key={groupName} className="rounded-xl border border-white/10 bg-[#111111] overflow-hidden">
          {groups.length > 0 && (
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E8A800]" />
              <span className="font-black text-sm text-[#F5F0E8] uppercase tracking-wider">{groupName}</span>
            </div>
          )}
          
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
                {(groupStandings as Standing[]).map((standing, index) => {
                  const pos = standing.position ?? index + 1
                  const posColor =
                    pos === 1 ? 'bg-[#E8A800] text-[#0a0a0a]' :
                    pos === 2 ? 'bg-[#C0C0C0] text-[#0a0a0a]' :
                    pos === 3 ? 'bg-[#CD7F32] text-[#0a0a0a]' :
                    'bg-white/5 text-[#7A7367]'

                  return (
                    <tr
                      key={standing.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-2 py-2.5 sm:px-5 sm:py-4">
                        <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded sm:rounded-md flex items-center justify-center text-[10px] sm:text-sm font-black ${posColor}`}>
                          {pos}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 sm:px-5 sm:py-4">
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 rounded-md overflow-hidden">
                            {standing.seasonTeam.team.logoUrl ? (
                              <img src={standing.seasonTeam.team.logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#7A7367] text-[9px] sm:text-xs font-bold bg-white/5 rounded-md">
                                {standing.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-xs sm:text-base text-[#F5F0E8] truncate max-w-[80px] sm:max-w-none">
                            {standing.seasonTeam.team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] font-medium text-xs sm:text-base">{standing.played}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-emerald-400 font-bold text-xs sm:text-base">{standing.won}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] font-medium text-xs sm:text-base">{standing.drawn}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-red-400 font-bold text-xs sm:text-base">{standing.lost}</td>
                      <td className="hidden sm:table-cell px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] text-xs sm:text-base">{standing.goalsFor}</td>
                      <td className="hidden sm:table-cell px-1.5 py-2.5 sm:px-3 sm:py-4 text-center text-[#D4CCBB] text-xs sm:text-base">{standing.goalsAgainst}</td>
                      <td className={`px-1.5 py-2.5 sm:px-3 sm:py-4 text-center font-bold text-xs sm:text-base ${
                        standing.goalDiff > 0 ? 'text-emerald-400' :
                        standing.goalDiff < 0 ? 'text-red-400' :
                        'text-[#7A7367]'
                      }`}>
                        {standing.goalDiff > 0 ? '+' : ''}{standing.goalDiff}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-4 text-center">
                        <span className="font-black text-sm sm:text-lg text-emerald-400">
                          {standing.points}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-[#7A7367]">
        <div><span className="font-bold text-white">P</span> - Played</div>
        <div><span className="font-bold text-white">W</span> - Won</div>
        <div><span className="font-bold text-white">D</span> - Drawn</div>
        <div><span className="font-bold text-white">L</span> - Lost</div>
        <div className="hidden sm:inline-block"><span className="font-bold text-white">GF</span> - Goals For</div>
        <div className="hidden sm:inline-block"><span className="font-bold text-white">GA</span> - Goals Against</div>
        <div><span className="font-bold text-white">GD</span> - Goal Difference</div>
        <div><span className="font-bold text-[#E8A800]">Pts</span> - Points</div>
      </div>
    </div>
  )
}
