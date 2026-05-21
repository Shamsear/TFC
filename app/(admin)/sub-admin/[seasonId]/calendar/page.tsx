import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import CalendarCard from '@/components/calendar/CalendarCard'

interface CalendarPageProps {
  params: Promise<{
    seasonId: string
  }>
}

// Icon Components
const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function CalendarPage({ params }: CalendarPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      auctionCalendar: {
        include: {
          auctionSlots: {
            select: {
              id: true,
              position: true,
              position_group: true,
              slotOrder: true,
              roundType: true,
              positionHidden: true
            },
            orderBy: {
              slotOrder: 'asc'
            }
          }
        },
        orderBy: {
          auctionDate: 'asc'
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  // Format dates in server component
  const calendarsWithFormattedDates = season.auctionCalendar.map(calendar => ({
    ...calendar,
    formattedDate: formatDate(calendar.auctionDate)
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Auction Calendar
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                {season.name} - Manage auction dates and position slots
              </p>
            </div>
            <Link
              href={`/sub-admin/${seasonId}/calendar/new`}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap"
            >
              <PlusIcon />
              <span className="hidden sm:inline">Add Auction Date</span>
              <span className="sm:hidden">Add Date</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {season.auctionCalendar.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <CalendarIcon />
            </div>
            <div className="text-lg sm:text-xl font-black text-white mb-2">No auction dates scheduled</div>
            <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
              Create auction dates with position slots to start the auction process
            </p>
            <Link
              href={`/sub-admin/${seasonId}/calendar/new`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              <PlusIcon />
              Create First Auction Date
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {calendarsWithFormattedDates.map((calendar) => (
              <CalendarCard
                key={calendar.id}
                calendar={calendar}
                seasonId={seasonId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
