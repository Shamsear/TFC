'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  teamId: string
  name: string
  logoUrl: string
}

interface Group {
  id: string
  name: string
  groupOrder: number
}

interface FixtureGeneratorProps {
  tournament: any
  teams: Team[]
  groups: Group[]
  seasonId: string
}

export default function FixtureGenerator({ tournament, teams, groups, seasonId }: FixtureGeneratorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    startDate: '',
    matchdaysPerWeek: 6, // How many matchdays in one week (1-7)
    venue: '',
    homeAndAway: (tournament.leagueLegs || 0) === 2 || (tournament.groupLegs || 0) === 2,
    groupAssignments: {} as Record<string, string[]> // groupId -> teamIds
  })

  const [preview, setPreview] = useState<any[]>([])

  // Initialize group assignments for GROUP_KNOCKOUT type
  useState(() => {
    if (tournament.tournamentType === 'GROUP_KNOCKOUT' && groups.length > 0) {
      const assignments: Record<string, string[]> = {}
      groups.forEach(group => {
        assignments[group.id] = []
      })
      setFormData(prev => ({ ...prev, groupAssignments: assignments }))
    }
  })

  const assignTeamToGroup = (teamId: string, groupId: string) => {
    setFormData(prev => {
      const newAssignments = { ...prev.groupAssignments }
      
      // Remove team from all groups
      Object.keys(newAssignments).forEach(gId => {
        newAssignments[gId] = newAssignments[gId].filter(tId => tId !== teamId)
      })
      
      // Add to selected group
      if (!newAssignments[groupId].includes(teamId)) {
        newAssignments[groupId] = [...newAssignments[groupId], teamId]
      }
      
      return { ...prev, groupAssignments: newAssignments }
    })
  }

  const generatePreview = () => {
    const fixtures: any[] = []
    
    if (tournament.tournamentType === 'GROUP_KNOCKOUT') {
      // Generate group stage fixtures
      groups.forEach(group => {
        const groupTeams = formData.groupAssignments[group.id] || []
        const groupFixtures = generateRoundRobin(groupTeams, group.id, group.name)
        fixtures.push(...groupFixtures)
      })
    } else {
      // Generate league fixtures
      const leagueFixtures = generateRoundRobin(teams.map(t => t.id), null, null)
      fixtures.push(...leagueFixtures)
    }

    // Assign dates by round based on matchdays per week
    let currentDate = new Date(formData.startDate)
    const roundsMap = new Map<number, any[]>()
    
    // Group fixtures by round
    fixtures.forEach(fixture => {
      if (!roundsMap.has(fixture.roundNumber)) {
        roundsMap.set(fixture.roundNumber, [])
      }
      roundsMap.get(fixture.roundNumber)!.push(fixture)
    })

    // Assign dates to each round
    let matchdayCount = 0
    Array.from(roundsMap.keys()).sort((a, b) => a - b).forEach(roundNum => {
      const roundFixtures = roundsMap.get(roundNum)!
      roundFixtures.forEach(fixture => {
        fixture.matchDate = new Date(currentDate)
      })
      
      matchdayCount++
      
      // Calculate next matchday date
      if (matchdayCount >= formData.matchdaysPerWeek) {
        // Move to next week (skip remaining days and start Monday)
        const daysToAdd = 7 - (matchdayCount - formData.matchdaysPerWeek)
        currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
        matchdayCount = 0
      } else {
        // Next day in the same week
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      }
    })

    setPreview(fixtures)
  }

  const generateRoundRobin = (teamIds: string[], groupId: string | null, groupName: string | null) => {
    const fixtures: any[] = []
    const n = teamIds.length
    
    if (n < 2) return fixtures

    // Handle odd number of teams by adding a "bye" placeholder
    const teams = [...teamIds]
    const hasOddTeams = n % 2 === 1
    if (hasOddTeams) {
      teams.push('BYE') // Placeholder for bye
    }

    const totalTeams = teams.length
    const totalRounds = formData.homeAndAway ? (totalTeams - 1) * 2 : totalTeams - 1

    // Circle method for round-robin scheduling
    for (let round = 0; round < totalRounds; round++) {
      const isSecondLeg = formData.homeAndAway && round >= totalTeams - 1
      const actualRound = isSecondLeg ? round - (totalTeams - 1) : round

      for (let match = 0; match < Math.floor(totalTeams / 2); match++) {
        let home = (actualRound + match) % (totalTeams - 1)
        let away = (totalTeams - 1 - match + actualRound) % (totalTeams - 1)
        
        // Fix the last team in position
        if (match === 0) {
          away = totalTeams - 1
        }

        // Skip if either team is BYE
        if (teams[home] === 'BYE' || teams[away] === 'BYE') {
          continue
        }

        // Swap home/away for second leg
        if (isSecondLeg) {
          [home, away] = [away, home]
        }

        fixtures.push({
          homeTeamId: teams[home],
          awayTeamId: teams[away],
          groupId,
          groupName,
          round: `Matchday ${round + 1}`,
          roundNumber: round + 1,
          matchType: groupId ? 'GROUP_STAGE' : 'LEAGUE'
        })
      }
    }

    return fixtures
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournament.id}/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fixtures: preview
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create fixtures')
      }

      router.push(`/sub-admin/${seasonId}/tournaments/${tournament.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const needsGroupAssignment = tournament.tournamentType === 'GROUP_KNOCKOUT'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Basic Settings */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Fixture Settings</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Matchdays Per Week
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.matchdaysPerWeek}
                onChange={(e) => setFormData({ ...formData, matchdaysPerWeek: parseInt(e.target.value) || 6 })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
              <p className="text-xs text-[#7A7367] mt-1">
                6 = Mon-Sat (Sunday rest), 7 = Mon-Sun (full week), 3 = Mon/Wed/Fri, etc.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Default Venue
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-[#7A7367] focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              placeholder="e.g., Main Stadium"
            />
          </div>

          {(tournament.tournamentType === 'LEAGUE_ONLY' || tournament.tournamentType === 'LEAGUE_PLAYOFF') && (
            <div className="rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30 p-4">
              <div className="flex items-center gap-2 text-[#E8A800]">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-sm sm:text-base">
                  {(tournament.leagueLegs || 1) === 1 ? 'Single Round-Robin' : 'Double Round-Robin (Home & Away)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7A7367] mt-2">
                This setting was configured when creating the tournament
              </p>
            </div>
          )}
          
          {tournament.tournamentType === 'GROUP_KNOCKOUT' && (
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-4">
              <div className="flex items-center gap-2 text-purple-400">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-sm sm:text-base">
                  Group Stage: {(tournament.groupLegs || 1) === 1 ? 'Single Round-Robin' : 'Double Round-Robin (Home & Away)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7A7367] mt-2">
                Top {tournament.groupQualifiers || 2} teams from each group will qualify
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Group Assignment */}
      {needsGroupAssignment && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Assign Teams to Groups</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {groups.map(group => (
              <div key={group.id} className="rounded-lg sm:rounded-xl bg-black/30 border border-white/10 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">{group.name}</h3>
                <div className="space-y-2">
                  {teams.map(team => {
                    const isAssigned = formData.groupAssignments[group.id]?.includes(team.id)
                    return (
                      <label
                        key={team.id}
                        className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all ${
                          isAssigned
                            ? 'bg-[#E8A800]/20 border-2 border-[#E8A800]'
                            : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => assignTeamToGroup(team.id, group.id)}
                          className="sr-only"
                        />
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-xs">⚽</span>
                          )}
                        </div>
                        <span className="text-white font-medium text-xs sm:text-sm truncate">{team.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Preview */}
      <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={generatePreview}
          disabled={!formData.startDate}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 border border-white/20 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Generate Preview
        </button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">
            Preview ({preview.length} matches)
          </h2>
          
          <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
            {preview.slice(0, 50).map((fixture, index) => {
              const homeTeam = teams.find(t => t.id === fixture.homeTeamId)
              const awayTeam = teams.find(t => t.id === fixture.awayTeamId)
              
              return (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-black/30 border border-white/5 text-sm">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="text-[#E8A800] font-bold w-20 sm:w-24 text-xs flex-shrink-0">
                      {fixture.round}
                    </div>
                    <div className="text-[#7A7367] w-24 sm:w-32 text-xs flex-shrink-0">
                      {fixture.matchDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <span className="text-white font-medium truncate">{homeTeam?.name}</span>
                    <span className="text-[#7A7367] flex-shrink-0">vs</span>
                    <span className="text-white font-medium truncate">{awayTeam?.name}</span>
                  </div>
                  {fixture.groupName && (
                    <div className="text-purple-400 text-xs font-bold flex-shrink-0">{fixture.groupName}</div>
                  )}
                </div>
              )
            })}
            {preview.length > 50 && (
              <div className="text-center text-[#7A7367] text-xs sm:text-sm py-2">
                ... and {preview.length - 50} more matches
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      {preview.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? 'Creating Fixtures...' : `Create ${preview.length} Fixtures`}
          </button>
        </div>
      )}
    </form>
  )
}
