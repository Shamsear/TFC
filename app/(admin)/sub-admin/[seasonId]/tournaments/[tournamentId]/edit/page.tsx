import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import EditTournamentForm from '@/components/tournament/EditTournamentForm'

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
    where: { id: tournamentId }
  })

  if (!tournament || tournament.seasonId !== seasonId) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href={`/sub-admin/${seasonId}/tournaments/${tournamentId}`}
            className="text-[#E8A800] hover:text-[#FFB347] text-sm mb-2 inline-block transition-colors"
          >
            ← Back to Tournament Details
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black">
            Edit Tournament
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <EditTournamentForm seasonId={seasonId} tournament={tournament} />
      </div>
    </div>
  )
}
