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
          <div key={group.id} className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Group Header */}
            <div className="bg-white/[0.01] border-b border-white/5 px-6 py-5">
              <h3 className="text-lg font-black uppercase text-white tracking-wider font-mono">{group.name}</h3>
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono mt-1">
                {groupMatches.length} matches • {groupStandings.length} teams
              </div>
            </div>

            {/* Standings */}
            <div className="p-6">
              <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider font-mono mb-4">STANDINGS</h4>
              <div className="space-y-2">
                {groupStandings.map((standing, index) => {
                  const goalDiff = standing.goalsFor - standing.goalsAgainst
                  const isTop = index === 0
                  const isSecond = index === 1
                  const badgeColor = 
                    isTop ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    isSecond ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                    'bg-white/5 text-gray-500 border border-white/5'

                  return (
                    <div
                      key={standing.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border font-mono ${badgeColor}`}>
                          {index + 1}
                        </div>
                        <div className="w-6 h-6 rounded bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {standing.seasonTeam.team.logoUrl ? (
                            <img src={standing.seasonTeam.team.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-[10px]">⚽</span>
                          )}
                        </div>
                        <span className="font-extrabold uppercase text-white text-xs tracking-tight font-mono">{standing.seasonTeam.team.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono font-bold">
                        <div className="text-gray-500">
                          <span className="text-white font-black">{standing.played}</span> P
                        </div>
                        <div className="text-gray-500 w-12 text-right">
                          <span className={`font-black ${
                            goalDiff > 0 ? 'text-emerald-400' :
                            goalDiff < 0 ? 'text-red-400' :
                            'text-white'
                          }`}>
                            {goalDiff > 0 ? '+' : ''}{goalDiff}
                          </span> GD
                        </div>
                        <div className="w-10 h-6 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] font-black flex items-center justify-center text-[11px]">
                          {standing.points}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recent Matches */}
              {groupMatches.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider font-mono mb-4">RECENT MATCHES</h4>
                  <div className="space-y-2">
                    {groupMatches.slice(0, 3).map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] border border-white/5 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-white font-extrabold uppercase tracking-tight truncate">{match.homeTeam.team.name}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 flex-shrink-0">
                          {match.status === 'COMPLETED' ? (
                            <>
                              <span className="font-black text-white text-sm">{match.homeScore}</span>
                              <span className="text-gray-600 font-bold">-</span>
                              <span className="font-black text-white text-sm">{match.awayScore}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">{match.status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className="text-white font-extrabold uppercase tracking-tight truncate text-right">{match.awayTeam.team.name}</span>
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
