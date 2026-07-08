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
    logoUrl: s.seasonTeam.team.logoUrl,
    groupName: s.groupName
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
          Back to Tournament
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Generate Fixtures
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {tournament.name} - Automatically create match schedule
        </p>
      </div>

      <div className="max-w-4xl mx-auto pb-12">
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
