import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import NewsManagerClient from '@/components/admin/NewsManagerClient'

export const dynamic = 'force-dynamic'

interface NewsManagerPageProps {
  params: Promise<{ seasonId: string }>
}

export default async function NewsManagerPage({ params }: NewsManagerPageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUB_ADMIN') {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Get recent matches that might need news
  const recentMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId,
      },
      status: 'COMPLETED',
    },
    include: {
      homeTeam: {
        include: {
          team: true,
        },
      },
      awayTeam: {
        include: {
          team: true,
        },
      },
      tournament: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      matchDate: 'desc',
    },
    take: 50,
  })

  // Get existing news articles
  const existingNews = await prisma.news.findMany({
    where: {
      seasonId,
    },
    select: {
      matchId: true,
      event_type: true,
      createdAt: true,
    },
  })

  // Check which matches have news
  const matchesWithStatus = recentMatches.map((match) => {
    const hasNews = existingNews.some((news) => news.matchId === match.id)
    return {
      id: match.id,
      homeTeam: match.homeTeam.team.name,
      awayTeam: match.awayTeam.team.name,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      matchDate: match.matchDate,
      tournament: match.tournament.name,
      hasNews,
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              News Manager
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Check and manually trigger news generation for completed matches
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <NewsManagerClient matches={matchesWithStatus} seasonId={seasonId} />
      </div>
    </div>
  )
}
