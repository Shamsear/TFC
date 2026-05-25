import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import BulkTiebreakerBiddingClient from "@/components/team-auction/BulkTiebreakerBiddingClient"

export const dynamic = 'force-dynamic';

export default async function BulkTiebreakerPage({
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

  // Fetch bulk tiebreaker details (sealed bid model)
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: parseInt(id) },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true
        }
      },
      round: {
        include: {
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

  if (!tiebreaker || !tiebreaker.round) {
    redirect("/team/auction")
  }

  const seasonId = tiebreaker.round.seasonId as string

  // Check if team is in season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId,
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

  // Get all participants with their teams (for sealed bid model)
  const participants = await prisma.bulk_tiebreaker_participants.findMany({
    where: {
      tiebreakerId: parseInt(id)
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      }
    }
  })

  // Find my participation and bid info
  const myParticipation = participants.find(p => p.teamId === teamId)
  
  // Prepare tied teams list (hide sealed bids from other teams)
  const allTiedTeams = participants.map(p => ({
    teamId: p.team.id,
    teamName: p.team.name,
    teamLogo: p.team.logoUrl,
    submitted: p.submitted,
    submittedAt: p.submittedAt,
    isCurrentTeam: p.teamId === teamId
  }))

  // Prepare my bid info (only show own bid amount)
  const myBid = myParticipation ? {
    newBidAmount: myParticipation.newBidAmount,
    submitted: myParticipation.submitted,
    submittedAt: myParticipation.submittedAt
  } : null

  return (
    <BulkTiebreakerBiddingClient
      tiebreaker={{
        id: tiebreaker.id,
        basePrice: tiebreaker.basePrice,
        status: tiebreaker.status,
        basePlayer: tiebreaker.basePlayer,
        round: tiebreaker.round
      }}
      team={team}
      budget={seasonTeam.currentBudget}
      myBid={myBid}
      allTiedTeams={allTiedTeams}
    />
  )
}
