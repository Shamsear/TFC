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

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [noticeTab, setNoticeTab] = useState<'warning' | 'yellow' | 'red' | 'combined'>('combined')
  const [copiedType, setCopiedType] = useState<string | null>(null)

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

  // Notice Generators
  const warningTeams = data?.teamsWithMissedBids.filter(t => t.missedRoundsCount === 1) || []
  const yellowTeams = data?.teamsWithMissedBids.filter(t => t.missedRoundsCount === 2) || []
  const redTeams = data?.teamsWithMissedBids.filter(t => t.missedRoundsCount >= 3) || []

  const generateWarningNotice = () => {
    if (!data) return ''
    const seasonName = data.season.name
    if (warningTeams.length === 0) {
      return `⚠️ *TFC ${seasonName.toUpperCase()} — OFFICIAL WARNING*\n\nNo teams currently have 1 missed bidding round.`
    }
    const teamList = warningTeams.map(t => `• ${t.name} — ${t.managerName}`).join('\n')
    return `⚠️ *TFC ${seasonName.toUpperCase()} — OFFICIAL WARNING*

Dear Managers,

The following teams have missed *1 bidding round*:

${teamList}

This is an *official warning*. Please make sure to submit your bids within the given time for all upcoming rounds.

⚠️ *Further missed rounds will result in disciplinary action.*

*1 missed round = WARNING*
*2 missed rounds = YELLOW CARD*
*3+ missed rounds = RED CARD & BANNED FROM TFC ${seasonName.toUpperCase()}*

Please take this seriously and avoid further missed rounds.

*TFC ${seasonName} Management*`
  }

  const generateYellowCardNotice = () => {
    if (!data) return ''
    const seasonName = data.season.name
    if (yellowTeams.length === 0) {
      return `🟨 *TFC ${seasonName.toUpperCase()} — YELLOW CARD*\n\nNo teams currently have 2 missed bidding rounds.`
    }
    const teamList = yellowTeams.map(t => `• ${t.name} — ${t.managerName}`).join('\n')
    return `🟨 *TFC ${seasonName.toUpperCase()} — YELLOW CARD*

Dear Managers,

The following teams have missed *2 bidding rounds*:

${teamList}

🟨 *OFFICIAL YELLOW CARD*

This is a formal disciplinary action for repeatedly missing bidding rounds.

You have been given a clear warning. *Any further missed rounds may result in a RED CARD and a ban from TFC ${seasonName.toUpperCase()}.*

Please ensure that all future bids are submitted within the announced deadline.

*Disciplinary Rules:*
⚠️ 1 missed round — Warning
🟨 2 missed rounds — Yellow Card
🟥 3+ missed rounds — Red Card & Banned for the season

*TFC ${seasonName} Management*`
  }

  const generateRedCardNotice = () => {
    if (!data) return ''
    const seasonName = data.season.name
    if (redTeams.length === 0) {
      return `🟥 *TFC ${seasonName.toUpperCase()} — RED CARD & SEASON BAN*\n\nNo teams currently have 3+ missed bidding rounds.`
    }
    const teamList = redTeams.map(t => `• ${t.name} — ${t.managerName} (${t.missedRoundsCount} missed rounds)`).join('\n')
    const teamNames = redTeams.map(t => `${t.name} — ${t.managerName}`).join(', ')
    return `🟥 *TFC ${seasonName.toUpperCase()} — RED CARD & SEASON BAN*

🚨 *OFFICIAL DISCIPLINARY NOTICE* 🚨

Dear Manager,

${teamList}

As per the tournament disciplinary rules:

🟥 *3+ missed rounds = RED CARD*
🚫 *RED CARD = BANNED FOR THE SEASON*

Therefore, *${teamNames} is officially BANNED from TFC ${seasonName.toUpperCase()} with immediate effect.*

No further bidding submissions will be accepted from this team for the remainder of the season.

Please take note that this decision has been made in accordance with the tournament rules regarding missed bidding rounds.

🚫 *BANNED FROM TFC ${seasonName.toUpperCase()}*

*TFC ${seasonName} Management*`
  }

  const generateCombinedNotice = () => {
    const parts: string[] = []
    if (warningTeams.length > 0) parts.push(generateWarningNotice())
    if (yellowTeams.length > 0) parts.push(generateYellowCardNotice())
    if (redTeams.length > 0) parts.push(generateRedCardNotice())

    if (parts.length === 0) {
      return `🎉 *TFC ${data?.season.name.toUpperCase()} — DISCIPLINARY AUDIT*\n\nAll teams have 100% participation! No warnings or cards issued.`
    }

    return parts.join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n')
  }

  const handleCopyText = (text: string, typeKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedType(typeKey)
    setTimeout(() => setCopiedType(null), 2500)
  }

  const getActiveNoticeText = () => {
    if (noticeTab === 'warning') return generateWarningNotice()
    if (noticeTab === 'yellow') return generateYellowCardNotice()
    if (noticeTab === 'red') return generateRedCardNotice()
    return generateCombinedNotice()
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
      {/* Back Link & Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Announcement Messages 📢
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Header & Season Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider">
            Missed Bids Audit
          </h1>
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest font-mono">
            Track auction round participation and generate disciplinary notices
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                      Teams with Missed Bids ({filteredTeamsWithMissedBids.length})
                    </h2>
                  </div>

                  {data.teamsWithMissedBids.length > 0 && (
                    <button
                      onClick={() => setShowAnnouncementModal(true)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 font-mono underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Generate Copyable Messages</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

                {filteredTeamsWithMissedBids.length === 0 ? (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-8 text-center text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
                    {searchQuery ? 'No matching teams found' : '🎉 No teams missed any bidding rounds!'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeamsWithMissedBids.map(team => {
                      const isExpanded = expandedTeamId === team.id
                      const badgeColor = team.missedRoundsCount >= 3 
                        ? 'bg-rose-600/20 border-rose-600/40 text-rose-400'
                        : team.missedRoundsCount === 2
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'

                      const cardBorder = team.missedRoundsCount >= 3 
                        ? 'border-rose-500/30 hover:border-rose-500/50'
                        : team.missedRoundsCount === 2
                        ? 'border-yellow-500/30 hover:border-yellow-500/50'
                        : 'border-white/10 hover:border-amber-500/30'

                      return (
                        <div
                          key={team.id}
                          className={`bg-white/[0.01] border ${cardBorder} rounded-2xl p-5 backdrop-blur-xl shadow-md transition-all`}
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

                            <span className={`px-3 py-1 rounded-full border font-black text-xs uppercase tracking-wider font-mono ${badgeColor}`}>
                              {team.missedRoundsCount >= 3 ? '🟥 RED CARD' : team.missedRoundsCount === 2 ? '🟨 YELLOW CARD' : '⚠️ WARNING'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-400 font-mono mb-3 flex items-center justify-between">
                            <span>Submitted: <strong className="text-emerald-400">{team.submittedRoundsCount}</strong> / {team.totalRounds} rounds</span>
                            <span>Missed: <strong className="text-rose-400">{team.missedRoundsCount}</strong> rounds</span>
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

      {/* ANNOUNCEMENT COPY MODAL */}
      {showAnnouncementModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-[#121212] border border-amber-500/30 p-6 sm:p-8 shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                  📢
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Copy Disciplinary Messages</h3>
                  <div className="text-xs font-bold text-gray-400 font-mono">Ready to paste directly into WhatsApp / Discord</div>
                </div>
              </div>

              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-gray-400 hover:text-white font-black text-xl px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notice Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNoticeTab('combined')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  noticeTab === 'combined'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                📋 Combined All
              </button>

              <button
                onClick={() => setNoticeTab('warning')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  noticeTab === 'warning'
                    ? 'bg-amber-500 text-black font-black shadow-md'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                ⚠️ Warning ({warningTeams.length})
              </button>

              <button
                onClick={() => setNoticeTab('yellow')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  noticeTab === 'yellow'
                    ? 'bg-yellow-400 text-black font-black shadow-md'
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                }`}
              >
                🟨 Yellow Card ({yellowTeams.length})
              </button>

              <button
                onClick={() => setNoticeTab('red')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  noticeTab === 'red'
                    ? 'bg-rose-600 text-white font-black shadow-md'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                🟥 Red Card ({redTeams.length})
              </button>
            </div>

            {/* Message Preview Text Area */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Formatted Message Text (WhatsApp Markdown):</span>
                {copiedType === noticeTab && (
                  <span className="text-emerald-400 font-bold animate-pulse">Copied to Clipboard! ✓</span>
                )}
              </div>

              <textarea
                readOnly
                value={getActiveNoticeText()}
                rows={12}
                className="w-full bg-black/60 border border-white/15 rounded-xl p-4 text-xs text-gray-200 font-mono focus:outline-none focus:border-amber-500 resize-none selection:bg-amber-500 selection:text-black"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="text-xs text-gray-500 font-mono">
                Click copy to copy formatted text with bold & emojis.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(getActiveNoticeText(), noticeTab)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copiedType === noticeTab ? 'Copied to Clipboard! ✓' : `Copy ${noticeTab.toUpperCase()} Notice`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
