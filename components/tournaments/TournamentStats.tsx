'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { captureTableAsPng } from '@/lib/share-table'
import StatsPoster from './StatsPoster'

export interface TeamStatRow {
  teamId: string
  seasonTeamId: string
  teamName: string
  logoUrl?: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  cleanSheets?: number
  managerName?: string
  position?: number
  primaryColor?: string
}

type Tab = 'golden-boot' | 'golden-ball' | 'golden-glove'

const TABS: { id: Tab; label: string; emoji: string; sublabel: string; accentColor: string }[] = [
  { id: 'golden-boot', label: 'Golden Boot', emoji: '🥇', sublabel: 'Most Goals Scored', accentColor: '#FFD700' },
  { id: 'golden-ball', label: 'Golden Ball', emoji: '🥊', sublabel: 'Best Performance', accentColor: '#E8A800' },
  { id: 'golden-glove', label: 'Golden Glove', emoji: '🧤', sublabel: 'Best Defense', accentColor: '#60A5FA' },
]

interface TournamentStatsProps {
  teams: TeamStatRow[]
  myTeamId?: string | null
  teamLinkBase?: string
  matches?: any[]
  teamsData?: any[]
  tournamentName?: string
  seasonName?: string
  activeRoundLimit?: string
  setActiveRoundLimit?: (limit: string) => void
  hideShareOptions?: boolean
}

