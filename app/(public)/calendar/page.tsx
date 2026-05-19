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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-[#F5F0E8] mb-2">League Calendar</h1>
            <p className="text-[#D4CCBB]">
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
