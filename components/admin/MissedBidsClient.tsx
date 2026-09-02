'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchableSelect from '@/components/ui/SearchableSelect'
import TeamLogo from '@/components/team/TeamLogo'

interface Season {
  id: string
  name: string
  seasonNumber: number
}

interface Team {
  id: string
  name: string
  logoUrl: string
  managerName: string
}

interface MissedRound {
  id: string
  roundNumber: number
  position: string | null
  roundType: string
  status: string
  position_group: string | null
}

interface TeamStats extends Team {
  totalRounds: number
  submittedRoundsCount: number
  missedRoundsCount: number
  missedRounds: MissedRound[]
}

interface RoundSummary {
  id: string
  roundNumber: number
  position: string | null
  roundType: string
  status: string
  position_group: string | null
  submittedCount: number
  missedCount: number
  submittedTeams: Team[]
  missedTeams: Team[]
}

interface MissedBidsClientProps {
  initialSeasonId: string
}

export default function MissedBidsClient({ initialSeasonId }: MissedBidsClientProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState(initialSeasonId)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    season: Season
    allSeasons: Season[]
    totalRounds: number
    teamsPerfect: TeamStats[]
    teamsWithMissedBids: TeamStats[]
    roundsSummary: RoundSummary[]
  } | null>(null)

  const [activeTab, setActiveTab] = useState<'teams' | 'rounds'>('teams')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)

  useEffect(() => {
    fetchData(seasonId)
  }, [seasonId])

  const fetchData = async (sId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/seasons/${sId}/missed-bids`)
      const result = await res.json()
      if (res.ok) {
        setData(result)
      } else {
        console.error('Failed to load missed bids audit:', result.error)
      }
    } catch (err) {
      console.error('Error loading missed bids audit:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeasonChange = (newSeasonId: string) => {
    if (newSeasonId && newSeasonId !== seasonId) {
      setSeasonId(newSeasonId)
      router.push(`/sub-admin/${newSeasonId}/tools/missed-bids`)
    }
  }

  // CSV Export
  const exportCSV = () => {
    if (!data) return
    let csv = `Season: ${data.season.name}\n`
    csv += `Total Auction Rounds: ${data.totalRounds}\n\n`
    
    csv += `TEAMS WITH MISSED BIDS\n`
    csv += `Team Name,Manager,Submitted Rounds,Missed Rounds Count,Missed Round Numbers\n`
    data.teamsWithMissedBids.forEach(t => {
      const missedList = t.missedRounds.map(r => `Round ${r.roundNumber} (${r.position || r.position_group || 'General'})`).join('; ')
      csv += `"${t.name}","${t.managerName}",${t.submittedRoundsCount},${t.missedRoundsCount},"${missedList}"\n`
    })

    csv += `\nTEAMS WITH 100% PARTICIPATION\n`
    csv += `Team Name,Manager,Submitted Rounds,Missed Rounds Count\n`
    data.teamsPerfect.forEach(t => {
      csv += `"${t.name}","${t.managerName}",${t.submittedRoundsCount},0\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Missed_Bids_${data.season.name.replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Search Filter
  const filteredTeamsWithMissedBids = data?.teamsWithMissedBids.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.managerName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const filteredTeamsPerfect = data?.teamsPerfect.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.managerName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const filteredRoundsSummary = data?.roundsSummary.filter(r => 
    `round ${r.roundNumber}`.includes(searchQuery.toLowerCase()) ||
    (r.position && r.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.position_group && r.position_group.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  const totalMissedCount = data?.teamsWithMissedBids.reduce((sum, t) => sum + t.missedRoundsCount, 0) || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/sub-admin/${seasonId}/tools`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Tools
        </Link>

        {data && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] hover:bg-[#E8A800]/20 transition-all text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV Report
          </button>
        )}
      </div>

      {/* Header & Season Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider">
            Missed Bids Audit
          </h1>
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest font-mono">
            Track auction round participation and missed bidding deadlines
          </p>
        </div>

        {data && (
          <div className="w-full md:w-72">
            <SearchableSelect
              label="Select Season"
              value={seasonId}
              options={data.allSeasons.map(s => ({ value: s.id, label: s.name }))}
              onChange={handleSeasonChange}
              enableSearch={false}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#E8A800] border-t-transparent mb-4"></div>
          <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider font-mono">Loading participation data...</div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-red-400 font-bold">Failed to load data for this season.</div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-md">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono mb-1">Total Auction Rounds</div>
              <div className="text-3xl font-black text-white">{data.totalRounds}</div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-md">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono mb-1">100% Perfect Teams</div>
              <div className="text-3xl font-black text-emerald-400">{data.teamsPerfect.length}</div>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-md">
              <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider font-mono mb-1">Teams with Missed Bids</div>
              <div className="text-3xl font-black text-rose-400">{data.teamsWithMissedBids.length}</div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-md">
              <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-mono mb-1">Total Missed Submissions</div>
              <div className="text-3xl font-black text-amber-400">{totalMissedCount}</div>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-5 py-2.5 rounded-xl font-black transition-all text-xs uppercase tracking-wider cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-lg'
                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Teams Overview
              </button>
              <button
                onClick={() => setActiveTab('rounds')}
                className={`px-5 py-2.5 rounded-xl font-black transition-all text-xs uppercase tracking-wider cursor-pointer ${
                  activeTab === 'rounds'
                    ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-lg'
                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Round-by-Round Audit ({data.roundsSummary.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search team or manager..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* TAB 1: TEAMS OVERVIEW */}
          {activeTab === 'teams' && (
            <div className="space-y-8">
              {/* SECTION A: TEAMS WITH MISSED BIDS */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">
                    Teams with Missed Bids ({filteredTeamsWithMissedBids.length})
                  </h2>
                </div>

                {filteredTeamsWithMissedBids.length === 0 ? (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-8 text-center text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
                    {searchQuery ? 'No matching teams found' : '🎉 No teams missed any bidding rounds!'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeamsWithMissedBids.map(team => {
                      const isExpanded = expandedTeamId === team.id
                      return (
                        <div
                          key={team.id}
                          className="bg-white/[0.01] border border-rose-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-md transition-all hover:border-rose-500/40"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="sm" />
                              <div>
                                <div className="font-extrabold text-white text-base">{team.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                                  Manager: {team.managerName}
                                </div>
                              </div>
                            </div>

                            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-xs uppercase tracking-wider font-mono">
                              Missed {team.missedRoundsCount} {team.missedRoundsCount === 1 ? 'Round' : 'Rounds'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-400 font-mono mb-3">
                            Submitted: <span className="text-emerald-400 font-bold">{team.submittedRoundsCount}</span> / {team.totalRounds} rounds
                          </div>

                          {/* Missed Rounds Pills / Dropdown */}
                          <div className="border-t border-white/5 pt-3">
                            <button
                              onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                              className="w-full flex items-center justify-between text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>View Missed Rounds ({team.missedRounds.length})</span>
                              <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {isExpanded && (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {team.missedRounds.map(r => (
                                  <div
                                    key={r.id}
                                    className="p-2 rounded-lg bg-black/40 border border-rose-500/20 text-[11px] text-gray-300 font-mono"
                                  >
                                    <div className="font-bold text-rose-300">Round {r.roundNumber}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">
                                      {r.position || r.position_group || r.roundType}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECTION B: 100% PERFECT TEAMS */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">
                    Teams with 100% Participation ({filteredTeamsPerfect.length})
                  </h2>
                </div>

                {filteredTeamsPerfect.length === 0 ? (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-8 text-center text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
                    No teams submitted bids in every round.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredTeamsPerfect.map(team => (
                      <div
                        key={team.id}
                        className="bg-white/[0.01] border border-emerald-500/20 rounded-xl p-3.5 backdrop-blur-xl flex items-center gap-3"
                      >
                        <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white text-xs truncate">{team.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{team.managerName}</div>
                        </div>
                        <span className="text-emerald-400 font-black text-xs uppercase tracking-wider font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                          100%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ROUND-BY-ROUND AUDIT */}
          {activeTab === 'rounds' && (
            <div className="space-y-4">
              {filteredRoundsSummary.map(round => {
                const isExpanded = expandedRoundId === round.id
                return (
                  <div
                    key={round.id}
                    className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-md transition-all hover:border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white uppercase">
                            Round {round.roundNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 font-bold text-[10px] uppercase font-mono">
                            {round.position || round.position_group || round.roundType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            round.status === 'completed' || round.status === 'finalized'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {round.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-gray-400">
                          Submitted: <span className="text-emerald-400 font-bold">{round.submittedCount}</span> | Missed: <span className="text-rose-400 font-bold">{round.missedCount}</span>
                        </div>

                        <button
                          onClick={() => setExpandedRoundId(isExpanded ? null : round.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          {isExpanded ? 'Hide Teams' : 'View Teams'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 border-t border-white/5 pt-4 space-y-4">
                        {/* Missed Teams */}
                        {round.missedTeams.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 font-mono">
                              ❌ Teams That Missed Bidding ({round.missedTeams.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {round.missedTeams.map(t => (
                                <div
                                  key={t.id}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2"
                                >
                                  <TeamLogo logoUrl={t.logoUrl} teamName={t.name} size="xs" />
                                  <span>{t.name}</span>
                                  <span className="text-[10px] opacity-75">({t.managerName})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Submitted Teams */}
                        {round.submittedTeams.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 font-mono">
                              ✅ Teams That Submitted Bids ({round.submittedTeams.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {round.submittedTeams.map(t => (
                                <div
                                  key={t.id}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2"
                                >
                                  <TeamLogo logoUrl={t.logoUrl} teamName={t.name} size="xs" />
                                  <span>{t.name}</span>
                                  <span className="text-[10px] opacity-75">({t.managerName})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
