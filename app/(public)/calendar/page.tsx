import { prisma } from '@/lib/prisma'
import CalendarView from '@/components/calendar/CalendarView'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getCalendarData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { auctions: [], matches: [], seasonName: null }
    }

    // Get auction dates
    const auctions = await prisma.auction_calendar.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { auctionDate: 'asc' },
      include: {
        auctionSlots: true
      }
    })

    // Get matches
    const matches = await prisma.matches.findMany({
      where: {
        tournament: {
          seasonId: activeSeason.id
        }
      },
      orderBy: { matchDate: 'asc' },
      include: {
        homeTeam: {
          include: {
            team: true
          }
        },
        awayTeam: {
          include: {
            team: true
          }
        },
        tournament: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return {
      auctions,
      matches,
      seasonName: activeSeason.name
    }
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return { auctions: [], matches: [], seasonName: null }
  }
}

export default async function CalendarPage() {
  const data = await getCalendarData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
              LEAGUE CALENDAR
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono mt-2">
              {data.seasonName ? `${data.seasonName} - Auctions & Matches` : 'All upcoming events'}
            </p>
          </div>

          {/* Calendar */}
          <CalendarView auctions={data.auctions} matches={data.matches} />
        </div>
      </main>
    </div>
  )
}
