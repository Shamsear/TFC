import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import PlayerDetailContent from '@/components/player/PlayerDetailContent'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface PlayerDetailPageProps {
  params: Promise<{
    playerId: string
  }>
}

async function getPlayerData(playerId: string, seasonId: string) {
  const playerData = await prisma.base_players.findUnique({
    where: { id: playerId },
    include: {
      seasonalPlayerStats: {
        where: { seasonId },
        include: {
          season: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      transferHistory: {
        include: {
          season: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!playerData || playerData.seasonalPlayerStats.length === 0) {
    return null
  }

  const stats = playerData.seasonalPlayerStats[0]
  const currentSeasonTransfer = playerData.transferHistory.find(t => t.seasonId === seasonId)

  return {
    seasonId,
    basePlayer: {
      id: playerData.id,
      player_id: playerData.player_id,
      name: playerData.name,
      photoUrl: getPlayerPhotoUrl(`${playerData.player_id || playerData.id}.webp`),
    },
    stats: {
      position: stats.position,
      realWorldClub: stats.realWorldClub,
      overallRating: stats.overallRating,
      starRating: stats.star_rating,
      nationality: stats.nationality,
      playingStyle: stats.playing_style,
      
      // Offensive
      offensiveAwareness: stats.offensive_awareness,
      ballControl: stats.ball_control,
      dribbling: stats.dribbling,
      tightPossession: stats.tight_possession,
      lowPass: stats.low_pass,
      loftedPass: stats.lofted_pass,
      finishing: stats.finishing,
      heading: stats.heading,
      setPieceTaking: stats.set_piece_taking,
      curl: stats.curl,
      
      // Physical
      speed: stats.speed,
      acceleration: stats.acceleration,
      kickingPower: stats.kicking_power,
      jumping: stats.jumping,
      physicalContact: stats.physical_contact,
      balance: stats.balance,
      stamina: stats.stamina,
      
      // Defensive
      defensiveAwareness: stats.defensive_awareness,
      tackling: stats.tackling,
      aggression: stats.aggression,
      defensiveEngagement: stats.defensive_engagement,
      
      // Goalkeeper
      gkAwareness: stats.gk_awareness,
      gkCatching: stats.gk_catching,
      gkParrying: stats.gk_parrying,
      gkReflexes: stats.gk_reflexes,
      gkReach: stats.gk_reach,
    },
    currentTeam: currentSeasonTransfer ? {
      id: currentSeasonTransfer.team.id,
      name: currentSeasonTransfer.team.name,
      logoUrl: currentSeasonTransfer.team.logoUrl,
      soldPrice: currentSeasonTransfer.soldPrice,
    } : null,
    transferHistory: playerData.transferHistory.map(transfer => ({
      id: transfer.id,
      seasonName: transfer.season.name,
      teamName: transfer.team.name,
      teamLogo: transfer.team.logoUrl,
      soldPrice: transfer.soldPrice,
      createdAt: transfer.createdAt,
    })),
    season: stats.season,
  }
}

export default async function TeamPlayerDetailPage({ params }: PlayerDetailPageProps) {
  const session = await auth()
  const { playerId } = await params

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason) {
    redirect("/team/players")
  }

  const playerData = await getPlayerData(playerId, activeSeason.id)

  if (!playerData) {
    notFound()
  }

  const { seasonId, basePlayer, stats, currentTeam, transferHistory, season } = playerData

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16">
        <PlayerDetailContent
          seasonId={seasonId}
          backLink="/team/players"
          basePlayer={basePlayer}
          stats={stats}
          currentTeam={currentTeam}
          transferHistory={transferHistory}
          season={season}
        />
      </main>
    </div>
  )
}
