import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import TeamDashboardTabs from "@/components/team/TeamDashboardTabs"
import TeamLogo from "@/components/team/TeamLogo"
import TiebreakerSection from "@/components/team/TiebreakerSection"

export const metadata = {
  title: "Team Dashboard | Turf Cats",
  description: "Team manager dashboard",
}

export default async function TeamDashboardPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Check if team is participating in active season
  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: activeSeason.id,
            teamId: team.id,
          },
        },
      })
    : null

  // If team is not in active season, redirect to not-in-season page
  if (!currentSeasonTeam || !activeSeason) {
    redirect("/team/not-in-season")
  }

  // Team is in active season - show dashboard
  // Get squad count for current season (only ACTIVE players)
  const squadCount = await prisma.transfer_history.count({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
      status: 'ACTIVE',
    },
  })

  // Get upcoming matches
  const upcomingMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId: activeSeason.id,
      },
      OR: [
        { homeTeamId: currentSeasonTeam.id },
        { awayTeamId: currentSeasonTeam.id },
      ],
      status: "SCHEDULED",
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
      tournament: true,
    },
    orderBy: {
      matchDate: "asc",
    },
    take: 5,
  })

  // Get recent transactions
  const recentTransactions = await prisma.financial_ledger.findMany({
    where: {
      seasonTeamId: currentSeasonTeam.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  // Get active auction rounds
  const activeRounds = await prisma.rounds.findMany({
    where: {
      seasonId: activeSeason.id,
      status: 'active',
      endTime: {
        gte: new Date(), // Only rounds that haven't ended yet
      },
    },
    select: {
      id: true,
      roundNumber: true,
      position: true,
      position_group: true,
      roundType: true,
      endTime: true,
      teamRoundBids: {
        where: {
          teamId: team.id,
        },
        select: {
          submitted: true,
          bidCount: true,
        },
      },
      bulkRoundSelections: {
        where: {
          teamId: team.id,
        },
        select: {
          submitted: true,
        },
      },
    },
    orderBy: {
      endTime: 'asc',
    },
    take: 3,
  })

  // Get active bulk tiebreakers for this team
  const activeBulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
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
          id: true,
          name: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      participants: {
        where: {
          status: 'active'
        },
        select: {
          teamId: true
        }
      }
    },
  })

  // Get pending bulk tiebreakers for this team
  const pendingBulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
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
          id: true,
          name: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      participants: {
        where: {
          status: 'active'
        },
        select: {
          teamId: true
        }
      }
    },
  })

  // Fetch team details for pending bulk tiebreakers
  const pendingBulkTiebreakerTeamIds = pendingBulkTiebreakers.flatMap(t => t.participants.map(p => p.teamId))
  const pendingBulkTiebreakerTeams = await prisma.teams.findMany({
    where: {
      id: {
        in: pendingBulkTiebreakerTeamIds
      }
    },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  // Map teams to bulk tiebreakers
  const pendingBulkTiebreakersWithTeams = pendingBulkTiebreakers.map(t => ({
    ...t,
    participants: t.participants.map(p => ({
      ...p,
      team: pendingBulkTiebreakerTeams.find(team => team.id === p.teamId)
    }))
  }))

  // Get active normal tiebreakers for this team
  const activeNormalTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
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
          id: true,
          name: true,
          photoUrl: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      teamTiebreakerBids: {
        where: {
          teamId: team.id
        },
        select: {
          submitted: true,
          oldBidAmount: true,
          newBidAmount: true
        }
      }
    },
  })

  // Get pending normal tiebreakers for this team
  const pendingNormalTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      round: {
        seasonId: activeSeason.id,
      },
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
          id: true,
          name: true,
          photoUrl: true,
        },
      },
      round: {
        select: {
          id: true,
          roundNumber: true,
        },
      },
      teamTiebreakerBids: {
        select: {
          teamId: true
        }
      }
    },
  })

  // Fetch team details for pending normal tiebreakers
  const pendingNormalTiebreakerTeamIds = pendingNormalTiebreakers.flatMap(t => t.teamTiebreakerBids.map(b => b.teamId))
  const pendingNormalTiebreakerTeams = await prisma.teams.findMany({
    where: {
      id: {
        in: pendingNormalTiebreakerTeamIds
      }
    },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  // Map teams to tiebreakers
  const pendingNormalTiebreakersWithTeams = pendingNormalTiebreakers.map(t => ({
    ...t,
    teamTiebreakerBids: t.teamTiebreakerBids.map(b => ({
      ...b,
      team: pendingNormalTiebreakerTeams.find(team => team.id === b.teamId)
    }))
  }))

  const totalActiveTiebreakers = activeBulkTiebreakers.length + activeNormalTiebreakers.length
  const totalPendingTiebreakers = pendingBulkTiebreakers.length + pendingNormalTiebreakers.length

  // Get recent auction results (last 5 ACTIVE players won from transfer_history)
  const recentAuctionResults = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
      status: 'ACTIVE',
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
            select: {
              position: true,
              position_group: true,
              overallRating: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // Get squad players for tabs (only ACTIVE players)
  const squadPlayers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
      status: 'ACTIVE',
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          player_id: true,
          name: true,
          photoUrl: true,
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
            select: {
              position: true,
              position_group: true,
              overallRating: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get active round info for tabs (just summary, not individual bids since they're encrypted)
  const activeRoundWithBids = activeRounds.length > 0 ? activeRounds[0] : null

  // Get saved squad formation
  const teamSquad = await prisma.team_squads.findUnique({
    where: {
      team_id_season_id: {
        team_id: team.id,
        season_id: activeSeason.id,
      }
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.03] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-black/40 backdrop-blur-xl mb-6 sm:mb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-4">
            <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="lg" />
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                  {team.name}
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base font-medium">Manager: {team.managerName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg">
              <span className="text-[#E8A800] font-medium text-xs sm:text-sm">Current Season:</span>
              <span className="text-white font-bold text-xs sm:text-sm">{activeSeason.name}</span>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <span className="text-purple-400 font-medium text-xs sm:text-sm">XP:</span>
              <span className="text-white font-bold text-xs sm:text-sm">{team.xp}</span>
            </div>

            <Link
              href="/team/achievements"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFD573] text-xs sm:text-sm font-black text-black rounded-lg hover:scale-[1.03] transition-all shadow-[0_0_20px_rgba(232,168,0,0.25)] hover:shadow-[0_0_30px_rgba(232,168,0,0.4)]"
            >
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12M4 7h16M4 7v3a4 4 0 004 4h8a4 4 0 004-4V7M4 7a2 2 0 012-2h12a2 2 0 012 2" />
              </svg>
              Achievements Cabinet
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Budget */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/[0.04] transition-colors" />
            <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Current Budget</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 mb-1">
              £{currentSeasonTeam.currentBudget.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 font-medium">
              Starting: £{activeSeason.startingPurse.toLocaleString()}
            </div>
          </div>

          {/* Squad Size */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/[0.04] transition-colors" />
            <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Squad Size</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-cyan-400 mb-1">{squadCount}</div>
            <Link
              href="/team/squad"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] inline-flex items-center gap-1 transition-colors font-medium"
            >
              View Squad
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Upcoming Matches */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/[0.04] transition-colors" />
            <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Upcoming Matches</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-400 mb-1">{upcomingMatches.length}</div>
            <Link
              href="/team/matches"
              className="text-xs text-[#E8A800] hover:text-[#FFC93A] inline-flex items-center gap-1 transition-colors font-medium"
            >
              View Schedule
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Trophies */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-[#E8A800]/[0.04] transition-colors" />
            <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 font-bold uppercase tracking-widest">Trophies Won</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#E8A800] mb-1">
              {currentSeasonTeam.trophiesWon}
            </div>
            <div className="text-xs text-gray-400 font-medium">This season</div>
          </div>
        </div>

        {/* Tiebreakers Section */}
        <TiebreakerSection
          activeNormalTiebreakers={activeNormalTiebreakers}
          activeBulkTiebreakers={activeBulkTiebreakers}
          pendingNormalTiebreakers={pendingNormalTiebreakersWithTeams}
          pendingBulkTiebreakers={pendingBulkTiebreakersWithTeams}
        />

        {/* Active Auction Rounds - Prominent Alert */}
        {activeRounds.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 border-2 border-[#E8A800]/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800] flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Active Auction Rounds</h2>
                  <p className="text-xs sm:text-sm text-[#D4CCBB]">{activeRounds.length} round{activeRounds.length > 1 ? 's' : ''} in progress</p>
                </div>
              </div>
              <div className="space-y-3">
                {activeRounds.map((round) => {
                  const teamBid = round.teamRoundBids[0]
                  const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
                  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
                  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
                  const isUrgent = hoursRemaining < 2
                  const roundPath = round.roundType === 'bulk'
                    ? `/team/auction/bulk-rounds/${round.id}`
                    : `/team/auction/rounds/${round.id}`

                  return (
                    <Link
                      key={round.id}
                      href={roundPath}
                      className="block bg-black/40 border border-white/20 rounded-lg p-4 hover:border-[#E8A800] hover:bg-black/60 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-black text-base sm:text-lg">Round {round.roundNumber}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              LIVE
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#D4CCBB]">
                            <span className="font-medium truncate max-w-[200px] sm:max-w-none">
                              {round.position ? `${round.position}${round.position_group && round.position_group !== 'ALL' ? `-${round.position_group}` : ''}` : 'All Positions'}
                            </span>
                            <span className="text-[#7A7367]">•</span>
                            <span>{round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg sm:text-xl font-black ${isUrgent ? 'text-red-400' : 'text-[#FFB347]'}`}>
                            {hoursRemaining > 0 && `${hoursRemaining}h `}
                            {minutesRemaining}m
                          </div>
                          <div className="text-xs text-[#7A7367]">remaining</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {round.roundType === 'bulk' ? (
                            round.bulkRoundSelections[0] ? (
                              round.bulkRoundSelections[0].submitted ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                  ✓ Submitted
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                  In Progress
                                </span>
                              )
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                                No Selections Placed
                              </span>
                            )
                          ) : (
                            teamBid ? (
                              teamBid.submitted ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                  ✓ Submitted ({teamBid.bidCount} bids)
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                  In Progress ({teamBid.bidCount} bids)
                                </span>
                              )
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                                No Bids Placed
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-[#E8A800] group-hover:text-[#FFC93A] font-bold text-sm inline-flex items-center gap-1 transition-colors">
                          {round.roundType === 'bulk'
                            ? (round.bulkRoundSelections[0]?.submitted ? 'View Selections' : 'Select Players')
                            : (teamBid?.submitted ? 'View Bids' : 'Place Bids')}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Link
                href="/team/auction"
                className="mt-4 block text-center py-3 rounded-lg bg-[#E8A800] hover:bg-[#FFC93A] text-black font-bold text-sm transition-colors"
              >
                View All Auction Rounds
              </Link>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Upcoming Matches */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/[0.04] transition-colors" />
            <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Upcoming Matches</h2>
              <Link
                href="/team/matches"
                className="text-xs sm:text-sm text-[#E8A800] hover:text-[#FFC93A] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
              >
                <span>View All</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3 relative z-10">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/team/matches/${match.id}`}
                    className="block bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4 hover:border-[#E8A800]/30 hover:bg-white/[0.04] transition-all duration-300 transform hover:scale-[1.01]"
                  >
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                      {new Date(match.matchDate).toLocaleDateString()} • {match.tournament.name}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-black text-sm truncate">{match.homeTeam.team.name}</span>
                      <span className="text-gray-500 text-xs font-black uppercase tracking-widest flex-shrink-0">vs</span>
                      <span className="text-white font-black text-sm truncate text-right">{match.awayTeam.team.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 relative z-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-semibold">No upcoming matches scheduled</p>
              </div>
            )}
          </div>
 
          {/* Recent Transactions */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/[0.04] transition-colors" />
            <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Recent Transactions</h2>
              <Link
                href="/team/finances"
                className="text-xs sm:text-sm text-[#E8A800] hover:text-[#FFC93A] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
              >
                <span>View All</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3 relative z-10">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">
                        {transaction.transactionType.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`font-black text-xs sm:text-sm ${
                          transaction.amount >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.amount >= 0 ? "+" : ""}£
                        {Math.abs(transaction.amount).toLocaleString()}
                      </span>
                    </div>
                    {transaction.playerName && (
                      <div className="text-xs text-[#E8A800] font-black tracking-wide mb-1">{transaction.playerName}</div>
                    )}
                    <div className="text-xs text-gray-400 font-medium line-clamp-1">{transaction.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 relative z-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-semibold">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
 
        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            <Link
              href="/team/auction"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Auction</div>
            </Link>
            <Link
              href="/team/auction-planner"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Planner</div>
            </Link>
            <Link
              href="/team/release-request"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-yellow-500/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-yellow-500/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mx-auto mb-2 sm:mb-3 group-hover:bg-yellow-500/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-yellow-400 uppercase tracking-wider transition-colors">Release</div>
            </Link>
            <Link
              href="/team/swap-request"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-cyan-500/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-2 sm:mb-3 group-hover:bg-cyan-500/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-cyan-400 uppercase tracking-wider transition-colors">Swap</div>
            </Link>
            <Link
              href="/team/transfers"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-emerald-500/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-2 sm:mb-3 group-hover:bg-emerald-500/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-emerald-400 uppercase tracking-wider transition-colors">Transfers</div>
            </Link>
            <Link
              href="/team/starred"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Starred</div>
            </Link>
            <Link
              href="/team/players"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">All Players</div>
            </Link>
            <Link
              href="/team/squad"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Squad</div>
            </Link>
            <Link
              href="/team/matches"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Matches</div>
            </Link>
            <Link
              href="/team/tournaments"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-2 sm:mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Tournaments</div>
            </Link>
            <Link
              href="/team/achievements"
              className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-purple-500/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/[0.03] transition-colors" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-2 sm:mb-3 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12M4 7h16M4 7v3a4 4 0 004 4h8a4 4 0 004-4V7M4 7a2 2 0 012-2h12a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-purple-400 uppercase tracking-wider transition-colors">Badges</div>
            </Link>
          </div>
        </div>

        {/* Tabbed Section - Bids and Squad */}
        <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
          <TeamDashboardTabs
            activeBids={[]}
            squadPlayers={squadPlayers}
            teamSquad={teamSquad}
          />
        </div>
      </div>
    </div>
  )
}
