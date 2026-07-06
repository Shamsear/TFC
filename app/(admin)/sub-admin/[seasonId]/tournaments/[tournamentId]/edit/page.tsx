import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import TournamentFormAdvanced from '@/components/tournament/TournamentFormAdvanced'

interface EditTournamentPageProps {
  params: Promise<{
    seasonId: string;
    tournamentId: string;
  }>
}

export default async function EditTournamentPage({ params }: EditTournamentPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, tournamentId } = await params

  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      standings: true,
      groups: true,
      incomingLinks: true,
      _count: {
        select: {
          matches: true
        }
      }
    }
  })

  if (!tournament || tournament.seasonId !== seasonId) {
    notFound()
  }

  // Get all season teams for team selection grid
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
    logoUrl: st.team.logoUrl || ''
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tournament Details
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Edit Tournament
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Update settings, groups, and linked tournaments
        </p>
      </div>

      <TournamentFormAdvanced 
        seasonId={seasonId} 
        teams={teams} 
        initialTournament={tournament} 
      />
    </div>
  )
}
