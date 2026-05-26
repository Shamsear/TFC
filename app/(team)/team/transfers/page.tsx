import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"
import TransfersClient from "@/components/team/TransfersClient"

export const metadata = {
  title: "Completed Transfers | Team Dashboard",
  description: "View all completed swaps and player releases in the league",
}

export default async function TransfersHistoryPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason || !seasonTeam) {
    redirect("/team/not-in-season")
  }

  // Get current team info
  const currentTeam = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  })

  // 1. Fetch all approved releases in this season
  const doneReleases = await prisma.release_requests.findMany({
    where: {
      seasonId: activeSeason.id,
      status: "approved",
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      basePlayer: {
        select: {
          id: true,
          player_id: true,
          photoUrl: true,
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
            select: {
              position: true,
              overallRating: true,
              realWorldClub: true,
            },
          },
        },
      },
    },
    orderBy: {
      processedAt: "desc",
    },
  })

  // 2. Fetch all approved swaps in this season
  const doneSwaps = await prisma.swap_requests.findMany({
    where: {
      seasonId: activeSeason.id,
      status: "approved",
    },
    include: {
      requestingTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      targetTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      players: {
        include: {
          basePlayer: {
            select: {
              id: true,
              player_id: true,
              photoUrl: true,
              seasonalPlayerStats: {
                where: {
                  seasonId: activeSeason.id,
                },
                select: {
                  position: true,
                  overallRating: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      processedAt: "desc",
    },
  })

  // Format data for client consumption
  const releases = doneReleases.map((req) => {
    const stats = req.basePlayer.seasonalPlayerStats[0]
    return {
      id: req.id,
      playerId: req.playerId,
      playerPhoto: getPhotoUrlFromDb(req.basePlayer.photoUrl),
      playerName: req.playerName,
      position: stats?.position || "Unknown",
      overall: stats?.overallRating || 0,
      club: stats?.realWorldClub || "Unknown",
      refundAmount: req.refundAmount,
      notes: req.notes || "",
      processedAt: req.processedAt ? req.processedAt.toISOString() : req.submittedAt?.toISOString() || new Date().toISOString(),
      teamId: req.teamId,
      teamName: req.team.name,
      teamLogo: req.team.logoUrl,
    }
  })

  const swaps = doneSwaps.map((req) => ({
    id: req.id,
    requestingTeamId: req.requestingTeamId,
    requestingTeamName: req.requestingTeam.name,
    requestingTeamLogo: req.requestingTeam.logoUrl,
    targetTeamId: req.targetTeamId,
    targetTeamName: req.targetTeam.name,
    targetTeamLogo: req.targetTeam.logoUrl,
    processedAt: req.processedAt ? req.processedAt.toISOString() : req.submittedAt?.toISOString() || new Date().toISOString(),
    players: req.players.map((p) => {
      const stats = p.basePlayer.seasonalPlayerStats[0]
      return {
        id: p.id,
        playerId: p.playerId,
        playerPhoto: getPhotoUrlFromDb(p.basePlayer.photoUrl),
        playerName: p.playerName,
        fromTeamId: p.fromTeamId,
        toTeamId: p.toTeamId,
        playerValue: p.playerValue,
        position: stats?.position || "Unknown",
        overall: stats?.overallRating || 0,
      }
    }),
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <TransfersClient
        myTeamId={session.user.teamId!}
        myTeamName={currentTeam?.name || "My Team"}
        seasonName={activeSeason.name}
        releases={releases}
        swaps={swaps}
      />
    </div>
  )
}
