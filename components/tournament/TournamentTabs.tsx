'use client'

import { useState, useEffect } from 'react'
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
  const [knockoutRounds, setKnockoutRounds] = useState<any[]>([])
  const [loadingKnockout, setLoadingKnockout] = useState(false)
  const [activeRoundLimit, setActiveRoundLimit] = useState<string>('All Matchdays')

  // Dynamic Round Filter options based on all rounds
  const baseRounds = (tournament.matches 
    ? Array.from(new Set(tournament.matches.filter((m: any) => m.round).map((m: any) => m.round as string))).sort((a: any, b: any) => {
        const getRoundNum = (name: string) => {
          const num = name.match(/\d+/)
          return num ? parseInt(num[0], 10) : 1
        }
        return getRoundNum(a as string) - getRoundNum(b as string)
      })
    : []) as string[]
  const roundOptions: string[] = baseRounds.length > 0 ? ['All Matchdays', ...baseRounds] : []

  // Dynamic Round Standings Calculation
  const standingsWithPositions = (() => {
    const standingsData = tournament.standings.map((standing: any) => {
      const teamId = standing.teamId
      
      const relevantMatches = tournament.matches.filter((m: any) => {
        if (m.status !== 'COMPLETED' && m.status !== 'WALKOVER') return false
        if (activeRoundLimit !== 'All Matchdays') {
          const getRoundNum = (name: string) => {
            const num = name.match(/\d+/)
            return num ? parseInt(num[0], 10) : 1
          }
          const matchRoundNum = getRoundNum(m.round || '')
          const limitRoundNum = getRoundNum(activeRoundLimit)
          if (matchRoundNum > limitRoundNum) return false
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
  useEffect(() => {
    if (hasKnockout && activeTab === 'knockout') {
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
    }
  }, [hasKnockout, activeTab, seasonId, tournament.id])

  const tabs = [
    { id: 'fixtures', label: 'Fixtures', count: tournament.matches.length },
    ...(hasFixtures ? [{ id: 'rounds', label: 'Manage Rounds', count: 0 }] : []),
    ...(hasFixtures ? [{ id: 'calendar', label: 'Calendar Editor', count: 0 }] : []),
    { id: 'standings', label: 'Standings', count: tournament.standings.length },
    { id: 'stats', label: 'Stats', count: 0 },
    ...(tournament.groups.length > 0 ? [{ id: 'groups', label: 'Groups', count: tournament.groups.length }] : []),
    ...(hasKnockout ? [{ id: 'knockout', label: 'Knockout', count: knockoutRounds.length }] : [])
  ]

  // Get available teams for knockout (from standings)
  const availableTeams = tournament.standings.map((standing: any) => ({
    id: standing.teamId,
    teamId: standing.seasonTeam?.team?.id,
    name: standing.seasonTeam?.team?.name,
    logoUrl: standing.seasonTeam?.team?.logoUrl,
    position: standing.position,
    points: standing.points
  }))

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 sm:px-6 py-2 sm:py-3 font-bold transition-all relative whitespace-nowrap text-sm sm:text-base ${
              activeTab === tab.id
                ? 'text-[#E8A800]'
                : 'text-[#7A7367] hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full bg-white/10">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347]" />
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
        {activeTab === 'standings' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/5 border border-white/10 p-4 rounded-xl">
              {/* Round Filter dropdown */}
              {roundOptions.length > 0 ? (
                <div className="flex flex-col">
                  <label className="text-[10px] text-[#7A7367] uppercase font-bold tracking-wider mb-1">Filter Round Limit</label>
                  <select
                    value={activeRoundLimit}
                    onChange={(e) => setActiveRoundLimit(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer w-fit"
                  >
                    {roundOptions.map((r: string) => (
                      <option key={r} value={r}>{r === 'All Matchdays' ? 'All Matchdays' : `Up to ${r}`}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
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
            />
          )
        )}
      </div>
    </div>
  )
}
