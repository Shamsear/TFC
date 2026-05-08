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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Tournaments
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                {season.name} - Manage tournaments and competitions
              </p>
            </div>
            <Link
              href={`/sub-admin/${seasonId}/tournaments/new`}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap"
            >
              <PlusIcon />
              <span className="hidden sm:inline">Create Tournament</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {season.tournaments.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <TrophyIcon />
            </div>
            <div className="text-lg sm:text-xl font-black text-white mb-2">No tournaments created</div>
            <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
              Create your first tournament to start scheduling matches
            </p>
            <Link
              href={`/sub-admin/${seasonId}/tournaments/new`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
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
                className="group rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] flex-shrink-0">
                          <TrophyIcon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg sm:text-2xl font-black text-white truncate">
                            {tournament.name}
                          </div>
                          <div className="text-xs sm:text-sm text-[#7A7367] mt-1">
                            {getTournamentTypeLabel(tournament.tournamentType)}
                          </div>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full border text-xs font-bold self-start sm:self-auto ${getStatusColor(tournament.status)}`}>
                        {tournament.status.replace('_', ' ')}
                      </span>
                    </div>

                    {tournament.description && (
                      <div className="text-sm text-[#D4CCBB] mb-4 line-clamp-2">{tournament.description}</div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-[#7A7367]">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">Start: <span className="text-[#E8A800] font-bold">{formatDate(tournament.startDate)}</span></span>
                      </div>
                      {tournament.endDate && (
                        <div className="flex items-center gap-2 text-[#7A7367]">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">End: <span className="text-[#FFB347] font-bold">{formatDate(tournament.endDate)}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[#7A7367]">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span><span className="text-white font-bold">{tournament._count.matches}</span> matches</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[#E8A800] opacity-0 group-hover:opacity-100 transition-opacity self-center hidden sm:block">
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
