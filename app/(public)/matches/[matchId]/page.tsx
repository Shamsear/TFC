import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import MatchDetailView from '@/components/matches/MatchDetailView'

async function getMatchData(matchId: string) {
  try {
    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: { team: true }
        },
        awayTeam: {
          include: { team: true }
        },
        tournament: {
          include: { season: true }
        }
      }
    })

    if (!match) return null

    return { match }
  } catch (error) {
    console.error('Error fetching match:', error)
    return null
  }
}

export default async function MatchDetailPage({
  params
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const data = await getMatchData(matchId)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <MatchDetailView match={data.match} />
        </div>
      </main>

          </div>
  )
}
