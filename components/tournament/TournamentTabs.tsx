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
            <div className="flex justify-end mb-4">
              <ShareableAdminStandings
                standings={tournament.standings}
                groups={tournament.groups}
                tournamentName={tournament.name}
                seasonName={tournament.season?.name ?? ''}
              />
            </div>
            <StandingsTable
              standings={tournament.standings}
              groups={tournament.groups}
            />
          </div>
        )}
        {activeTab === 'stats' && (
          <TournamentStats
            teams={statsTeams}
            teamLinkBase={`/sub-admin/${seasonId}/teams`}
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
