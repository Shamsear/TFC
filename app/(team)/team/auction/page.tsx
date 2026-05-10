import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AuctionDashboardClient from "@/components/team-auction/AuctionDashboardClient"

export const metadata = {
  title: "Auction | Team Dashboard",
  description: "Participate in player auctions",
}

export default async function TeamAuctionPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const teamId = session.user.teamId

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      seasonNumber: true
    }
  })

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Active Season</h2>
          <p className="text-[#D4CCBB]">There is no active season at the moment.</p>
        </div>
      </div>
    )
  }

  // Check if team is participating in active season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: team.id,
      },
    },
    select: {
      id: true,
      currentBudget: true
    }
  })

  if (!seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Not Participating</h2>
          <p className="text-[#D4CCBB]">Your team is not participating in {activeSeason.name}.</p>
        </div>
      </div>
    )
  }

  // Get squad size
  const squadSize = await prisma.transfer_history.count({
    where: {
      teamId: team.id,
      seasonId: activeSeason.id
    }
  })

  // Fetch active and upcoming rounds
  const rounds = await prisma.rounds.findMany({
    where: {
      seasonId: activeSeason.id,
      status: {
        in: ['draft', 'active', 'expired_pending_finalization', 'tiebreaker_pending']
      }
    },
    orderBy: {
      roundNumber: 'asc'
    },
    take: 10
  })

  // Fetch team's bid status for each round
  const teamBids = await prisma.team_round_bids.findMany({
    where: {
      teamId: team.id,
      roundId: {
        in: rounds.map(r => r.id)
      }
    },
    select: {
      roundId: true,
      submitted: true,
      bidCount: true,
      lastUpdated: true
    }
  })

  // Fetch team's bulk selections
  const bulkSelections = await prisma.bulk_round_selections.findMany({
    where: {
      teamId: team.id,
      roundId: {
        in: rounds.filter(r => r.roundType === 'bulk').map(r => r.id)
      }
    },
    select: {
      roundId: true,
      submitted: true,
      lastUpdated: true
    }
  })

  // Fetch active tiebreakers for this team
  const tiebreakers = await prisma.tiebreakers.findMany({
    where: {
      status: 'active',
      teamTiebreakerBids: {
        some: {
          teamId: team.id
        }
      }
    },
    include: {
      basePlayer: {
        select: {
          name: true,
          photoUrl: true
        }
      },
      round: {
        select: {
          roundNumber: true
        }
      },
      teamTiebreakerBids: {
        where: {
          teamId: team.id
        },
        select: {
          submitted: true,
          newBidAmount: true
        }
      }
    }
  })

  // Fetch active bulk tiebreakers
  const bulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      status: 'pending',
      participants: {
        some: {
          teamId: team.id,
          status: 'active'
        }
      }
    },
    include: {
      basePlayer: {
        select: {
          name: true,
          photoUrl: true
        }
      },
      participants: {
        where: {
          teamId: team.id
        },
        select: {
          status: true,
          currentBid: true
        }
      }
    }
  })

  return (
    <AuctionDashboardClient
      team={team}
      season={activeSeason}
      budget={seasonTeam.currentBudget}
      squadSize={squadSize}
      rounds={rounds}
      teamBids={teamBids}
      bulkSelections={bulkSelections}
      tiebreakers={tiebreakers}
      bulkTiebreakers={bulkTiebreakers}
    />
  )
}
