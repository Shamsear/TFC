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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 sm:pb-4">
          <Link
            href={`/sub-admin/${seasonId}/tournaments/${tournamentId}`}
            className="text-[#E8A800] hover:text-[#FFB347] text-sm mb-4 inline-block transition-colors"
          >
            ← Back to Tournament
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Match Details
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            {match.tournament.name} - Update match information and results
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <MatchEditor match={match} seasonId={seasonId} tournamentId={tournamentId} />
      </div>
    </div>
  )
}
