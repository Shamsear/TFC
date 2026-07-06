import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'

interface TournamentsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

// Icon Components
const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

const getTournamentTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    LEAGUE_ONLY: 'League Only',
    LEAGUE_PLAYOFF: 'League + Playoff',
    GROUP_KNOCKOUT: 'Group Stage + Knockout',
    KNOCKOUT_ONLY: 'Knockout Only'
  }
  return labels[type] || type
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    UPCOMING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    COMPLETED: 'bg-[#7A7367]/20 text-[#7A7367] border-[#7A7367]/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  return colors[status] || colors.UPCOMING
}

export default async function TournamentsPage({ params }: TournamentsPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      tournaments: {
        include: {
          _count: {
            select: {
              matches: true
            }
          },
          outgoingLinks: {
            include: {
              targetTournament: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          startDate: 'desc'
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Tournaments
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            {season.name} - Manage tournaments and competitions
          </p>
        </div>
        <Link
          href={`/sub-admin/${seasonId}/tournaments/new`}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap"
        >
          <PlusIcon />
          <span>Create Tournament</span>
        </Link>
      </div>

      <div>
        {season.tournaments.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
              <TrophyIcon />
            </div>
            <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No tournaments created</div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono mb-6">
              Create your first tournament to start scheduling matches
            </p>
            <Link
              href={`/sub-admin/${seasonId}/tournaments/new`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              <PlusIcon />
              Create First Tournament
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {season.tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/sub-admin/${seasonId}/tournaments/${tournament.id}`}
                className="group rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#E8A800]/25 hover:bg-white/[0.03] transition-all p-4 sm:p-6 backdrop-blur-xl shadow-md block"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] flex-shrink-0">
                          <TrophyIcon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg sm:text-2xl font-black text-white truncate uppercase tracking-tight">
                            {tournament.name}
                          </div>
                          <div className="text-[10px] font-bold text-[#7A7367] uppercase tracking-wider font-mono mt-0.5">
                            {getTournamentTypeLabel(tournament.tournamentType)}
                          </div>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-black uppercase tracking-wider self-start sm:self-auto ${getStatusColor(tournament.status)}`}>
                        {tournament.status.replace('_', ' ')}
                      </span>
                    </div>

                    {tournament.description && (
                      <div className="text-xs font-mono font-black text-gray-500 uppercase tracking-widest mb-4 line-clamp-2">{tournament.description}</div>
                    )}

                    {/* Linked Tournaments Status */}
                    {tournament.outgoingLinks && tournament.outgoingLinks.length > 0 && (
                      <div className="mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-[#E8A800] uppercase tracking-wider mb-2">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Linked to Target:</span>
                        </div>
                        <ul className="space-y-1.5 text-gray-400">
                          {tournament.outgoingLinks.map((link: any) => {
                            const config = link.qualificationConfig as any;
                            let label = '';
                            if (link.linkType === 'TOP_N') label = `Top ${config.count}`;
                            else if (link.linkType === 'BOTTOM_N') label = `Bottom ${config.count}`;
                            else if (link.linkType === 'POSITION_RANGE') label = `Positions ${config.startPosition}-${config.endPosition}`;
                            else if (link.linkType === 'WINNER') label = 'Winner Only';
                            else if (link.linkType === 'RUNNER_UP') label = 'Runner-up Only';
                            else if (link.linkType === 'GROUP_POSITION') label = `Pos ${config.position} from Groups`;
                            else if (link.linkType === 'MULTIPLE_POSITIONS_PER_GROUP') label = `Pos ${config.positionsPerGroup?.join(', ')} from Groups`;
                            
                            return (
                              <li key={link.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                <span className="font-extrabold truncate text-white uppercase tracking-wider">
                                  {link.targetTournament?.name}
                                </span>
                                <span className="text-[9px] px-2 py-0.5 rounded bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20 font-bold whitespace-nowrap uppercase tracking-wider">
                                  {label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs font-bold uppercase tracking-wider text-[#7A7367] font-mono">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">Start: <span className="text-white font-mono">{formatDate(tournament.startDate)}</span></span>
                      </div>
                      {tournament.endDate && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">End: <span className="text-white font-mono">{formatDate(tournament.endDate)}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span><span className="text-white font-mono">{tournament._count.matches}</span> matches</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all self-center hidden sm:block">
                    <ArrowRightIcon />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
