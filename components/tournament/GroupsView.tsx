interface GroupsViewProps {
  groups: any[]
  matches: any[]
  standings: any[]
}

export default function GroupsView({ groups, matches, standings }: GroupsViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groups.map((group) => {
        const groupMatches = matches.filter(m => m.group?.id === group.id)
        const groupStandings = standings.filter(s => s.groupName === group.name)
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            const gdA = a.goalsFor - a.goalsAgainst
            const gdB = b.goalsFor - b.goalsAgainst
            if (gdB !== gdA) return gdB - gdA
            return b.goalsFor - a.goalsFor
          })

        return (
          <div key={group.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Group Header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10 px-6 py-4">
              <h3 className="text-2xl font-black text-white">{group.name}</h3>
              <div className="text-sm text-gray-400 mt-1">
                {groupMatches.length} matches • {groupStandings.length} teams
              </div>
            </div>

            {/* Standings */}
            <div className="p-6">
              <h4 className="text-sm font-bold text-gray-400 mb-4">STANDINGS</h4>
              <div className="space-y-2">
                {groupStandings.map((standing, index) => {
                  const goalDiff = standing.goalsFor - standing.goalsAgainst
                  return (
                    <div
                      key={standing.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                          index === 1 ? 'bg-teal-500/20 text-teal-400' :
                          'bg-white/5 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {standing.seasonTeam.team.logoUrl ? (
                            <img src={standing.seasonTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-xs">⚽</span>
                          )}
                        </div>
                        <span className="font-bold text-white text-sm">{standing.seasonTeam.team.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-gray-400">
                          <span className="text-white font-bold">{standing.played}</span> P
                        </div>
                        <div className="text-gray-400">
                          <span className={`font-bold ${
                            goalDiff > 0 ? 'text-green-400' :
                            goalDiff < 0 ? 'text-red-400' :
                            'text-white'
                          }`}>
                            {goalDiff > 0 ? '+' : ''}{goalDiff}
                          </span> GD
                        </div>
                        <div className="w-10 h-6 rounded bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center">
                          {standing.points}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recent Matches */}
              {groupMatches.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-gray-400 mb-4">RECENT MATCHES</h4>
                  <div className="space-y-2">
                    {groupMatches.slice(0, 3).map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-white font-medium truncate">{match.homeTeam.team.name}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3">
                          {match.status === 'COMPLETED' ? (
                            <>
                              <span className="font-bold text-white">{match.homeScore}</span>
                              <span className="text-gray-500">-</span>
                              <span className="font-bold text-white">{match.awayScore}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 text-xs">{match.status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-white font-medium truncate">{match.awayTeam.team.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
