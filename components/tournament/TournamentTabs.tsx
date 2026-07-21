'use client'

import { useState, useEffect, useCallback } from 'react'
import FixturesList from './FixturesList'
import StandingsTable from './StandingsTable'
import GroupsView from './GroupsView'
import KnockoutRoundManager from './KnockoutRoundManager'
import FixtureCalendarEditor from './FixtureCalendarEditor'
import ShareableAdminStandings from './ShareableAdminStandings'
import MatchRoundManager from './MatchRoundManager'
import TournamentStats from '../tournaments/TournamentStats'

interface TournamentTabsProps {
  tournament: any
  teams: any[]
  seasonId: string
  statsTeams: any[]
}

export default function TournamentTabs({ tournament, teams, seasonId, statsTeams }: TournamentTabsProps) {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'calendar' | 'standings' | 'groups' | 'knockout' | 'rounds' | 'stats'>('fixtures')
  const [knockoutRounds, setKnockoutRounds] = useState<any[]>(tournament.knockoutRounds || [])
  const [loadingKnockout, setLoadingKnockout] = useState(false)
  const [activeRoundLimit, setActiveRoundLimit] = useState<string>('All Matchdays')
  const [activeWeekFilter, setActiveWeekFilter] = useState<string>('All Weeks')

  // Dynamic Round Filter options based on all rounds
  const baseRounds = (tournament.matches 
    ? Array.from(new Set(tournament.matches.filter((m: any) => m.round).map((m: any) => m.round as string))).sort((a: any, b: any) => {
        const getRoundWeight = (name: string) => {
          const upper = name.toUpperCase()
          if (upper.includes('ROUND OF 32')) return 1000
          if (upper.includes('ROUND OF 16')) return 1010
          if (upper.includes('QUARTER')) return 1020
          if (upper.includes('SEMI')) return 1030
          if (upper.includes('THIRD PLACE')) return 1040
          if (upper.includes('FINAL')) return 1050
          const num = name.match(/\d+/)
          return num ? parseInt(num[0], 10) : 9999
        }
        return getRoundWeight(a as string) - getRoundWeight(b as string)
      })
    : []) as string[]
  const roundOptions: string[] = baseRounds.length > 0 ? ['All Matchdays', ...baseRounds] : []

  // Week Filter Options
  const maxRoundNum = baseRounds.length > 0 ? (() => {
    const match = baseRounds[baseRounds.length - 1].match(/\d+/)
    return match ? parseInt(match[0], 10) : 1
  })() : 0

  const weekOptions = ['All Weeks']
  if (maxRoundNum > 0) {
    const totalWeeks = Math.ceil(maxRoundNum / 7)
    for (let i = 1; i <= totalWeeks; i++) {
      const start = (i - 1) * 7 + 1
      const end = i * 7
      weekOptions.push(`Week ${i} (Round ${start}-${end})`)
    }
  }

  // Dynamic Round Standings Calculation
  const standingsWithPositions = (() => {
    const standingsData = tournament.standings.map((standing: any) => {
      const teamId = standing.teamId
      
      const relevantMatches = tournament.matches.filter((m: any) => {
        if (m.status !== 'COMPLETED' && m.status !== 'WALKOVER') return false
        
        const getRoundWeight = (name: string) => {
          const upper = name.toUpperCase()
          if (upper.includes('ROUND OF 32')) return 1000
          if (upper.includes('ROUND OF 16')) return 1010
          if (upper.includes('QUARTER')) return 1020
          if (upper.includes('SEMI')) return 1030
          if (upper.includes('THIRD PLACE')) return 1040
          if (upper.includes('FINAL')) return 1050
          const num = name.match(/\d+/)
          return num ? parseInt(num[0], 10) : 9999
        }
        const matchRoundNum = getRoundWeight(m.round || '')

        if (activeRoundLimit !== 'All Matchdays') {
          const limitRoundNum = getRoundWeight(activeRoundLimit)
          if (matchRoundNum > limitRoundNum) return false
        }

        if (activeWeekFilter !== 'All Weeks') {
          const weekMatch = activeWeekFilter.match(/Week (\d+)/)
          if (weekMatch) {
            const weekNum = parseInt(weekMatch[1], 10)
            const startRound = (weekNum - 1) * 7 + 1
            const endRound = weekNum * 7
            if (matchRoundNum < startRound || matchRoundNum > endRound) return false
          }
        }

        return m.homeTeamId === teamId || m.awayTeamId === teamId
      })

      let played = 0
      let won = 0
      let drawn = 0
      let lost = 0
      let goalsFor = 0
      let goalsAgainst = 0
      let points = 0

      relevantMatches.forEach((m: any) => {
        const isHome = m.homeTeamId === teamId
        const myScore = isHome ? m.homeScore : m.awayScore
        const oppScore = isHome ? m.awayScore : m.homeScore

        if (myScore !== null && oppScore !== null) {
          played++
          
          // Exclude goals for WALKOVER matches
          if (m.status !== 'WALKOVER') {
            goalsFor += myScore
            goalsAgainst += oppScore
          }

          if (myScore > oppScore) {
            won++
            points += 3
          } else if (myScore === oppScore) {
            drawn++
            points += 1
          } else {
            lost++
          }
        }
      })

      return {
        ...standing,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff: goalsFor - goalsAgainst,
        points
      }
    })

    // Group, sort, and assign positions
    if (tournament.groups.length > 0) {
      const result: any[] = []
      tournament.groups.forEach((group: any) => {
        const groupStandings = standingsData.filter((s: any) => s.groupName === group.name)
        groupStandings.sort((a: any, b: any) => {
          if (b.points !== a.points) return b.points - a.points
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
          return b.goalsFor - a.goalsFor
        })
        groupStandings.forEach((s: any, idx: number) => {
          result.push({
            ...s,
            position: idx + 1
          })
        })
      })
      return result
    } else {
      const overallStandings = [...standingsData]
      overallStandings.sort((a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
        return b.goalsFor - a.goalsFor
      })
      return overallStandings.map((s: any, idx: number) => ({
        ...s,
        position: idx + 1
      }))
    }
  })()

  const hasKnockout = ['KNOCKOUT_ONLY', 'GROUP_KNOCKOUT', 'LEAGUE_PLAYOFF'].includes(tournament.tournamentType)
  const hasFixtures = tournament.matches.length > 0

  // Fetch knockout rounds if applicable
  const fetchKnockoutRounds = useCallback(() => {
    if (!hasKnockout) return
    setLoadingKnockout(true)
    fetch(`/api/seasons/${seasonId}/tournaments/${tournament.id}/knockout`)
      .then(res => res.json())
      .then(data => {
        setKnockoutRounds(data)
        setLoadingKnockout(false)
      })
      .catch(err => {
        console.error('Error fetching knockout rounds:', err)
        setLoadingKnockout(false)
      })
  }, [hasKnockout, seasonId, tournament.id])

  useEffect(() => {
    if (activeTab === 'knockout') {
      fetchKnockoutRounds()
    }
  }, [activeTab, fetchKnockoutRounds])

  const tabs = [
    { id: 'fixtures', label: 'Fixtures', count: tournament.matches.length },
    ...(hasFixtures ? [{ id: 'rounds', label: 'Manage Rounds', count: 0 }] : []),
    ...(hasFixtures ? [{ id: 'calendar', label: 'Calendar Editor', count: 0 }] : []),
    ...(tournament.tournamentType !== 'KNOCKOUT_ONLY' ? [{ id: 'standings', label: 'Standings', count: tournament.standings.length }] : []),
    { id: 'stats', label: 'Stats', count: 0 },
    ...(tournament.groups.length > 0 ? [{ id: 'groups', label: 'Groups', count: tournament.groups.length }] : []),
    ...(hasKnockout ? [{ id: 'knockout', label: 'Knockout', count: knockoutRounds.length }] : [])
  ]

  // Get available teams for knockout (from standings with positions and group names)
  const availableTeams = standingsWithPositions.map((standing: any) => ({
    id: standing.teamId,
    teamId: standing.seasonTeam?.team?.id,
    name: standing.seasonTeam?.team?.name,
    logoUrl: standing.seasonTeam?.team?.logoUrl,
    position: standing.position,
    points: standing.points,
    groupName: standing.groupName
  }))

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 sm:mb-8 border-b border-white/5 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 sm:px-6 py-3 font-black transition-all relative whitespace-nowrap text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === tab.id
                ? 'text-[#FFB347] drop-shadow-[0_0_8px_rgba(255,179,71,0.15)]'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20'
                    : 'bg-white/5 text-gray-400 border border-white/5'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E8A800] to-[#FFB347] rounded-full shadow-[0_0_10px_rgba(232,168,0,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'fixtures' && (
          <FixturesList
            matches={tournament.matches}
            tournamentId={tournament.id}
            seasonId={seasonId}
            tournamentName={tournament.name}
            seasonName={tournament.season?.name || ''}
          />
        )}
        {activeTab === 'rounds' && hasFixtures && (
          <MatchRoundManager
            matches={tournament.matches}
            tournamentId={tournament.id}
            seasonId={seasonId}
          />
        )}
        {activeTab === 'calendar' && hasFixtures && (
          <FixtureCalendarEditor
            matches={tournament.matches}
            tournamentId={tournament.id}
            seasonId={seasonId}
          />
        )}
        {activeTab === 'standings' && tournament.tournamentType !== 'KNOCKOUT_ONLY' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-[#0D0D0D]/90 border border-white/5 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Round Filter dropdown */}
                {roundOptions.length > 0 && (
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-extrabold tracking-widest font-mono mb-1.5">Filter Round Limit</label>
                    <select
                      value={activeRoundLimit}
                      onChange={(e) => setActiveRoundLimit(e.target.value)}
                      className="bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider transition-all hover:bg-white/[0.03] w-fit"
                    >
                      {roundOptions.map((r: string) => (
                        <option key={r} value={r} className="bg-[#0c0c0c] text-white">{r === 'All Matchdays' ? 'All Matchdays' : `Up to ${r}`}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Week Filter dropdown */}
                {weekOptions.length > 1 && (
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-extrabold tracking-widest font-mono mb-1.5">Filter by Week</label>
                    <select
                      value={activeWeekFilter}
                      onChange={(e) => setActiveWeekFilter(e.target.value)}
                      className="bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider transition-all hover:bg-white/[0.03] w-fit"
                    >
                      {weekOptions.map((w: string) => (
                        <option key={w} value={w} className="bg-[#0c0c0c] text-white">{w}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end sm:ml-auto">
                <ShareableAdminStandings
                  standings={standingsWithPositions}
                  groups={tournament.groups}
                  tournamentName={tournament.name}
                  seasonName={tournament.season?.name ?? ''}
                />
              </div>
            </div>
            <StandingsTable
              standings={standingsWithPositions}
              groups={tournament.groups}
            />
          </div>
        )}
        {activeTab === 'stats' && (
          <TournamentStats
            teams={statsTeams}
            teamLinkBase={`/sub-admin/${seasonId}/teams`}
            matches={tournament.matches}
            teamsData={teams}
            tournamentName={tournament.name}
            seasonName={tournament.season?.name || ''}
            activeRoundLimit={activeRoundLimit}
            setActiveRoundLimit={setActiveRoundLimit}
            tournamentId={tournament.id}
            seasonId={seasonId}
          />
        )}
        {activeTab === 'groups' && tournament.groups.length > 0 && (
          <GroupsView
            groups={tournament.groups}
            matches={tournament.matches}
            standings={tournament.standings}
          />
        )}
        {activeTab === 'knockout' && hasKnockout && (
          loadingKnockout ? (
            <div className="text-center py-8 sm:py-12 text-[#7A7367] text-sm sm:text-base">Loading knockout rounds...</div>
          ) : (
            <KnockoutRoundManager
              tournament={tournament}
              seasonId={seasonId}
              availableTeams={availableTeams}
              existingRounds={knockoutRounds}
              onSuccess={fetchKnockoutRounds}
            />
          )
        )}
      </div>
    </div>
  )
}
