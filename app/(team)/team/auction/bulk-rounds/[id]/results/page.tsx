import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"
import BulkRoundResultsClient from "@/components/team-auction/BulkRoundResultsClient"

export default async function BulkRoundResultsPage({
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

  if (!round || round.roundType !== 'bulk') {
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

  // Get all allocations for this round
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
          name: true,
          logoUrl: true
        }
      }
    },
    orderBy: {
      soldPrice: 'desc'
    }
  })

  // Get all selections for this round to show what teams selected
  const allSelections = await prisma.bulk_round_selections.findMany({
    where: {
      roundId: id,
      submitted: true
    },
    select: {
      teamId: true,
      selectedPlayers: true
    }
  })

  // Get team data for all teams that made selections
  const selectionTeamIds = allSelections.map(s => s.teamId)
  const selectionTeams = await prisma.teams.findMany({
    where: {
      id: { in: selectionTeamIds }
    },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })
  const selectionTeamMap = new Map(selectionTeams.map(t => [t.id, t]))

  // Parse selections and organize by player
  const selectionsByPlayer: Record<string, Array<{ teamId: string; teamName: string; priority: number }>> = {}
  const allSelectedPlayerIds = new Set<string>()

  for (const selection of allSelections) {
    try {
      const parsed = JSON.parse(selection.selectedPlayers as string)
      const team = selectionTeamMap.get(selection.teamId)
      
      parsed.players.forEach((playerId: string, index: number) => {
        allSelectedPlayerIds.add(playerId)
        
        if (!selectionsByPlayer[playerId]) {
          selectionsByPlayer[playerId] = []
        }
        selectionsByPlayer[playerId].push({
          teamId: selection.teamId,
          teamName: team?.name || 'Unknown Team',
          priority: index + 1
        })
      })
    } catch (error) {
      console.error(`Failed to parse selections for team ${selection.teamId}:`, error)
    }
  }

  // Fetch player names for all selected players
  const selectedPlayers = await prisma.base_players.findMany({
    where: {
      id: { in: Array.from(allSelectedPlayerIds) }
    },
    select: {
      id: true,
      name: true
    }
  })
  const playerNameMap = new Map(selectedPlayers.map(p => [p.id, p.name]))

  // Sort selections for each player by priority (highest priority first)
  Object.keys(selectionsByPlayer).forEach(playerId => {
    selectionsByPlayer[playerId].sort((a, b) => a.priority - b.priority)
  })

  // Check for bulk tiebreakers involving this team (only non-completed ones)
  const tiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      roundId: id,
      status: {
        not: 'completed'
      },
      participants: {
        some: {
          teamId: teamId
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
        select: {
          teamId: true,
          status: true,
          submitted: true,
          newBidAmount: true,
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
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
    },
    participants: t.participants.map(p => ({
      ...p,
      submitted: !!p.submitted
    }))
  }))

  return (
    <BulkRoundResultsClient
      round={round}
      allocations={transformedAllocations}
      tiebreakers={transformedTiebreakers}
      teamId={teamId}
      selectionsByPlayer={selectionsByPlayer}
      playerNameMap={playerNameMap}
    />
  )
}
