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
    <div className="space-y-8">
      {Object.entries(groupedStandings).map(([groupName, groupStandings]) => (
        <div key={groupName} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {groups.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-b border-white/10 px-6 py-4">
              <h3 className="text-xl font-black text-white">{groupName}</h3>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-bold text-gray-400">#</th>
                  <th className="text-left px-6 py-4 text-sm font-bold text-gray-400">Team</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">P</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">W</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">D</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">L</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">GF</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">GA</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">GD</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-400">Pts</th>
                </tr>
              </thead>
              <tbody>
                {(groupStandings as Standing[]).map((standing, index) => (
                  <tr
                    key={standing.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                        index === 1 ? 'bg-teal-500/20 text-teal-400' :
                        index === 2 ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-white/5 text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {standing.seasonTeam.team.logoUrl ? (
                            <img src={standing.seasonTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm">⚽</span>
                          )}
                        </div>
                        <span className="font-bold text-white">{standing.seasonTeam.team.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-4 text-white font-medium">{standing.played}</td>
                    <td className="text-center px-4 py-4 text-green-400 font-medium">{standing.won}</td>
                    <td className="text-center px-4 py-4 text-yellow-400 font-medium">{standing.drawn}</td>
                    <td className="text-center px-4 py-4 text-red-400 font-medium">{standing.lost}</td>
                    <td className="text-center px-4 py-4 text-white font-medium">{standing.goalsFor}</td>
                    <td className="text-center px-4 py-4 text-white font-medium">{standing.goalsAgainst}</td>
                    <td className={`text-center px-4 py-4 font-bold ${
                      standing.goalDiff > 0 ? 'text-green-400' :
                      standing.goalDiff < 0 ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {standing.goalDiff > 0 ? '+' : ''}{standing.goalDiff}
                    </td>
                    <td className="text-center px-4 py-4">
                      <div className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black">
                        {standing.points}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <div><span className="font-bold">P</span> - Played</div>
        <div><span className="font-bold">W</span> - Won</div>
        <div><span className="font-bold">D</span> - Drawn</div>
        <div><span className="font-bold">L</span> - Lost</div>
        <div><span className="font-bold">GF</span> - Goals For</div>
        <div><span className="font-bold">GA</span> - Goals Against</div>
        <div><span className="font-bold">GD</span> - Goal Difference</div>
        <div><span className="font-bold">Pts</span> - Points</div>
      </div>
    </div>
  )
}
