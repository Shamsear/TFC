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
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 pt-20">
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
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 pt-20">
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

  // Get squad size (only ACTIVE players)
  const squadSize = await prisma.transfer_history.count({
    where: {
      teamId: team.id,
      seasonId: activeSeason.id,
      status: 'ACTIVE'
    }
  })

  // Fetch all rounds (active, completed, etc.)
  const rounds = await prisma.rounds.findMany({
    where: {
      seasonId: activeSeason.id,
    },
    select: {
      id: true,
      roundNumber: true,
      position: true,
      position_group: true,
      roundType: true,
      status: true,
      startTime: true,
      endTime: true,
      maxBidsPerTeam: true,
      basePrice: true
    },
    orderBy: [
      { status: 'asc' }, // Active first, then completed
      { roundNumber: 'desc' } // Most recent first
    ],
    take: 20
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
  const activeTiebreakers = await prisma.tiebreakers.findMany({
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

  // Fetch pending tiebreakers (awaiting admin)
  const pendingTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      status: 'pending',
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
        select: {
          teamId: true
        }
      }
    }
  })

  // Fetch team details for pending tiebreakers
  const pendingTiebreakerTeamIds = pendingTiebreakers.flatMap(t => t.teamTiebreakerBids.map(b => b.teamId))
  const pendingTiebreakerTeams = await prisma.teams.findMany({
    where: {
      id: {
        in: pendingTiebreakerTeamIds
      }
    },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  // Map teams to tiebreakers
  const pendingTiebreakersWithTeams = pendingTiebreakers.map(t => ({
    ...t,
    teamTiebreakerBids: t.teamTiebreakerBids
      .map(b => {
        const team = pendingTiebreakerTeams.find(team => team.id === b.teamId)
        if (!team) return null
        return {
          teamId: b.teamId,
          team: {
            name: team.name,
            logoUrl: team.logoUrl
          }
        }
      })
      .filter((b): b is { teamId: string; team: { name: string; logoUrl: string } } => b !== null)
  }))

  // Fetch active bulk tiebreakers
  const activeBulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      status: 'active',
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
      round: {
        select: {
          roundNumber: true
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

  // Fetch pending bulk tiebreakers
  const pendingBulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      status: 'pending',
      participants: {
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
      participants: {
        select: {
          teamId: true,
          status: true,
          team: {
            select: {
              name: true,
              logoUrl: true
            }
          }
        }
      }
    }
  })

  return (
    <div className="pt-20">
      <AuctionDashboardClient
        team={team}
        season={activeSeason}
        budget={seasonTeam.currentBudget}
        squadSize={squadSize}
        rounds={rounds}
        teamBids={teamBids}
        bulkSelections={bulkSelections}
        activeTiebreakers={activeTiebreakers}
        pendingTiebreakers={pendingTiebreakersWithTeams}
        activeBulkTiebreakers={activeBulkTiebreakers}
        pendingBulkTiebreakers={pendingBulkTiebreakers}
      />
    </div>
  )
}
