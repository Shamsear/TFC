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

  // Fetch bulk tiebreaker details
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
      },
      participants: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        },
        orderBy: {
          currentBid: 'desc'
        }
      },
      bidHistory: {
        include: {
          team: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          bidTime: 'desc'
        },
        take: 20
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

  // Find my participation
  const myParticipation = tiebreaker.participants.find(p => p.teamId === teamId)

  return (
    <BulkTiebreakerBiddingClient
      tiebreaker={tiebreaker}
      team={team}
      budget={seasonTeam.currentBudget}
      myParticipation={myParticipation || null}
    />
  )
}
