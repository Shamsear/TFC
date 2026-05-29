import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { checkTeamSeasonParticipation } from '@/lib/team-auth'
import TournamentMatches from '@/components/tournaments/TournamentMatches'

export const dynamic = 'force-dynamic'

export default async function TeamTournamentMatchesPage({
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
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button Header */}
        <Link
          href={`/team/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6 transform active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Tournament</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1.5 tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                Tournament Matches
              </span>
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">{tournament.name} · {tournament.season.name}</p>
          </div>
        </div>

        {/* Tab switcher navigation */}
        <div className="flex items-center gap-1 mb-8 bg-white/[0.02] border border-white/10 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto scrollbar-none backdrop-blur-md">
          {[
            { label: 'Overall', href: `/team/tournaments/${tournamentId}` },
            { label: 'Matches', href: `/team/tournaments/${tournamentId}/matches`, active: true },
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

        <TournamentMatches
          matches={matches}
          myTeamId={session.user.teamId}
          teamLinkBase="/teams"
        />
      </div>
    </div>
  )
}
