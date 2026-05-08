import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import FixtureGenerator from '@/components/tournament/FixtureGenerator'

interface NewFixturesPageProps {
  params: Promise<{
    seasonId: string
    tournamentId: string
  }>
}

export default async function NewFixturesPage({ params }: NewFixturesPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, tournamentId } = await params

  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
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
        }
      }
    }
  })

  if (!tournament) {
    notFound()
  }

  const teams = tournament.standings.map(s => ({
    id: s.seasonTeam.id,
    teamId: s.seasonTeam.team.id,
    name: s.seasonTeam.team.name,
    logoUrl: s.seasonTeam.team.logoUrl
  }))

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
              Generate Fixtures
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            {tournament.name} - Automatically create match schedule
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <FixtureGenerator
          tournament={tournament}
          teams={teams}
          groups={tournament.groups}
          seasonId={seasonId}
        />
      </div>
    </div>
  )
}
