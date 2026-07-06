import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import MatchEditor from '@/components/tournament/MatchEditor'

interface MatchDetailPageProps {
  params: Promise<{
    seasonId: string
    tournamentId: string
    matchId: string
  }>
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, tournamentId, matchId } = await params

  const match = await prisma.matches.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      group: true,
      homeTeam: {
        include: {
          team: true
        }
      },
      awayTeam: {
        include: {
          team: true
        }
      }
    }
  })

  if (!match) {
    notFound()
  }

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
          Back to Tournament
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Match Details
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {match.tournament.name} - Update match information and results
        </p>
      </div>

      <div className="max-w-4xl mx-auto pb-12">
        <MatchEditor match={match} seasonId={seasonId} tournamentId={tournamentId} />
      </div>
    </div>
  )
}
