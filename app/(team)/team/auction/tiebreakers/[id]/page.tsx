import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import TiebreakerBiddingClient from "@/components/team-auction/TiebreakerBiddingClient"

export default async function TiebreakerPage({
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
      },
      teamTiebreakerBids: {
        where: {
          teamId: teamId
        },
        select: {
          oldBidAmount: true,
          newBidAmount: true,
          submitted: true,
          submittedAt: true
        }
      }
    }
  })

  if (!tiebreaker) {
    redirect("/team/auction")
  }

  // Check if team is in season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: tiebreaker.round.seasonId,
        teamId: teamId
      }
    },
    select: {
      id: true,
      currentBudget: true
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  if (!team) {
    redirect("/team/auction")
  }

  return (
    <TiebreakerBiddingClient
      tiebreaker={tiebreaker}
      team={team}
      budget={seasonTeam.currentBudget}
      myBid={tiebreaker.teamTiebreakerBids[0] || null}
    />
  )
}
