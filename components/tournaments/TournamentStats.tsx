'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export interface TeamStatRow {
  teamId: string
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
}

export default function TournamentStats({ teams, myTeamId, teamLinkBase = '/teams' }: TournamentStatsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('golden-boot')

  if (teams.length === 0) {
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

  // Sorted lists for each award
  const goldenBootRanking = [...teams].sort((a, b) => b.goalsFor - a.goalsFor || b.won - a.won)
  const goldenBallRanking = [...teams].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
  const goldenGloveRanking = [...teams]
    .filter(t => t.played > 0)
    .sort((a, b) => a.goalsAgainst - b.goalsAgainst || (b.cleanSheets ?? 0) - (a.cleanSheets ?? 0))

  const rankingMap: Record<Tab, TeamStatRow[]> = {
    'golden-boot': goldenBootRanking,
    'golden-ball': goldenBallRanking,
    'golden-glove': goldenGloveRanking,
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
  const totalGoals = teams.reduce((s, t) => s + t.goalsFor, 0)
  const totalMatches = teams.reduce((s, t) => s + t.played, 0) / 2
  const totalCleanSheets = teams.reduce((s, t) => s + (t.cleanSheets ?? 0), 0)
  const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { icon: '⚽', value: Math.round(totalMatches), label: 'Matches Played' },
          { icon: '🥅', value: totalGoals, label: 'Total Goals' },
          { icon: '📊', value: avgGoalsPerMatch, label: 'Avg Goals / Match' },
          { icon: '🧤', value: totalCleanSheets, label: 'Clean Sheets' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="rounded-xl bg-[#111111] border border-white/10 p-2.5 sm:p-4 text-center min-w-0">
            <div className="text-xl sm:text-2xl mb-1">{icon}</div>
            <div className="text-lg sm:text-xl font-black text-[#F5F0E8]">{value}</div>
            <div className="text-[9px] sm:text-[10px] text-[#7A7367] uppercase tracking-normal sm:tracking-wider line-clamp-2">{label}</div>
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
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-[var(--accent)]/40 bg-[var(--accent)]/8 shadow-lg shadow-[var(--accent)]/10'
                  : 'border-white/10 bg-[#111111] hover:border-white/20 hover:bg-[#141414]'
              }`}
              style={{ '--accent': tab.accentColor } as React.CSSProperties}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all"
                style={{
                  background: isActive ? `${tab.accentColor}20` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${isActive ? `${tab.accentColor}50` : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {tab.emoji}
              </div>
              <div className="min-w-0">
                <div className={`font-black text-sm transition-colors ${isActive ? 'text-[#F5F0E8]' : 'text-[#7A7367]'}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-[#7A7367] truncate">
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
      <div className="rounded-xl border bg-[#111111] overflow-hidden" style={{ borderColor: `${activeTabData.accentColor}25` }}>
        {/* List header */}
        <div
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{ borderColor: `${activeTabData.accentColor}15`, background: `${activeTabData.accentColor}06` }}
        >
          <span className="text-xl">{activeTabData.emoji}</span>
          <div>
            <div className="font-black text-sm text-[#F5F0E8]">{activeTabData.label}</div>
            <div className="text-[11px] text-[#7A7367]">{activeTabData.sublabel} — All {rankedTeams.length} teams ranked</div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {rankedTeams.map((team, idx) => {
            const isMe = myTeamId && team.teamId === myTeamId
            const metric = getMetric(team)
            const pos = idx + 1
            const posStyle =
              pos === 1 ? { bg: '#FFD700', text: '#0a0a0a' } :
              pos === 2 ? { bg: '#C0C0C0', text: '#0a0a0a' } :
              pos === 3 ? { bg: '#CD7F32', text: '#0a0a0a' } :
              { bg: 'rgba(255,255,255,0.05)', text: '#7A7367' }

            return (
              <Link
                key={team.teamId}
                href={`${teamLinkBase}/${team.teamId}`}
                className={`flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 transition-colors group ${
                  isMe ? 'bg-[#E8A800]/[0.06]' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Position */}
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: posStyle.bg, color: posStyle.text }}
                >
                  {pos}
                </div>

                {/* Logo */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-md overflow-hidden">
                  {team.logoUrl ? (
                    <Image src={team.logoUrl} alt={team.teamName} fill className="object-contain" sizes="36px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[#7A7367] bg-white/5">
                      {team.teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Team name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-xs sm:text-sm group-hover:text-[#E8A800] transition-colors truncate ${isMe ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
                    {team.teamName}
                    {isMe && <span className="ml-1.5 text-[8px] font-black text-[#E8A800]/60 uppercase sm:inline hidden">You</span>}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#7A7367] truncate">{metric.secondary}</div>
                </div>

                {/* Bar */}
                <div className="hidden sm:flex flex-col items-end gap-1 w-28 flex-shrink-0">
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
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
                    style={{ color: pos <= 3 ? activeTabData.accentColor : isMe ? '#E8A800' : '#F5F0E8' }}
                  >
                    {metric.primary}
                  </div>
                  <div className="text-[10px] text-[#7A7367] uppercase">{metric.primaryLabel}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
