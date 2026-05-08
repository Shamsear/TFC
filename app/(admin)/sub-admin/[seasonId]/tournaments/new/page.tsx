import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import TournamentFormAdvanced from '@/components/tournament/TournamentFormAdvanced'

interface NewTournamentPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function NewTournamentPage({ params }: NewTournamentPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        include: {
          team: true
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  const teams = season.seasonTeams.map(st => ({
    id: st.id,
    teamId: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl
  }))

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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Create Tournament
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            {season.name} - Set up a new tournament or competition
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <TournamentFormAdvanced seasonId={seasonId} teams={teams} />
      </div>
    </div>
  )
}
