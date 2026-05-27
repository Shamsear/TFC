'use client'

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
  /** Derived: games with 0 goals conceded */
  cleanSheets?: number
}

interface TournamentStatsProps {
  teams: TeamStatRow[]
  myTeamId?: string | null
  teamLinkBase?: string
}

function AwardCard({
  icon,
  label,
  sublabel,
  accentColor,
  winner,
  value,
  valueLabel,
  runnerUps,
  myTeamId,
  teamLinkBase,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  accentColor: string
  winner: TeamStatRow | null
  value: number
  valueLabel: string
  runnerUps: TeamStatRow[]
  myTeamId?: string | null
  teamLinkBase: string
}) {
  if (!winner) return null
  const isMe = myTeamId && winner.teamId === myTeamId

  return (
    <div className={`rounded-xl border bg-[#111111] overflow-hidden`} style={{ borderColor: `${accentColor}30` }}>
      {/* Award Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: `${accentColor}20`, background: `${accentColor}08` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}18`, border: `1.5px solid ${accentColor}40` }}>
            {icon}
          </div>
          <div>
            <div className="font-black text-sm text-[#F5F0E8]">{label}</div>
            <div className="text-[11px] text-[#7A7367]">{sublabel}</div>
          </div>
        </div>
      </div>

      {/* Winner */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Link href={`${teamLinkBase}/${winner.teamId}`} className="flex items-center gap-3 group/link">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/5 flex-shrink-0" style={{ border: `2px solid ${accentColor}50` }}>
              {winner.logoUrl ? (
                <Image src={winner.logoUrl} alt={winner.teamName} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-sm" style={{ color: accentColor }}>
                  {winner.teamName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className={`font-black text-base group-hover/link:text-[#FFC93A] transition-colors ${isMe ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
                {winner.teamName}
                {isMe && <span className="ml-1.5 text-[10px] font-black text-[#E8A800]/60 uppercase">You</span>}
              </div>
              <div className="text-xs text-[#7A7367]">Winner</div>
            </div>
          </Link>
          <div className="text-right">
            <div className="text-3xl font-black" style={{ color: accentColor }}>{value}</div>
            <div className="text-[10px] text-[#7A7367] uppercase tracking-wider">{valueLabel}</div>
          </div>
        </div>

        {/* Runner-ups */}
        {runnerUps.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/5">
            {runnerUps.map((t, i) => {
              const isMeRU = myTeamId && t.teamId === myTeamId
              return (
                <Link key={t.teamId} href={`${teamLinkBase}/${t.teamId}`} className="flex items-center justify-between group/ru hover:bg-white/[0.03] rounded-lg px-2 py-1 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7A7367] w-4">{i + 2}</span>
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-white/5">
                      {t.logoUrl ? (
                        <Image src={t.logoUrl} alt={t.teamName} fill className="object-cover" sizes="24px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-[#7A7367]">
                          {t.teamName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium group-hover/ru:text-[#E8A800] transition-colors ${isMeRU ? 'text-[#E8A800]' : 'text-[#D4CCBB]'}`}>
                      {t.teamName}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#7A7367]">{
                    valueLabel === 'Goals Scored' ? t.goalsFor :
                    valueLabel === 'Goals Conceded' ? t.goalsAgainst :
                    valueLabel === 'Clean Sheets' ? (t.cleanSheets ?? 0) :
                    valueLabel === 'Goal Difference' ? t.goalDiff :
                    t.won
                  }</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TournamentStats({ teams, myTeamId, teamLinkBase = '/teams' }: TournamentStatsProps) {
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

  // Golden Boot: most goals scored (most lethal attack)
  const byGoalsFor = [...teams].sort((a, b) => b.goalsFor - a.goalsFor || b.won - a.won)
  // Golden Glove: fewest goals conceded (best defense) — among teams that have played
  const byGA = [...teams].filter(t => t.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.cleanSheets! - a.cleanSheets!)
  // Golden Ball: best overall performance (points, then GD, then GF)
  const byPoints = [...teams].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)

  const goldenBootWinner = byGoalsFor[0] ?? null
  const goldenGloveWinner = byGA[0] ?? null
  const goldenBallWinner = byPoints[0] ?? null

  return (
    <div className="space-y-6">
      {/* Headline stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Matches', value: Math.max(...teams.map(t => t.played)) > 0 ? teams.reduce((s, t) => s + t.played, 0) / 2 : 0, icon: '⚽', sub: 'Played' },
          { label: 'Total Goals', value: teams.reduce((s, t) => s + t.goalsFor, 0), icon: '🥅', sub: 'Scored' },
          { label: 'Avg Goals/Match', value: (() => { const pg = Math.max(...teams.map(t => t.played)); const tg = teams.reduce((s,t) => s + t.goalsFor, 0); const tm = teams.reduce((s,t) => s + t.played, 0) / 2; return tm > 0 ? (tg / tm).toFixed(1) : '0.0' })(), icon: '📊', sub: 'Per game' },
          { label: 'Clean Sheets', value: teams.reduce((s, t) => s + (t.cleanSheets ?? 0), 0), icon: '🧤', sub: 'Total' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="rounded-xl bg-[#111111] border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-black text-[#F5F0E8]">{value}</div>
            <div className="text-[10px] text-[#7A7367] uppercase tracking-wider">{sub}</div>
          </div>
        ))}
      </div>

      {/* Award cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <AwardCard
          icon={<span className="text-xl">🥇</span>}
          label="Team Golden Boot"
          sublabel="Most goals scored"
          accentColor="#FFD700"
          winner={goldenBootWinner}
          value={goldenBootWinner?.goalsFor ?? 0}
          valueLabel="Goals Scored"
          runnerUps={byGoalsFor.slice(1, 3)}
          myTeamId={myTeamId}
          teamLinkBase={teamLinkBase}
        />

        <AwardCard
          icon={<span className="text-xl">🥊</span>}
          label="Team Golden Ball"
          sublabel="Best overall performance"
          accentColor="#E8A800"
          winner={goldenBallWinner}
          value={goldenBallWinner?.points ?? 0}
          valueLabel="Points"
          runnerUps={byPoints.slice(1, 3)}
          myTeamId={myTeamId}
          teamLinkBase={teamLinkBase}
        />

        <AwardCard
          icon={<span className="text-xl">🧤</span>}
          label="Team Golden Glove"
          sublabel="Fewest goals conceded"
          accentColor="#60A5FA"
          winner={goldenGloveWinner}
          value={goldenGloveWinner?.goalsAgainst ?? 0}
          valueLabel="Goals Conceded"
          runnerUps={byGA.slice(1, 3)}
          myTeamId={myTeamId}
          teamLinkBase={teamLinkBase}
        />
      </div>
    </div>
  )
}
