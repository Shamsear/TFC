import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AuctionInterface from '@/components/auction/AuctionInterface'

interface AuctionPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function AuctionPage({ params }: AuctionPageProps) {
  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        include: {
          team: true
        }
      },
      auctionCalendar: {
        include: {
          auctionSlots: true
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

  // Transform season teams to include budget
  const teams = season.seasonTeams.map(st => ({
    id: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl,
    currentBudget: st.currentBudget
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
              Live Auction
            </h1>
            <p className="text-sm sm:text-base text-[#D4CCBB]">
              {season.name} - Select auction date and position to start
            </p>
          </div>
          <Link
            href={`/sub-admin/${seasonId}/calendar`}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base text-center"
          >
            Manage Calendar
          </Link>
        </div>

        {season.auctionCalendar.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-2">No auction dates scheduled</div>
            <p className="text-sm sm:text-base text-[#D4CCBB] mb-6">
              Create auction dates in the calendar to start the auction process
            </p>
            <Link
              href={`/sub-admin/${seasonId}/calendar`}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              Go to Calendar
            </Link>
          </div>
        ) : (
          <AuctionInterface 
            seasonId={seasonId}
            calendar={season.auctionCalendar}
            teams={teams}
          />
        )}
      </div>
    </div>
  )
}
