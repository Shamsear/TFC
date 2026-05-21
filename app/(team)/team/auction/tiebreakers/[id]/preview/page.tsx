import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"

export const dynamic = 'force-dynamic';

export default async function TiebreakerPreviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const teamId = session.user.teamId

  // Fetch tiebreaker details
  const tiebreaker = await prisma.tiebreakers.findUnique({
    where: { id },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true
        }
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
          position: true,
          seasonId: true,
          season: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  if (!tiebreaker) {
    redirect("/team/auction")
  }

  // Fetch all tied teams
  const allTiedTeams = await prisma.team_tiebreaker_bids.findMany({
    where: {
      tiebreakerId: id
    },
    select: {
      teamId: true,
      oldBidAmount: true
    }
  })

  // Check if team is a participant
  const isParticipant = allTiedTeams.some(bid => bid.teamId === teamId)
  
  if (!isParticipant) {
    redirect("/team/auction")
  }

  // If tiebreaker is active, redirect to the bidding page
  if (tiebreaker.status === 'active') {
    redirect(`/team/auction/tiebreakers/${id}`)
  }

  // Get team names for all tied teams
  const tiedTeamsWithNames = await Promise.all(
    allTiedTeams.map(async (bid) => {
      const team = await prisma.teams.findUnique({
        where: { id: bid.teamId },
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      })
      return {
        teamId: bid.teamId,
        teamName: team?.name || 'Unknown Team',
        teamLogo: team?.logoUrl || null,
        oldBidAmount: bid.oldBidAmount,
        isCurrentTeam: bid.teamId === teamId
      }
    })
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 sm:pt-24 md:pt-28">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <img
                src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                alt={tiebreaker.basePlayer.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">
                {tiebreaker.basePlayer.name}
              </h1>
              <p className="text-sm sm:text-base text-[#D4CCBB]">
                Tiebreaker — Round {tiebreaker.round.roundNumber}
              </p>
            </div>
            <span className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
              Awaiting Admin
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Original Bid</div>
              <div className="text-lg sm:text-xl font-bold text-white">£{tiebreaker.originalAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Contested Teams</div>
              <div className="text-lg sm:text-xl font-bold text-white">{allTiedTeams.length}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xs text-[#7A7367] mb-1">Status</div>
              <div className="text-lg sm:text-xl font-bold text-amber-400">Pending</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Info Alert */}
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Tiebreaker Awaiting Admin
              </h3>
              <p className="text-sm text-[#D4CCBB]">
                This tiebreaker has not been started yet. The admin will activate it soon, and you'll be able to place your bid. 
                Below are the teams competing for this player.
              </p>
            </div>
          </div>
        </div>

        {/* Contested Teams */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Contested Teams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiedTeamsWithNames.map((team) => (
              <div
                key={team.teamId}
                className={`rounded-lg border p-4 ${
                  team.isCurrentTeam
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={team.teamLogo || '/default-team-logo.png'}
                      alt={team.teamName}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">
                      {team.teamName}
                    </div>
                    {team.isCurrentTeam && (
                      <div className="text-xs text-purple-400 font-medium">Your Team</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-[#7A7367]">
                  Original Bid: <span className="text-white font-medium">£{team.oldBidAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">How Tiebreakers Work</h2>
          <div className="space-y-3 text-sm text-[#D4CCBB]">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8A800]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#E8A800] font-bold text-xs">1</span>
              </div>
              <p>
                <strong className="text-white">Sealed Bid:</strong> All teams submit their new bid privately. 
                No one can see what others are bidding.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8A800]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#E8A800] font-bold text-xs">2</span>
              </div>
              <p>
                <strong className="text-white">Winning Condition:</strong> The team with the highest bid wins the player. 
                Your bid must be higher than the original amount.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8A800]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#E8A800] font-bold text-xs">3</span>
              </div>
              <p>
                <strong className="text-white">Time Limit:</strong> Once the admin starts the tiebreaker, 
                you'll have a limited time to submit your bid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
