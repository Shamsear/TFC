import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { checkTeamSeasonParticipation } from '@/lib/team-auth'
import { getTournamentTableData } from '@/lib/tournament-data'
import TournamentTable from '@/components/tournaments/TournamentTable'
import ShareableTournamentTable from '@/components/tournaments/ShareableTournamentTable'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function TeamTournamentTablePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const session = await auth()
  const { tournamentId } = await params

  if (!session?.user?.teamId) redirect('/auth/signin')

  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) redirect('/team/not-in-season')

  const data = await getTournamentTableData(tournamentId)
  if (!data) notFound()

  // Get the season_teams.id for the logged-in team so we can highlight their row
  const mySeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: data.tournament.seasonId,
        teamId: session.user.teamId,
      },
    },
    select: { id: true },
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href={`/team/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6 text-sm font-bold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Tournament
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#FFB347] uppercase tracking-wider">
                {data.tournament.tournamentType === 'LEAGUE_PLAYOFF'
                  ? 'League with Playoff'
                  : data.tournament.tournamentType === 'LEAGUE_ONLY'
                  ? 'League Only'
                  : data.tournament.tournamentType === 'GROUP_KNOCKOUT'
                  ? 'Group Stage + Knockout'
                  : data.tournament.tournamentType === 'KNOCKOUT_ONLY'
                  ? 'Knockout Only'
                  : data.tournament.tournamentType.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1">Table</h1>
            <p className="text-[#D4CCBB]">{data.tournament.name} · {data.tournament.season.name}</p>
          </div>
          <ShareableTournamentTable
            standings={data.standings}
            tournamentName={data.tournament.name}
            seasonName={data.tournament.season.name}
          />
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-1 mb-8 bg-[#111111] rounded-xl border border-white/10 p-1 w-fit max-w-full overflow-x-auto scrollbar-none">
          {[
            { label: 'Overall', href: `/team/tournaments/${tournamentId}` },
            { label: 'Matches', href: `/team/tournaments/${tournamentId}/matches` },
            { label: 'Table', href: `/team/tournaments/${tournamentId}/table`, active: true },
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

        <TournamentTable
          standings={data.standings}
          myTeamId={mySeasonTeam?.id ?? null}
          teamLinkBase="/teams"
        />
      </div>
    </div>
  )
}
