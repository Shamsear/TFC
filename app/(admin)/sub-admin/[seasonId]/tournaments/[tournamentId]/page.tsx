import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import TournamentTabs from '@/components/tournament/TournamentTabs'

interface TournamentDetailPageProps {
  params: Promise<{
    seasonId: string
    tournamentId: string
  }>
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, tournamentId } = await params

  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
      matches: {
        include: {
          homeTeam: {
            include: {
              team: true
            }
          },
          awayTeam: {
            include: {
              team: true
            }
          },
          group: true
        },
        orderBy: {
          matchDate: 'asc'
        }
      },
      groups: {
        orderBy: {
          groupOrder: 'asc'
        }
      },
      standings: {
        include: {
          seasonTeam: {
            include: {
              team: true
            }
          }
        },
        orderBy: [
          { points: 'desc' },
          { goalDiff: 'desc' },
          { goalsFor: 'desc' }
        ]
      },
      knockoutRounds: {
        include: {
          pairings: true,
          _count: {
            select: {
              pairings: true
            }
          }
        },
        orderBy: {
          roundOrder: 'asc'
        }
      }
    }
  })

  if (!tournament) {
    notFound()
  }

  // Get all season teams for fixture creation
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: true
    }
  })

  const teams = seasonTeams.map(st => ({
    id: st.id,
    teamId: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl
  }))

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      COMPLETED: 'bg-[#7A7367]/20 text-[#7A7367] border-[#7A7367]/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return colors[status] || colors.UPCOMING
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 sm:pb-4">
          <Link
            href={`/sub-admin/${seasonId}/tournaments`}
            className="text-[#E8A800] hover:text-[#FFB347] text-sm mb-4 inline-block transition-colors"
          >
            ← Back to Tournaments
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
                  <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                    {tournament.name}
                  </span>
                </h1>
                <span className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full border text-xs font-bold self-start sm:self-auto ${getStatusColor(tournament.status)}`}>
                  {tournament.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-[#7A7367] mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-[#E8A800] font-bold truncate">
                    {tournament.tournamentType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{formatDate(tournament.startDate)}</span>
                  {tournament.endDate && <span className="hidden sm:inline">- {formatDate(tournament.endDate)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span><span className="text-white font-bold">{tournament.matches.length}</span> matches</span>
                </div>
              </div>

              {tournament.description && (
                <p className="text-[#D4CCBB] text-sm sm:text-base">{tournament.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href={`/sub-admin/${seasonId}/tournaments/${tournamentId}/fixtures/new`}
                className="flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">Create Fixtures</span>
                <span className="sm:hidden">Fixtures</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <TournamentTabs
          tournament={tournament}
          teams={teams}
          seasonId={seasonId}
        />
      </div>
    </div>
  )
}