export default function TournamentStats({ 
  teams, 
  myTeamId, 
  teamLinkBase = '/teams',
  matches,
  teamsData,
  tournamentName,
  seasonName,
  activeRoundLimit: externalRoundLimit,
  setActiveRoundLimit: externalSetRoundLimit,
  hideShareOptions = false
}: TournamentStatsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('golden-boot')
  
  // Dynamic Round Filter
  const baseRounds = matches 
    ? Array.from(new Set(matches.filter(m => m.round).map(m => m.round as string))).sort((a, b) => {
        const getRoundNum = (name: string) => {
          const num = name.match(/\d+/)
          return num ? parseInt(num[0], 10) : 1
        }
        return getRoundNum(a) - getRoundNum(b)
      })
    : []
  const roundOptions = baseRounds.length > 0 ? ['All Matchdays', ...baseRounds] : []
  
  const [internalRoundLimit, setInternalRoundLimit] = useState<string>('All Matchdays')
  const activeRoundLimit = externalRoundLimit !== undefined ? externalRoundLimit : internalRoundLimit
  const setActiveRoundLimit = externalSetRoundLimit !== undefined ? externalSetRoundLimit : setInternalRoundLimit
  
  // Custom Share Image Settings
  const [imageTeamsLimit, setImageTeamsLimit] = useState<string>('5')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const snapshotRef = useRef<HTMLDivElement>(null)

  if (teams.length === 0 && (!teamsData || teamsData.length === 0)) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
        <svg className="w-14 h-14 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-bold text-[#F5F0E8] mb-1">No Stats Yet</h3>
        <p className="text-sm text-[#7A7367]">Stats will appear once matches are completed.</p>
      </div>
    )
  }

  // Dynamic Round Calculation
  const computedTeams = (matches && teamsData)
    ? teamsData.map(team => {
        const relevantMatches = matches.filter(m => {
          if (m.status !== 'COMPLETED') return false
          if (activeRoundLimit !== 'All Matchdays') {
            const getRoundNum = (name: string) => {
              const num = name.match(/\d+/)
              return num ? parseInt(num[0], 10) : 1
            }
            const matchRoundNum = getRoundNum(m.round || '')
            const limitRoundNum = getRoundNum(activeRoundLimit)
            if (matchRoundNum > limitRoundNum) return false
          }
          return m.homeTeamId === team.id || m.awayTeamId === team.id
        })

        let played = 0
        let won = 0
        let drawn = 0
        let lost = 0
        let goalsFor = 0
        let goalsAgainst = 0
        let cleanSheets = 0
        let points = 0

        relevantMatches.forEach(m => {
          const isHome = m.homeTeamId === team.id
          const myScore = isHome ? m.homeScore : m.awayScore
          const oppScore = isHome ? m.awayScore : m.homeScore

          if (myScore !== null && oppScore !== null) {
            played++
            goalsFor += myScore
            goalsAgainst += oppScore
            if (oppScore === 0) cleanSheets++

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
          teamId: team.teamId || team.id,
          seasonTeamId: team.id,
          teamName: team.name,
          logoUrl: team.logoUrl,
          managerName: team.managerName,
          primaryColor: team.primaryColor,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDiff: goalsFor - goalsAgainst,
          points,
          cleanSheets
        }
      })
    : teams

  // Sorted lists for each award
  const goldenBootRanking = [...computedTeams].sort((a, b) => b.goalsFor - a.goalsFor || b.won - a.won)
  const goldenBallRanking = [...computedTeams].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
  const goldenGloveRanking = [...computedTeams]
    .filter(t => t.played > 0)
    .sort((a, b) => a.goalsAgainst - b.goalsAgainst || (b.cleanSheets ?? 0) - (a.cleanSheets ?? 0))

  // Fallback sorted glove in case no games played yet
  const fallbackGoldenGlove = [...computedTeams].sort((a, b) => a.goalsAgainst - b.goalsAgainst)

  const rankingMap: Record<Tab, TeamStatRow[]> = {
    'golden-boot': goldenBootRanking,
    'golden-ball': goldenBallRanking,
    'golden-glove': goldenGloveRanking.length > 0 ? goldenGloveRanking : fallbackGoldenGlove,
  }

  const metricMap: Record<Tab, (t: TeamStatRow) => { primary: number; primaryLabel: string; secondary: string }> = {
    'golden-boot': t => ({
      primary: t.goalsFor,
      primaryLabel: 'Goals',
      secondary: `${t.played} played · ${t.won}W ${t.drawn}D ${t.lost}L`,
    }),
    'golden-ball': t => ({
      primary: t.points,
      primaryLabel: 'Pts',
      secondary: `GD ${t.goalDiff > 0 ? '+' : ''}${t.goalDiff} · ${t.goalsFor} GF`,
    }),
    'golden-glove': t => ({
      primary: t.goalsAgainst,
      primaryLabel: 'GA',
      secondary: `${t.cleanSheets ?? 0} clean sheets · ${t.played} played`,
    }),
  }

  const activeTabData = TABS.find(t => t.id === activeTab)!
  const rankedTeams = rankingMap[activeTab]
  const getMetric = metricMap[activeTab]

  // Summary stats
  const totalGoals = computedTeams.reduce((s, t) => s + t.goalsFor, 0)
  const totalMatches = computedTeams.reduce((s, t) => s + t.played, 0) / 2
  const totalCleanSheets = computedTeams.reduce((s, t) => s + (t.cleanSheets ?? 0), 0)
  const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0'

  // Excel/CSV Export Handler
  const handleExportExcel = () => {
    const headers = ['Rank', 'Team Name', 'Matches Played', 'Wins', 'Draws', 'Losses', 'Goals For', 'Goals Against', 'Goal Difference', 'Points', 'Clean Sheets']
    const rows = rankedTeams.map((t, idx) => [
      idx + 1,
      t.teamName,
      t.played,
      t.won,
      t.drawn,
      t.lost,
      t.goalsFor,
      t.goalsAgainst,
      t.goalDiff,
      t.points,
      t.cleanSheets ?? 0
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${(tournamentName || 'Tournament').replace(/\s+/g, '_')}_Stats_${activeTab}_${activeRoundLimit.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Image Sharing capture logic
  const handleShareImage = async () => {
    if (!snapshotRef.current || sharing) return
    setSharing(true)
    try {
      const dataUrl = await captureTableAsPng(snapshotRef.current)
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${activeTab}-stats-leaderboard.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${tournamentName || 'TFC'} — ${activeTabData.label} Leaderboard` })
      } else {
        await handleDownloadImage()
        return
      }
      setShareDone(true)
      setTimeout(() => setShareDone(false), 2500)
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setSharing(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!snapshotRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await captureTableAsPng(snapshotRef.current)
      const blob = await (await fetch(dataUrl)).blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${(tournamentName || 'TFC').replace(/\s+/g, '-').toLowerCase()}-${activeTab}-leaderboard.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      setDownloadDone(true)
      setTimeout(() => setDownloadDone(false), 2500)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Off-screen Image Render Container */}
      <div style={{ 
        position: 'fixed', 
        left: '-9999px', 
        top: '-9999px', 
        width: '800px',
        overflow: 'hidden',
        pointerEvents: 'none',
        visibility: 'hidden',
        zIndex: -1
      }}>
        <div
          ref={snapshotRef}
          style={{
            background: 'radial-gradient(circle at top left, #121e1a, #070707)',
            padding: '48px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            width: '800px',
            boxSizing: 'border-box',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
            <div>
              <div style={{ color: activeTabData.accentColor, fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
                {seasonName || 'Season'} · {activeRoundLimit}
              </div>
              <div style={{ color: '#FFFFFF', fontSize: 34, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
                {tournamentName || 'Tournament Stats'}
              </div>
              <div style={{ color: '#A0988A', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{activeTabData.emoji}</span>
                <span>{activeTabData.label} Leaderboard</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${activeTabData.accentColor}15`, border: `1.5px solid ${activeTabData.accentColor}30`, padding: '6px 14px', borderRadius: '30px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: activeTabData.accentColor }}></div>
                <span style={{ color: activeTabData.accentColor, fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>LEADERBOARD</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#111111' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['#', 'Team', activeTabData.label === 'Golden Glove' ? 'GA' : activeTabData.label === 'Golden Boot' ? 'Goals' : 'Points', 'Record'].map((h, i) => (
                    <th key={h} style={{
                      padding: i === 0 ? '16px 10px 16px 20px' : i === 1 ? '16px 10px' : '16px 14px',
                      textAlign: i <= 1 ? 'left' : 'center',
                      color: i === 2 ? activeTabData.accentColor : '#A0988A',
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankedTeams.slice(0, imageTeamsLimit === 'all' ? rankedTeams.length : Number(imageTeamsLimit)).map((t, idx) => {
                  const metric = getMetric(t)
                  const pos = idx + 1
                  const isTop3 = pos <= 3
                  const posBg = pos === 1 ? '#FFD700' : pos === 2 ? '#C0C0C0' : pos === 3 ? '#CD7F32' : 'rgba(255,255,255,0.06)'
                  const posColor = pos <= 3 ? '#0a0a0a' : '#A0988A'

                  return (
                    <tr key={t.teamId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px 10px 16px 20px', width: '40px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, backgroundColor: posBg, color: posColor }}>
                          {pos}
                        </div>
                      </td>
                      <td style={{ padding: '16px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 800, color: '#F5F0E8', fontSize: 15 }}>
                            {t.teamName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 14px', textAlign: 'center', fontWeight: 900, color: isTop3 ? activeTabData.accentColor : '#F5F0E8', fontSize: 16 }}>
                        {metric.primary}
                      </td>
                      <td style={{ padding: '16px 14px', textAlign: 'center', color: '#A0988A', fontSize: 13, fontWeight: 600 }}>
                        {metric.secondary}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer watermark */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#41574e', fontSize: 12, fontWeight: 700, marginTop: 24 }}>
            <div>turfcats.vercel.app</div>
            <div>Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Control panel: Round Limits, Share / Export Tools */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-4 sm:p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/[0.01] rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          {/* Round Filter dropdown */}
          {roundOptions.length > 0 && (
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider mb-1.5">Filter Round Limit</label>
              <select
                value={activeRoundLimit}
                onChange={(e) => setActiveRoundLimit(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer backdrop-blur-md"
              >
                {roundOptions.map(r => (
                  <option key={r} value={r} className="bg-[#0a0a0a] text-white">{r === 'All Matchdays' ? 'All Matchdays' : `Up to ${r}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Share Limit select */}
          {!hideShareOptions && (
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider mb-1.5">Teams in Share Card</label>
              <select
                value={imageTeamsLimit}
                onChange={(e) => setImageTeamsLimit(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer backdrop-blur-md"
              >
                <option value="3" className="bg-[#0a0a0a] text-white">Top 3 Teams</option>
                <option value="5" className="bg-[#0a0a0a] text-white">Top 5 Teams</option>
                <option value="10" className="bg-[#0a0a0a] text-white">Top 10 Teams</option>
                <option value="all" className="bg-[#0a0a0a] text-white">All Teams</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-end relative z-10">
          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="group relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            <span>📥</span> Export Excel (CSV)
          </button>

          {/* Download Image */}
          {!hideShareOptions && (
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className={`group relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-gray-300 hover:text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 cursor-pointer ${downloadDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}`}
            >
              <span>🖼️</span> {downloadDone ? 'Downloaded!' : downloading ? 'Loading…' : 'Download Image'}
            </button>
          )}

          {/* Share Image */}
          {!hideShareOptions && (
            <button
              onClick={handleShareImage}
              disabled={sharing}
              className={`group relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] text-black rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 cursor-pointer ${shareDone ? 'from-emerald-500 to-emerald-400 text-white' : ''}`}
            >
              <span>🔗</span> {shareDone ? 'Shared!' : sharing ? 'Loading…' : 'Share Leaderboard'}
            </button>
          )}
        </div>
      </div>

      {/* Poster Studio */}
      {!hideShareOptions && (
        <StatsPoster
          teams={computedTeams}
          tournamentName={tournamentName || 'Tournament'}
          seasonName={seasonName || 'Season'}
          roundLabel={activeRoundLimit}
          activeAward={activeTab}
          imageTeamsLimit={imageTeamsLimit}
          matches={matches}
        />
      )}

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '⚽', value: Math.round(totalMatches), label: 'Matches Played', color: 'bg-blue-500/[0.02] border-blue-500/10 text-blue-400' },
          { icon: '🥅', value: totalGoals, label: 'Total Goals', color: 'bg-emerald-500/[0.02] border-emerald-500/10 text-emerald-400' },
          { icon: '📊', value: avgGoalsPerMatch, label: 'Avg Goals / Match', color: 'bg-[#E8A800]/[0.02] border-[#E8A800]/10 text-[#E8A800]' },
          { icon: '🧤', value: totalCleanSheets, label: 'Clean Sheets', color: 'bg-purple-500/[0.02] border-purple-500/10 text-purple-400' },
        ].map(({ icon, value, label, color }) => (
          <div key={label} className={`relative rounded-2xl p-4 text-center backdrop-blur-xl shadow-xl overflow-hidden ${color} border`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl sm:text-2xl font-black text-white">{value}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const winner = rankingMap[tab.id][0]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-300 transform hover:scale-[1.01] active:scale-95 cursor-pointer backdrop-blur-md relative overflow-hidden group ${
                isActive
                  ? 'border-white/10 bg-white/[0.03] shadow-xl'
                  : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
              }`}
              style={{ '--accent': tab.accentColor } as React.CSSProperties}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all duration-300"
                style={{
                  background: isActive ? `${tab.accentColor}20` : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${isActive ? `${tab.accentColor}50` : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                {tab.emoji}
              </div>
              <div className="min-w-0">
                <div className={`font-black text-xs uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">
                  {winner ? winner.teamName : '—'}
                </div>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tab.accentColor }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Full ranked list */}
      <div className="rounded-2xl border bg-white/[0.01] backdrop-blur-xl shadow-2xl overflow-hidden" style={{ borderColor: `${activeTabData.accentColor}30` }}>
        {/* List header */}
        <div
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{ borderColor: `${activeTabData.accentColor}15`, background: `${activeTabData.accentColor}06` }}
        >
          <span className="text-xl animate-pulse">{activeTabData.emoji}</span>
          <div>
            <div className="font-black text-sm text-white uppercase tracking-wider">{activeTabData.label}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{activeTabData.sublabel} — All {rankedTeams.length} teams ranked</div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {rankedTeams.map((team, idx) => {
            const isMe = myTeamId && team.teamId === myTeamId
            const metric = getMetric(team)
            const pos = idx + 1
            const posStyle =
              pos === 1 ? { bg: 'bg-[#FFD700] text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]' } :
              pos === 2 ? { bg: 'bg-slate-300 text-black' } :
              pos === 3 ? { bg: 'bg-amber-600 text-black' } :
              { bg: 'bg-white/[0.03] text-gray-400 border border-white/5' }

            return (
              <Link
                key={team.teamId}
                href={`${teamLinkBase}/${team.teamId}`}
                className={`flex items-center gap-2 px-3 py-3.5 sm:gap-4 sm:px-5 sm:py-4 transition-all duration-300 group ${
                  isMe ? 'bg-[#E8A800]/[0.05] border-y border-[#E8A800]/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Position */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-transform group-hover:scale-105 ${posStyle.bg}`}
                >
                  {pos}
                </div>

                {/* Logo */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.02] border border-white/5">
                  {team.logoUrl ? (
                    <Image src={team.logoUrl} alt={team.teamName} fill className="object-contain p-1" sizes="36px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500">
                      {team.teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Team name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-black text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors truncate ${isMe ? 'text-[#E8A800]' : 'text-white'}`}>
                    {team.teamName}
                    {isMe && <span className="ml-1.5 px-1.5 py-0.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded text-[8px] font-black text-[#E8A800] uppercase sm:inline hidden">You</span>}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 font-semibold mt-0.5 truncate">{metric.secondary}</div>
                </div>

                {/* Bar */}
                <div className="hidden sm:flex flex-col items-end gap-1 w-28 flex-shrink-0">
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${rankedTeams[0] && getMetric(rankedTeams[0]).primary > 0
                          ? Math.max(4, (metric.primary / getMetric(rankedTeams[0]).primary) * 100)
                          : 4}%`,
                        background: activeTabData.accentColor,
                        opacity: isMe ? 1 : 0.7,
                      }}
                    />
                  </div>
                </div>

                {/* Metric */}
                <div className="text-right flex-shrink-0 w-14">
                  <div
                    className="text-lg font-black"
                    style={{ color: pos <= 3 ? activeTabData.accentColor : isMe ? '#E8A800' : '#FFFFFF' }}
                  >
                    {metric.primary}
                  </div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{metric.primaryLabel}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
