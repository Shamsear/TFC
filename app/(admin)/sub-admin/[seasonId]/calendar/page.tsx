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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] via-[#FFB347] to-[#E8A800] bg-clip-text text-transparent uppercase tracking-wider leading-none font-mono">
            Auction Calendar
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            {season.name} - Manage auction dates and position slots
          </p>
        </div>
        <Link
          href={`/sub-admin/${seasonId}/calendar/new`}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#E8A800] text-black hover:bg-[#FFC93A] rounded-xl font-black transition-all text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shadow-md"
        >
          <PlusIcon />
          <span>Add Auction Date</span>
        </Link>
      </div>

      <div>
        {season.auctionCalendar.length === 0 ? (
          <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
              <CalendarIcon />
            </div>
            <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No auction dates scheduled</div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono mb-6">
              Create auction dates with position slots to start the auction process
            </p>
            <Link
              href={`/sub-admin/${seasonId}/calendar/new`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#E8A800] text-black hover:bg-[#FFC93A] rounded-xl font-black transition-all text-xs uppercase tracking-wider cursor-pointer"
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
