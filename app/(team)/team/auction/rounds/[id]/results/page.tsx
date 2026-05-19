import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"
import { decryptBids } from "@/lib/auction/encryption"
import RoundResultsClient from "@/components/team-auction/RoundResultsClient"

export default async function RoundResultsPage({
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

  // Fetch round details
  const round = await prisma.rounds.findUnique({
    where: { id },
    include: {
      season: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!round) {
    redirect("/team/auction")
  }

  // Check if team is in season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: round.seasonId,
        teamId: teamId
      }
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Get all allocations for this round using roundId
  const allocations = await prisma.transfer_history.findMany({
    where: {
      roundId: id
    },
    select: {
      id: true,
      basePlayerId: true,
      teamId: true,
      soldPrice: true,
      acquisitionType: true,
      acquisitionNotes: true,
      createdAt: true,
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
          photoUrl: true
        }
      },
      team: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      soldPrice: 'desc'
    }
  })

  // Get all bids for this round to show bid history
  const teamBids = await prisma.team_round_bids.findMany({
    where: {
      roundId: id,
      submitted: true
    },
    select: {
      teamId: true,
      encryptedBids: true
    }
  })

  // Get team names for all teams that bid
  const teamIds = teamBids.map(tb => tb.teamId)
  const teams = await prisma.teams.findMany({
    where: {
      id: { in: teamIds }
    },
    select: {
      id: true,
      name: true
    }
  })
  const teamMap = new Map(teams.map(t => [t.id, t.name]))

  // Decrypt and organize bids by player
  const bidsByPlayer: Record<string, Array<{ teamId: string; teamName: string; amount: number }>> = {}
  
  for (const teamBid of teamBids) {
    try {
      const decrypted = decryptBids(teamBid.encryptedBids)
      const parsed = JSON.parse(decrypted)
      
      parsed.bids.forEach((bid: any) => {
        if (!bidsByPlayer[bid.base_player_id]) {
          bidsByPlayer[bid.base_player_id] = []
        }
        bidsByPlayer[bid.base_player_id].push({
          teamId: teamBid.teamId,
          teamName: teamMap.get(teamBid.teamId) || 'Unknown Team',
          amount: bid.amount
        })
      })
    } catch (error) {
      console.error(`Failed to decrypt bids for team ${teamBid.teamId}:`, error)
    }
  }

  // Sort bids for each player by amount (highest first)
  Object.keys(bidsByPlayer).forEach(playerId => {
    bidsByPlayer[playerId].sort((a, b) => b.amount - a.amount)
  })

  // Check for tiebreakers involving this team
  const tiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      roundId: id,
      status: 'pending',
      participants: {
        some: {
          teamId: teamId,
          status: 'active'
        }
      }
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
          photoUrl: true
        }
      },
      participants: {
        where: {
          status: 'active'
        },
        select: {
          teamId: true
        }
      }
    }
  })

  // Transform allocations with proper photo URLs
  const transformedAllocations = allocations.map(a => ({
    ...a,
    basePlayer: {
      ...a.basePlayer,
      photoUrl: getPhotoUrlFromDb(a.basePlayer.photoUrl)
    }
  }))

  // Transform tiebreakers with proper photo URLs
  const transformedTiebreakers = tiebreakers.map(t => ({
    ...t,
    basePlayer: {
      ...t.basePlayer,
      photoUrl: getPhotoUrlFromDb(t.basePlayer.photoUrl)
    }
  }))

  return (
    <RoundResultsClient
      round={round}
      allocations={transformedAllocations}
      tiebreakers={transformedTiebreakers}
      teamId={teamId}
      bidsByPlayer={bidsByPlayer}
    />
  )
}
