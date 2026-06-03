import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { checkTeamSeasonParticipation } from '@/lib/team-auth'
import { getTournamentStatsData } from '@/lib/tournament-data'
import TournamentStats from '@/components/tournaments/TournamentStats'

export const dynamic = 'force-dynamic'

export default async function TeamTournamentStatsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const session = await auth()
  const { tournamentId } = await params

  if (!session?.user?.teamId) redirect('/auth/signin')

  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) redirect('/team/not-in-season')

  const data = await getTournamentStatsData(tournamentId)
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-20 w-80 h-80 bg-[#E8A800]/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <Link
          href={`/team/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6"
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
                {data.tournament.tournamentType === 'LEAGUE_PLAYOFF'
                  ? 'League with Playoff'
                  : data.tournament.tournamentType === 'LEAGUE_ONLY'
                  ? 'League Only'
                  : data.tournament.tournamentType === 'GROUP_KNOCKOUT'
                  ? 'Group Stage + Knockout'
                  : data.tournament.tournamentType === 'KNOCKOUT_ONLY'
                  ? 'Knockout Only'
                  : (data.tournament.tournamentType as string).replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1.5 tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                Tournament Statistics
              </span>
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">{data.tournament.name} · {data.tournament.season.name}</p>
          </div>
        </div>

        {/* Tab switcher navigation */}
        <div className="flex items-center gap-1 mb-8 bg-white/[0.02] border border-white/10 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto scrollbar-none backdrop-blur-md">
          {[
            { label: 'Overall', href: `/team/tournaments/${tournamentId}` },
            { label: 'Matches', href: `/team/tournaments/${tournamentId}/matches` },
            { label: 'Table', href: `/team/tournaments/${tournamentId}/table` },
            { label: 'Stats', href: `/team/tournaments/${tournamentId}/stats`, active: true },
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

        <TournamentStats
          teams={data.teams}
          myTeamId={session.user.teamId}
          teamLinkBase="/team/teams"
          hideShareOptions={true}
        />
      </div>
    </div>
  )
}
