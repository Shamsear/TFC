import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import CalendarView from '@/components/calendar/CalendarView'

export const metadata = {
  title: "Calendar | Team Dashboard",
  description: "View league calendar with auctions and matches",
}

async function getCalendarData(seasonId: string) {
  try {
    // Get auction dates
    const auctions = await prisma.auction_calendar.findMany({
      where: { seasonId },
      orderBy: { auctionDate: 'asc' },
      include: {
        auctionSlots: true
      }
    })

    // Get matches
    const matches = await prisma.matches.findMany({
      where: {
        tournament: {
          seasonId
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

    return { auctions, matches }
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return { auctions: [], matches: [] }
  }
}

export default async function TeamCalendarPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="pt-24 pb-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Active Season</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">There is no active season at the moment.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const data = await getCalendarData(activeSeason.id)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-[#F5F0E8] mb-2">League Calendar</h1>
            <p className="text-[#D4CCBB]">
              {activeSeason.name} - Auctions & Matches
            </p>
          </div>

          {/* Calendar */}
          <CalendarView auctions={data.auctions} matches={data.matches} basePath="/team" />
        </div>
      </main>
    </div>
  )
}
