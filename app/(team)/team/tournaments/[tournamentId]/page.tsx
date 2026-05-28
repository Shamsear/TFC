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
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const statusStyle = (s: string) => {
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'LIVE') return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
    return 'bg-white/5 border-white/20 text-[#D4CCBB]'
  }

  const tournamentStatusStyle = (s: string) => {
    if (s === 'IN_PROGRESS') return 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
    if (s === 'COMPLETED') return 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
    if (s === 'UPCOMING') return 'bg-blue-400/10 border-blue-400/30 text-blue-400'
    return 'bg-white/5 border-white/20 text-[#D4CCBB]'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back */}
        <Link
          href="/team/tournaments"
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6 text-sm font-bold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Tournaments
        </Link>

        {/* Tournament Hero */}
        <div className="rounded-2xl bg-[#111111] border border-white/10 p-6 sm:p-8 mb-6 relative overflow-hidden">
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8A800]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#FFB347] uppercase tracking-wider">
                    {tournament.tournamentType.replace(/_/g, ' ')}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1">{tournament.name}</h1>
                <p className="text-[#D4CCBB] text-sm">{tournament.season.name}</p>
              </div>
              <span className={`self-start px-4 py-2 rounded-full border text-xs font-bold whitespace-nowrap ${tournamentStatusStyle(tournament.status)}`}>
                {tournament.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-[#7A7367] uppercase tracking-wider mb-1">Start Date</div>
                <div className="font-bold text-[#F5F0E8]">{formatDate(tournament.startDate)}</div>
              </div>
              {tournament.endDate && (
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <div className="text-[10px] text-[#7A7367] uppercase tracking-wider mb-1">End Date</div>
                  <div className="font-bold text-[#F5F0E8]">{formatDate(tournament.endDate)}</div>
                </div>
              )}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-[#7A7367] uppercase tracking-wider mb-1">Matches</div>
                <div className="font-bold text-[#F5F0E8]">{matches.length}</div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-[#7A7367] uppercase tracking-wider mb-1">Completed</div>
                <div className="font-bold text-[#E8A800]">{completedMatches.length}</div>
              </div>
            </div>

            {/* Quick links to Table & Stats */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/team/tournaments/${tournamentId}/table`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A800]/10 hover:bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M14 4v16M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                </svg>
                View Table
              </Link>
              <Link
                href={`/team/tournaments/${tournamentId}/stats`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#D4CCBB] hover:text-[#F5F0E8] rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Team Stats
              </Link>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1 mb-8 bg-[#111111] rounded-xl border border-white/10 p-1 w-fit max-w-full overflow-x-auto scrollbar-none">
          {[
            { label: 'Overall', href: `/team/tournaments/${tournamentId}`, active: true },
            { label: 'Matches', href: `/team/tournaments/${tournamentId}/matches` },
            { label: 'Table', href: `/team/tournaments/${tournamentId}/table` },
            { label: 'Stats', href: `/team/tournaments/${tournamentId}/stats` },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                active
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'text-[#7A7367] hover:text-[#D4CCBB] hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches — takes 2 cols */}
          <div className="lg:col-span-2 space-y-6">

            {/* Live */}
            {liveMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#FFB347] animate-pulse" />
                  <h2 className="text-sm font-black text-[#FFB347] uppercase tracking-wider">Live</h2>
                </div>
                <div className="space-y-2">
                  {liveMatches.map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-[#D4CCBB] uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcomingMatches.slice(0, 10).map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {/* Results */}
            {completedMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-[#D4CCBB] uppercase tracking-wider mb-3">Results</h2>
                <div className="space-y-2">
                  {completedMatches.map(m => <MatchCard key={m.id} match={m} myTeamId={session.user.teamId!} statusStyle={statusStyle} formatDate={formatDate} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
                <svg className="w-12 h-12 text-[#7A7367] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[#7A7367] font-medium">No matches scheduled yet</p>
              </div>
            )}
          </div>

          {/* Sidebar: mini standings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#D4CCBB] uppercase tracking-wider">Standings</h2>
              <Link href={`/team/tournaments/${tournamentId}/table`} className="text-xs font-bold text-[#E8A800] hover:text-[#FFC93A] transition-colors">
                Full Table →
              </Link>
            </div>

            {Object.keys(byGroup).length === 0 ? (
              <div className="rounded-xl bg-[#111111] border border-white/10 p-6 text-center">
                <p className="text-sm text-[#7A7367]">No standings yet</p>
              </div>
            ) : (
              Object.entries(byGroup).map(([groupName, rows]) => (
                <div key={groupName} className="rounded-xl bg-[#111111] border border-white/10 overflow-hidden">
                  {Object.keys(byGroup).length > 1 && (
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <span className="text-xs font-black text-[#7A7367] uppercase">{groupName}</span>
                    </div>
                  )}
                  <div className="p-2">
                    {rows.slice(0, 5).map((s, idx) => {
                      const isMe = s.teamId === currentSeasonTeam?.id
                      const pos = s.position ?? idx + 1
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${isMe ? 'bg-[#E8A800]/8' : 'hover:bg-white/[0.03]'}`}
                        >
                          <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black ${
                            pos === 1 ? 'bg-[#E8A800] text-[#0a0a0a]' :
                            pos === 2 ? 'bg-[#C0C0C0] text-[#0a0a0a]' :
                            pos === 3 ? 'bg-[#CD7F32] text-[#0a0a0a]' :
                            'bg-white/5 text-[#7A7367]'
                          }`}>{pos}</span>
                          <div className="relative w-6 h-6 flex-shrink-0 rounded-md overflow-hidden">
                            {s.seasonTeam.team.logoUrl ? (
                              <Image src={s.seasonTeam.team.logoUrl} alt={s.seasonTeam.team.name} fill className="object-contain" sizes="24px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-[#7A7367] bg-white/5">
                                {s.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={`flex-1 text-xs font-bold truncate ${isMe ? 'text-[#E8A800]' : 'text-[#D4CCBB]'}`}>
                            {s.seasonTeam.team.name}
                          </span>
                          <span className={`text-xs font-black flex-shrink-0 ${isMe ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>{s.points}</span>
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

  const resultBorder = myResult === 'win' ? 'border-emerald-400/40 bg-emerald-400/[0.03]' :
                       myResult === 'loss' ? 'border-red-400/40 bg-red-400/[0.03]' :
                       myResult === 'draw' ? 'border-[#E8A800]/30 bg-[#E8A800]/[0.03]' :
                       'border-white/10 bg-[#111111]'

  return (
    <Link
      href={`/team/matches/${match.id}`}
      className={`block rounded-xl border p-3 sm:p-4 hover:scale-[1.005] transition-all ${resultBorder}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          {match.round && <span className="text-[9px] sm:text-[10px] font-bold text-[#7A7367] uppercase">{match.round}</span>}
          {myResult && (
            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
              myResult === 'win' ? 'bg-emerald-400/15 text-emerald-400' :
              myResult === 'loss' ? 'bg-red-400/15 text-red-400' :
              'bg-[#E8A800]/15 text-[#E8A800]'
            }`}>{myResult}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] sm:text-[10px] text-[#7A7367]">{formatDate(match.matchDate)} {formatTime(match.matchDate)}</span>
          <span className={`px-1.5 py-0.5 rounded-full border text-[8px] sm:text-[9px] font-bold ${statusStyle(match.status)}`}>
            {match.status === 'IN_PROGRESS' ? 'LIVE' : match.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 items-center gap-1 sm:gap-2">
        {/* Home */}
        <div className={`col-span-3 flex items-center gap-1.5 sm:gap-2 justify-end ${isHome ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
          <span className="font-bold text-xs sm:text-sm text-right truncate max-w-[65px] sm:max-w-none">{match.homeTeam.team.name}</span>
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 rounded-md overflow-hidden">
            {match.homeTeam.team.logoUrl ? (
              <Image src={match.homeTeam.team.logoUrl} alt={match.homeTeam.team.name} fill className="object-contain" sizes="28px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5">{match.homeTeam.team.name.slice(0,2).toUpperCase()}</div>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="col-span-1 text-center">
          {match.homeScore !== null && match.awayScore !== null ? (
            <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#0a0a0a] border border-white/5 mx-auto w-fit">
              <span className={`text-sm sm:text-base font-black ${isHome && myResult === 'win' ? 'text-emerald-400' : isHome && myResult === 'loss' ? 'text-red-400' : 'text-[#E8A800]'}`}>{match.homeScore}</span>
              <span className="text-[#7A7367] text-xs">–</span>
              <span className={`text-sm sm:text-base font-black ${isAway && myResult === 'win' ? 'text-emerald-400' : isAway && myResult === 'loss' ? 'text-red-400' : 'text-[#E8A800]'}`}>{match.awayScore}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-lg bg-[#0a0a0a] border border-white/5 mx-auto w-fit">
              <span className="text-[10px] text-[#7A7367] font-bold">VS</span>
            </div>
          )}
        </div>

        {/* Away */}
        <div className={`col-span-3 flex items-center gap-1.5 sm:gap-2 justify-start ${isAway ? 'text-[#E8A800]' : 'text-[#F5F0E8]'}`}>
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 rounded-md overflow-hidden">
            {match.awayTeam.team.logoUrl ? (
              <Image src={match.awayTeam.team.logoUrl} alt={match.awayTeam.team.name} fill className="object-contain" sizes="28px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#7A7367] bg-white/5">{match.awayTeam.team.name.slice(0,2).toUpperCase()}</div>
            )}
          </div>
          <span className="font-bold text-xs sm:text-sm truncate max-w-[65px] sm:max-w-none">{match.awayTeam.team.name}</span>
        </div>
      </div>
    </Link>
  )
}
