import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { generatePlayerStatsId } from '@/lib/id-generator'

/**
 * POST /api/seasons/[seasonId]/carry-forward
 * 
 * Carries forward ALL players from the previous season to the target season.
 * This means: every player who had seasonal_player_stats in the previous season
 * will get a copy of their stats in the new season — making them available as
 * free agents for the new season's auction.
 * 
 * Admin no longer needs to re-import players each season.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN or SUB_ADMIN can carry forward
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { seasonId } = await params
    const body = await request.json().catch(() => ({}))
    const { previousSeasonId } = body as { previousSeasonId?: string }

    // Verify target season exists
    const targetSeason = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true, seasonNumber: true }
    })
    if (!targetSeason) {
      return NextResponse.json({ error: 'Target season not found' }, { status: 404 })
    }

    // Find the source season (previous season)
    let sourceSeason
    if (previousSeasonId) {
      sourceSeason = await prisma.seasons.findUnique({
        where: { id: previousSeasonId },
        select: { id: true, name: true, seasonNumber: true }
      })
    } else {
      // Auto-detect: find the season with the highest seasonNumber that is less than target
      sourceSeason = await prisma.seasons.findFirst({
        where: { seasonNumber: { lt: targetSeason.seasonNumber } },
        orderBy: { seasonNumber: 'desc' },
        select: { id: true, name: true, seasonNumber: true }
      })
    }

    if (!sourceSeason) {
      return NextResponse.json({
        error: 'No previous season found to carry forward from',
        targetSeason
      }, { status: 404 })
    }

    // Get all players from the source season
    const sourceStats = await prisma.seasonal_player_stats.findMany({
      where: { seasonId: sourceSeason.id },
      select: {
        basePlayerId: true,
        position: true,
        realWorldClub: true,
        overallRating: true,
        star_rating: true,
        nationality: true,
        playing_style: true,
        height: true,
        weight: true,
        age: true,
        foot: true,
        featured: true,
        weak_foot_usage: true,
        weak_foot_accuracy: true,
        form: true,
        injury_resistance: true,
        condition: true,
        max_level: true,
        overall_at_max_level: true,
        offensive_awareness: true,
        ball_control: true,
        dribbling: true,
        tight_possession: true,
        low_pass: true,
        lofted_pass: true,
        finishing: true,
        heading: true,
        set_piece_taking: true,
        curl: true,
        speed: true,
        acceleration: true,
        kicking_power: true,
        jumping: true,
        physical_contact: true,
        balance: true,
        stamina: true,
        defensive_awareness: true,
        tackling: true,
        aggression: true,
        defensive_engagement: true,
        gk_awareness: true,
        gk_catching: true,
        gk_parrying: true,
        gk_reflexes: true,
        gk_reach: true,
        position_group: true,
        // Skill moves
        scissors_feint: true,
        double_touch: true,
        flip_flap: true,
        marseille_turn: true,
        sombrero: true,
        chop_turn: true,
        cut_behind_turn: true,
        scotch_move: true,
        sole_control: true,
        momentum_dribbling: true,
        acceleration_burst: true,
        magnetic_feet: true,
        heading_skill: true,
        bullet_header: true,
        long_range_curler: true,
        blitz_curler: true,
        chip_shot_control: true,
        knuckle_shot: true,
        dipping_shot: true,
        rising_shot: true,
        long_range_shooting: true,
        low_screamer: true,
        acrobatic_finishing: true,
        heel_trick: true,
        first_time_shot: true,
        phenomenal_finishing: true,
        willpower: true,
        one_touch_pass: true,
        through_passing: true,
        weighted_pass: true,
        pinpoint_crossing: true,
        edged_crossing: true,
        outside_curler: true,
        rabona: true,
        no_look_pass: true,
        game_changing_pass: true,
        visionary_pass: true,
        phenomenal_pass: true,
        low_lofted_pass: true,
        gk_low_punt: true,
        gk_high_punt: true,
        long_throw: true,
        gk_long_throw: true,
        penalty_specialist: true,
        gk_penalty_saver: true,
        gk_directing_defence: true,
        gk_spirit_roar: true,
        gamesmanship: true,
        man_marking: true,
        track_back: true,
        interception: true,
        blocker: true,
        aerial_superiority: true,
        sliding_tackle: true,
        long_reach_tackle: true,
        fortress: true,
        acrobatic_clearance: true,
        aerial_fort: true,
        captaincy: true,
        attack_trigger: true,
        super_sub: true,
        fighting_spirit: true,
        trickster: true,
        mazing_run: true,
        speeding_bullet: true,
        incisive_run: true,
        long_ball_expert: true,
        early_cross: true,
        long_ranger: true,
      }
    })

    if (sourceStats.length === 0) {
      return NextResponse.json({
        message: `No players found in ${sourceSeason.name} to carry forward`,
        carried: 0,
        skipped: 0,
        sourceSeason
      })
    }

    // Check which players already have stats in the target season
    const existingTargetStats = await prisma.seasonal_player_stats.findMany({
      where: { seasonId: seasonId },
      select: { basePlayerId: true }
    })
    const existingPlayerIds = new Set(existingTargetStats.map(s => s.basePlayerId))

    // Filter out players that already exist in target season
    const statsToCreate = sourceStats.filter(s => !existingPlayerIds.has(s.basePlayerId))

    if (statsToCreate.length === 0) {
      return NextResponse.json({
        message: `All ${sourceStats.length} players from ${sourceSeason.name} already exist in ${targetSeason.name}`,
        carried: 0,
        skipped: sourceStats.length,
        sourceSeason,
        totalInSource: sourceStats.length
      })
    }

    // Generate IDs and create records in batches
    const BATCH_SIZE = 500
    let carried = 0

    for (let i = 0; i < statsToCreate.length; i += BATCH_SIZE) {
      const batch = statsToCreate.slice(i, i + BATCH_SIZE)
      const batchData = await Promise.all(
        batch.map(async (stat) => ({
          id: await generatePlayerStatsId(),
          basePlayerId: stat.basePlayerId,
          seasonId: seasonId,
          position: stat.position,
          realWorldClub: stat.realWorldClub,
          overallRating: stat.overallRating,
          star_rating: stat.star_rating,
          nationality: stat.nationality,
          playing_style: stat.playing_style,
          height: stat.height,
          weight: stat.weight,
          age: stat.age,
          foot: stat.foot,
          featured: stat.featured,
          weak_foot_usage: stat.weak_foot_usage,
          weak_foot_accuracy: stat.weak_foot_accuracy,
          form: stat.form,
          injury_resistance: stat.injury_resistance,
          condition: stat.condition,
          max_level: stat.max_level,
          overall_at_max_level: stat.overall_at_max_level,
          offensive_awareness: stat.offensive_awareness,
          ball_control: stat.ball_control,
          dribbling: stat.dribbling,
          tight_possession: stat.tight_possession,
          low_pass: stat.low_pass,
          lofted_pass: stat.lofted_pass,
          finishing: stat.finishing,
          heading: stat.heading,
          set_piece_taking: stat.set_piece_taking,
          curl: stat.curl,
          speed: stat.speed,
          acceleration: stat.acceleration,
          kicking_power: stat.kicking_power,
          jumping: stat.jumping,
          physical_contact: stat.physical_contact,
          balance: stat.balance,
          stamina: stat.stamina,
          defensive_awareness: stat.defensive_awareness,
          tackling: stat.tackling,
          aggression: stat.aggression,
          defensive_engagement: stat.defensive_engagement,
          gk_awareness: stat.gk_awareness,
          gk_catching: stat.gk_catching,
          gk_parrying: stat.gk_parrying,
          gk_reflexes: stat.gk_reflexes,
          gk_reach: stat.gk_reach,
          position_group: stat.position_group,
          // Skills
          scissors_feint: stat.scissors_feint,
          double_touch: stat.double_touch,
          flip_flap: stat.flip_flap,
          marseille_turn: stat.marseille_turn,
          sombrero: stat.sombrero,
          chop_turn: stat.chop_turn,
          cut_behind_turn: stat.cut_behind_turn,
          scotch_move: stat.scotch_move,
          sole_control: stat.sole_control,
          momentum_dribbling: stat.momentum_dribbling,
          acceleration_burst: stat.acceleration_burst,
          magnetic_feet: stat.magnetic_feet,
          heading_skill: stat.heading_skill,
          bullet_header: stat.bullet_header,
          long_range_curler: stat.long_range_curler,
          blitz_curler: stat.blitz_curler,
          chip_shot_control: stat.chip_shot_control,
          knuckle_shot: stat.knuckle_shot,
          dipping_shot: stat.dipping_shot,
          rising_shot: stat.rising_shot,
          long_range_shooting: stat.long_range_shooting,
          low_screamer: stat.low_screamer,
          acrobatic_finishing: stat.acrobatic_finishing,
          heel_trick: stat.heel_trick,
          first_time_shot: stat.first_time_shot,
          phenomenal_finishing: stat.phenomenal_finishing,
          willpower: stat.willpower,
          one_touch_pass: stat.one_touch_pass,
          through_passing: stat.through_passing,
          weighted_pass: stat.weighted_pass,
          pinpoint_crossing: stat.pinpoint_crossing,
          edged_crossing: stat.edged_crossing,
          outside_curler: stat.outside_curler,
          rabona: stat.rabona,
          no_look_pass: stat.no_look_pass,
          game_changing_pass: stat.game_changing_pass,
          visionary_pass: stat.visionary_pass,
          phenomenal_pass: stat.phenomenal_pass,
          low_lofted_pass: stat.low_lofted_pass,
          gk_low_punt: stat.gk_low_punt,
          gk_high_punt: stat.gk_high_punt,
          long_throw: stat.long_throw,
          gk_long_throw: stat.gk_long_throw,
          penalty_specialist: stat.penalty_specialist,
          gk_penalty_saver: stat.gk_penalty_saver,
          gk_directing_defence: stat.gk_directing_defence,
          gk_spirit_roar: stat.gk_spirit_roar,
          gamesmanship: stat.gamesmanship,
          man_marking: stat.man_marking,
          track_back: stat.track_back,
          interception: stat.interception,
          blocker: stat.blocker,
          aerial_superiority: stat.aerial_superiority,
          sliding_tackle: stat.sliding_tackle,
          long_reach_tackle: stat.long_reach_tackle,
          fortress: stat.fortress,
          acrobatic_clearance: stat.acrobatic_clearance,
          aerial_fort: stat.aerial_fort,
          captaincy: stat.captaincy,
          attack_trigger: stat.attack_trigger,
          super_sub: stat.super_sub,
          fighting_spirit: stat.fighting_spirit,
          trickster: stat.trickster,
          mazing_run: stat.mazing_run,
          speeding_bullet: stat.speeding_bullet,
          incisive_run: stat.incisive_run,
          long_ball_expert: stat.long_ball_expert,
          early_cross: stat.early_cross,
          long_ranger: stat.long_ranger,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      )

      await prisma.seasonal_player_stats.createMany({
        data: batchData,
        skipDuplicates: true
      })

      carried += batchData.length
    }

    console.log(`✅ Carry-forward complete: ${carried} players carried from ${sourceSeason.name} to ${targetSeason.name}`)

    return NextResponse.json({
      success: true,
      message: `Successfully carried forward ${carried} players from ${sourceSeason.name} to ${targetSeason.name}`,
      carried,
      skipped: existingPlayerIds.size,
      totalInSource: sourceStats.length,
      sourceSeason,
      targetSeason
    })

  } catch (error) {
    console.error('Carry-forward error:', error)
    return NextResponse.json(
      { error: 'Failed to carry forward players' },
      { status: 500 }
    )
  }
}
