import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { checkTeamSeasonParticipation } from '@/lib/team-auth'

export async function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params
  const tournament = await prisma.tournaments.findUnique({ where: { id: tournamentId } })
  return {
    title: `${tournament?.name || 'Tournament'} | TFC`,
    description: `View ${tournament?.name || 'tournament'} matches and standings`,
  }
}

export default async function TournamentDetailsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const session = await auth()
  const { tournamentId } = await params

  if (!session?.user?.teamId) redirect('/auth/signin')

  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) redirect('/team/not-in-season')

  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: { season: true },
  })
  if (!tournament) notFound()

  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: tournament.seasonId,
        teamId: session.user.teamId,
      },
    },
  })

  // Summary standings (top 5 per group) for quick view
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    select: {
      id: true,
      teamId: true,
      groupName: true,
      position: true,
      played: true,
      won: true,
      drawn: true,
      lost: true,
      goalsFor: true,
      goalsAgainst: true,
      goalDiff: true,
      points: true,
      seasonTeam: {
        select: {
          id: true,
          team: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
    orderBy: [{ groupName: 'asc' }, { position: 'asc' }, { points: 'desc' }],
    take: 20,
  })

  const matches = await prisma.matches.findMany({
    where: { tournamentId },
    select: {
      id: true,
      startDate: true,
      matchDate: true,
      status: true,
      homeScore: true,
      awayScore: true,
      round: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: {
        select: {
          id: true,
          teamId: true,
          team: { select: { id: true, name: true, logoUrl: true } },
        },
      },
      awayTeam: {
        select: {
          id: true,
          teamId: true,
          team: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
    orderBy: { matchDate: 'asc' },
    take: 30,
  })

  // Group standings by group
  const byGroup = standings.reduce<Record<string, typeof standings>>((acc, s) => {
    const g = s.groupName || 'Overall'
    ;(acc[g] ??= []).push(s)
    return acc
  }, {})

  const completedMatches = matches.filter(m => m.status === 'COMPLETED')
  const liveMatches = matches.filter(m => m.status === 'LIVE')
  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED')

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })
  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  const statusStyle = (s: string) => {
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'LIVE') return 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse'
    return 'bg-white/5 border border-white/10 text-gray-400'
  }

  const tournamentStatusStyle = (s: string) => {
    if (s === 'IN_PROGRESS') return 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-400'
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'UPCOMING') return 'bg-blue-400/10 border border-blue-400/30 text-blue-400'
    return 'bg-white/5 border border-white/10 text-[#D4CCBB]'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-20 w-80 h-80 bg-[#E8A800]/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Back Button Header */}
        <Link
          href="/team/tournaments"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>All Tournaments</span>
        </Link>

        {/* Tournament Hero card */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-6 sm:p-8 mb-6 relative overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-[#FFB347] uppercase tracking-widest bg-gradient-to-r from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/30 px-3 py-1 rounded-xl shadow-[0_0_8px_rgba(232,168,0,0.05)]">
                    {tournament.tournamentType === 'LEAGUE_PLAYOFF'
                      ? 'League with Playoff'
                      : tournament.tournamentType === 'LEAGUE_ONLY'
                      ? 'League Only'
                      : tournament.tournamentType === 'GROUP_KNOCKOUT'
                      ? 'Group Stage + Knockout'
                      : tournament.tournamentType === 'KNOCKOUT_ONLY'
                      ? 'Knockout Only'
                      : (tournament.tournamentType as string).replace(/_/g, ' ')}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white mb-1.5 tracking-tight">{tournament.name}</h1>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">{tournament.season.name}</p>
              </div>
              <span className={`self-start px-4 py-2 rounded-full border text-xs font-black tracking-wider uppercase whitespace-nowrap ${tournamentStatusStyle(tournament.status)}`}>
                {tournament.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Meta statistics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Start Date</div>
                <div className="font-bold text-white">{formatDate(tournament.startDate)}</div>
              </div>
              {tournament.endDate && (
                <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">End Date</div>
                  <div className="font-bold text-white">{formatDate(tournament.endDate)}</div>
                </div>
              )}
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Matches</div>
                <div className="font-bold text-white">{matches.length}</div>
              </div>
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors backdrop-blur-md shadow-lg">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Completed</div>
                <div className="font-bold text-[#E8A800]">{completedMatches.length}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/team/tournaments/${tournamentId}/table`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/10 hover:from-[#E8A800]/30 hover:to-[#FFB347]/20 border border-[#E8A800]/40 text-[#E8A800] rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(232,168,0,0.1)] hover:scale-[1.02] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M14 4v16M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                </svg>
                View Table
              </Link>
              <Link
                href={`/team/tournaments/${tournamentId}/stats`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Team Stats
              </Link>
            </div>
          </div>
        </div>

        {/* Tab switcher navigation */}
        <div className="flex items-center gap-1 mb-8 bg-white/[0.02] border border-white/10 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto scrollbar-none backdrop-blur-md">
          {[
            { label: 'Overall', href: `/team/tournaments/${tournamentId}`, active: true },
            { label: 'Matches', href: `/team/tournaments/${tournamentId}/matches` },
            { label: 'Table', href: `/team/tournaments/${tournamentId}/table` },
            { label: 'Stats', href: `/team/tournaments/${tournamentId}/stats` },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-[0_4px_12px_rgba(232,168,0,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches lists */}
          <div className="lg:col-span-2 space-y-6">

            {/* Live Matches */}
            {liveMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Live Now</h2>
                </div>
                <div className="space-y-3">
                  {liveMatches.map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Upcoming Matches</h2>
                <div className="space-y-3">
                  {upcomingMatches.slice(0, 10).map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {/* Completed Results */}
            {completedMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Recent Results</h2>
                <div className="space-y-3">
                  {completedMatches.map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-12 text-center backdrop-blur-md shadow-lg">
                <svg className="w-12 h-12 text-[#7A7367] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">No matches scheduled yet</p>
              </div>
            )}
          </div>

          {/* Standings Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Standings Overview</h2>
              <Link href={`/team/tournaments/${tournamentId}/table`} className="text-xs font-black text-[#E8A800] hover:text-[#FFC93A] transition-colors uppercase tracking-wider hover:underline">
                Full Table →
              </Link>
            </div>

            {Object.keys(byGroup).length === 0 ? (
              <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-6 text-center backdrop-blur-md shadow-lg">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">No standings data yet</p>
              </div>
            ) : (
              Object.entries(byGroup).map(([groupName, rows]) => (
                <div key={groupName} className="rounded-2xl bg-white/[0.01] border border-white/10 overflow-hidden backdrop-blur-md shadow-lg">
                  {Object.keys(byGroup).length > 1 && (
                    <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01]">
                      <span className="text-xs font-black text-[#7A7367] uppercase tracking-wider">{groupName}</span>
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    {rows.slice(0, 5).map((s, idx) => {
                      const isMe = s.teamId === currentSeasonTeam?.id
                      const pos = s.position ?? idx + 1
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                            isMe 
                              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.05)]' 
                              : 'border-transparent hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black ${
                            pos === 1 ? 'bg-gradient-to-br from-amber-400 to-[#E8A800] text-black shadow-[0_0_8px_rgba(232,168,0,0.3)] animate-pulse' :
                            pos === 2 ? 'bg-gray-300 text-black' :
                            pos === 3 ? 'bg-amber-700 text-white' :
                            'bg-white/5 text-gray-500'
                          }`}>{pos}</span>
                          <div className="relative w-6 h-6 flex-shrink-0 rounded-md overflow-hidden bg-black/30 border border-white/5 p-0.5">
                            {s.seasonTeam.team.logoUrl ? (
                              <Image src={s.seasonTeam.team.logoUrl} alt={s.seasonTeam.team.name} fill className="object-contain p-0.5" sizes="24px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-[#7A7367] bg-white/5">
                                {s.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={`flex-1 text-xs font-black truncate ${isMe ? 'text-[#E8A800]' : 'text-gray-300'}`}>
                            {s.seasonTeam.team.name}
                          </span>
                          <span className={`text-xs font-black flex-shrink-0 ${isMe ? 'text-[#E8A800]' : 'text-white'}`}>{s.points} pts</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MatchCard({
  match,
  myTeamId,
  statusStyle,
  formatDate,
  formatTime,
}: {
  match: {
    id: string
    startDate: Date | null
    matchDate: Date
    status: string
    homeScore: number | null
    awayScore: number | null
    round: string | null
    homeTeamId: string
    awayTeamId: string
    homeTeam: { id: string; teamId: string; team: { id: string; name: string; logoUrl: string | null } }
    awayTeam: { id: string; teamId: string; team: { id: string; name: string; logoUrl: string | null } }
  }
  myTeamId: string
  statusStyle: (s: string) => string
  formatDate: (d: Date) => string
  formatTime: (d: Date) => string
}) {
  const isMyMatch = match.homeTeam.teamId === myTeamId || match.awayTeam.teamId === myTeamId
  const isHome = match.homeTeam.teamId === myTeamId
  const isAway = match.awayTeam.teamId === myTeamId

  let myResult: 'win' | 'loss' | 'draw' | null = null
  if (match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null && isMyMatch) {
    if (isHome) myResult = match.homeScore > match.awayScore ? 'win' : match.homeScore < match.awayScore ? 'loss' : 'draw'
    if (isAway) myResult = match.awayScore > match.homeScore ? 'win' : match.awayScore < match.homeScore ? 'loss' : 'draw'
  }

  const resultBorder = myResult === 'win' ? 'border-emerald-500/30 bg-emerald-500/[0.03] hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]' :
                       myResult === 'loss' ? 'border-red-500/30 bg-red-500/[0.03] hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.08)]' :
                       myResult === 'draw' ? 'border-[#E8A800]/30 bg-[#E8A800]/[0.03] hover:border-[#E8A800]/50 hover:shadow-[0_0_15px_rgba(232,168,0,0.08)]' :
                       'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]'

  // Use startDate if available, otherwise fall back to matchDate
  const displayDate = match.startDate || match.matchDate

  return (
    <Link
      href={`/team/matches/${match.id}`}
      className={`block rounded-2xl border p-4 hover:scale-[1.01] transition-all duration-300 shadow-md backdrop-blur-md ${resultBorder}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {match.round && <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{match.round}</span>}
          {myResult && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${
              myResult === 'win' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]' :
              myResult === 'loss' ? 'bg-red-500/15 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' :
              'bg-[#E8A800]/15 text-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.1)]'
            }`}>{myResult}</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{formatDate(displayDate)} {formatTime(displayDate)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusStyle(match.status)}`}>
            {match.status === 'IN_PROGRESS' ? 'LIVE' : match.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 items-center gap-2 mt-4">
        {/* Home Team */}
        <div className={`col-span-3 flex items-center gap-2.5 justify-end ${isHome ? 'text-[#E8A800]' : 'text-gray-300'}`}>
          <span className="font-black text-xs sm:text-sm text-right truncate max-w-[85px] sm:max-w-none">{match.homeTeam.team.name}</span>
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-md">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain p-0.5" sizes="32px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">{match.homeTeam.team.name.slice(0,2).toUpperCase()}</div>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="col-span-1 text-center">
          {match.homeScore !== null && match.awayScore !== null ? (
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-white/5 mx-auto w-fit shadow-md">
              <span className={`text-sm sm:text-base font-black ${isHome && myResult === 'win' ? 'text-emerald-400' : isHome && myResult === 'loss' ? 'text-red-400' : 'text-[#E8A800]'}`}>{match.homeScore}</span>
              <span className="text-gray-600 text-xs font-black">–</span>
              <span className={`text-sm sm:text-base font-black ${isAway && myResult === 'win' ? 'text-emerald-400' : isAway && myResult === 'loss' ? 'text-red-400' : 'text-[#E8A800]'}`}>{match.awayScore}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/5 mx-auto w-fit shadow-md">
              <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">VS</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className={`col-span-3 flex items-center gap-2.5 justify-start ${isAway ? 'text-[#E8A800]' : 'text-gray-300'}`}>
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-md">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain p-0.5" sizes="32px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-white/5">{match.awayTeam.team.name.slice(0,2).toUpperCase()}</div>
            )}
          </div>
          <span className="font-black text-xs sm:text-sm truncate max-w-[85px] sm:max-w-none">{match.awayTeam.team.name}</span>
        </div>
      </div>
    </Link>
  )
}
