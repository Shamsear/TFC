import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import PlayerDetailContent from '@/components/player/PlayerDetailContent'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface PlayerDetailPageProps {
  params: Promise<{
    playerId: string
  }>
}

async function getPlayerData(playerId: string) {
  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true }
  })

  if (!activeSeason) {
    return null
  }

  const playerData = await prisma.base_players.findUnique({
    where: { id: playerId },
    include: {
      seasonalPlayerStats: {
        where: { seasonId: activeSeason.id },
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
  const currentSeasonTransfer = playerData.transferHistory.find(t => t.seasonId === activeSeason.id)

  return {
    seasonId: activeSeason.id,
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
      overallAtMaxLevel: stats.overall_at_max_level,
      starRating: stats.star_rating,
      nationality: stats.nationality,
      playingStyle: stats.playing_style,
      
      // Player Info
      height: stats.height,
      weight: stats.weight,
      age: stats.age,
      foot: stats.foot,
      weakFootUsage: stats.weak_foot_usage,
      weakFootAccuracy: stats.weak_foot_accuracy,
      injuryResistance: stats.injury_resistance,
      
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
      
      // Dribbling Skills
      scissorsFeint: stats.scissors_feint,
      doubleTouch: stats.double_touch,
      flipFlap: stats.flip_flap,
      marseilleTurn: stats.marseille_turn,
      sombrero: stats.sombrero,
      chopTurn: stats.chop_turn,
      cutBehindTurn: stats.cut_behind_turn,
      scotchMove: stats.scotch_move,
      soleControl: stats.sole_control,
      momentumDribbling: stats.momentum_dribbling,
      accelerationBurst: stats.acceleration_burst,
      magneticFeet: stats.magnetic_feet,
      
      // Heading Skills
      headingSkill: stats.heading_skill,
      bulletHeader: stats.bullet_header,
      
      // Shooting Skills
      longRangeCurler: stats.long_range_curler,
      blitzCurler: stats.blitz_curler,
      chipShotControl: stats.chip_shot_control,
      knuckleShot: stats.knuckle_shot,
      dippingShot: stats.dipping_shot,
      risingShot: stats.rising_shot,
      longRangeShooting: stats.long_range_shooting,
      lowScreamer: stats.low_screamer,
      acrobaticFinishing: stats.acrobatic_finishing,
      heelTrick: stats.heel_trick,
      firstTimeShot: stats.first_time_shot,
      phenomenalFinishing: stats.phenomenal_finishing,
      willpower: stats.willpower,
      
      // Passing Skills
      oneTouchPass: stats.one_touch_pass,
      throughPassing: stats.through_passing,
      weightedPass: stats.weighted_pass,
      pinpointCrossing: stats.pinpoint_crossing,
      edgedCrossing: stats.edged_crossing,
      outsideCurler: stats.outside_curler,
      rabona: stats.rabona,
      noLookPass: stats.no_look_pass,
      gameChangingPass: stats.game_changing_pass,
      visionaryPass: stats.visionary_pass,
      phenomenalPass: stats.phenomenal_pass,
      lowLoftedPass: stats.low_lofted_pass,
      
      // Goalkeeper Skills
      gkLowPunt: stats.gk_low_punt,
      gkHighPunt: stats.gk_high_punt,
      longThrow: stats.long_throw,
      gkLongThrow: stats.gk_long_throw,
      penaltySpecialist: stats.penalty_specialist,
      gkPenaltySaver: stats.gk_penalty_saver,
      gkDirectingDefence: stats.gk_directing_defence,
      gkSpiritRoar: stats.gk_spirit_roar,
      
      // Defensive Skills
      gamesmanship: stats.gamesmanship,
      manMarking: stats.man_marking,
      trackBack: stats.track_back,
      interception: stats.interception,
      blocker: stats.blocker,
      aerialSuperiority: stats.aerial_superiority,
      slidingTackle: stats.sliding_tackle,
      longReachTackle: stats.long_reach_tackle,
      fortress: stats.fortress,
      acrobaticClearance: stats.acrobatic_clearance,
      aerialFort: stats.aerial_fort,
      
      // Special Skills
      captaincy: stats.captaincy,
      attackTrigger: stats.attack_trigger,
      superSub: stats.super_sub,
      fightingSpirit: stats.fighting_spirit,
      
      // Playing Attributes
      trickster: stats.trickster,
      mazingRun: stats.mazing_run,
      speedingBullet: stats.speeding_bullet,
      incisiveRun: stats.incisive_run,
      longBallExpert: stats.long_ball_expert,
      earlyCross: stats.early_cross,
      longRanger: stats.long_ranger,
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

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const { playerId } = await params
  const playerData = await getPlayerData(playerId)

  if (!playerData) {
    notFound()
  }

  const { seasonId, basePlayer, stats, currentTeam, transferHistory, season } = playerData

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />
      
      <main className="pt-4 lg:pt-4">
        <PlayerDetailContent
          seasonId={seasonId}
          backLink="/players"
          basePlayer={basePlayer}
          stats={stats}
          currentTeam={currentTeam}
          transferHistory={transferHistory}
          season={season}
        />
      </main>

      <PublicFooter />
    </div>
  )
}
