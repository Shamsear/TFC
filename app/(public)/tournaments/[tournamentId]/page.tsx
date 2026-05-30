import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TournamentView from '@/components/tournaments/TournamentView'
import { getTournamentTableData, getTournamentStatsData } from '@/lib/tournament-data'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getTournamentData(tournamentId: string) {
  try {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        season: true
      }
    })

    if (!tournament) return null

    // Get all matches from this tournament
    const matches = await prisma.matches.findMany({
      where: { tournamentId },
      orderBy: { matchDate: 'asc' },
      include: {
        homeTeam: {
          include: { team: true }
        },
        awayTeam: {
          include: { team: true }
        }
      }
    })

    // Get unique rounds
    const rounds = Array.from(new Set(matches.map(m => m.round).filter((r): r is string => r !== null)))

    // Get table and stats data parallelly
    const [tableRes, statsRes] = await Promise.all([
      getTournamentTableData(tournamentId),
      getTournamentStatsData(tournamentId)
    ])

    return {
      tournament,
      matches,
      rounds,
      standings: tableRes?.standings || [],
      teams: statsRes?.teams || []
    }
  } catch (error) {
    console.error('Error fetching tournament:', error)
    return null
  }
}

export default async function TournamentPage({
  params,
  searchParams
}: {
  params: Promise<{ tournamentId: string }>
  searchParams: Promise<{ round?: string }>
}) {
  const { tournamentId } = await params
  const { round } = await searchParams
  const data = await getTournamentData(tournamentId)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <TournamentView
            tournament={data.tournament}
            matches={data.matches}
            rounds={data.rounds}
            initialRound={round}
            standings={data.standings}
            teams={data.teams}
          />
        </div>
      </main>
    </div>
  )
}
