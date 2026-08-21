import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * POST /api/seasons/[seasonId]/carry-forward
 *
 * Carries forward ALL players (seasonal_player_stats) from the previous season
 * to the target season using raw SQL for speed and reliability.
 * Streams progress via SSE.
 *
 * Only seasonal_player_stats are copied — no transfer_history, no retentions.
 * Players appear as free agents ready for auction/retention.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const { seasonId } = await params
  const body = await request.json().catch(() => ({}))
  const { previousSeasonId } = body as { previousSeasonId?: string }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // 1. Verify target season
        send({ step: 'verifying', message: 'Verifying target season...' })
        const targetSeason = await prisma.$queryRawUnsafe<{ id: string; name: string; season_number: number }[]>(
          'SELECT id, name, season_number FROM seasons WHERE id = $1', seasonId
        )
        if (!targetSeason.length) {
          send({ step: 'error', error: 'Target season not found' })
          controller.close()
          return
        }
        const target = targetSeason[0]

        // 2. Find source season
        send({ step: 'finding_source', message: 'Finding previous season...' })
        let sourceRows
        if (previousSeasonId) {
          sourceRows = await prisma.$queryRawUnsafe<{ id: string; name: string; season_number: number }[]>(
            'SELECT id, name, season_number FROM seasons WHERE id = $1', previousSeasonId
          )
        } else {
          sourceRows = await prisma.$queryRawUnsafe<{ id: string; name: string; season_number: number }[]>(
            'SELECT id, name, season_number FROM seasons WHERE season_number < $1 ORDER BY season_number DESC LIMIT 1',
            target.season_number
          )
        }
        if (!sourceRows.length) {
          send({ step: 'error', error: 'No previous season found to carry forward from' })
          controller.close()
          return
        }
        const source = sourceRows[0]

        // 3. Count players in source season
        send({ step: 'counting', message: `Counting players in ${source.name}...` })
        const sourceCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
          'SELECT COUNT(*) as count FROM seasonal_player_stats WHERE "seasonId" = $1', source.id
        )
        const totalInSource = Number(sourceCount[0].count)

        if (totalInSource === 0) {
          send({ step: 'complete', message: `No players found in ${source.name}`, carried: 0, skipped: 0, totalInSource: 0 })
          controller.close()
          return
        }

        // 4. Count already existing in target
        const existingCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
          'SELECT COUNT(*) as count FROM seasonal_player_stats WHERE "seasonId" = $1', seasonId
        )
        const alreadyInTarget = Number(existingCount[0].count)

        // 5. Bulk copy using SQL — generates new IDs automatically
        send({
          step: 'copying',
          message: `Copying ${totalInSource} players from ${source.name} to ${target.name}...`,
          totalInSource,
          alreadyInTarget
        })

        // Use INSERT ... SELECT with gen_random_uuid() for new IDs
        // This is a single SQL statement — fast and atomic
        const result = await prisma.$executeRawUnsafe(`
          INSERT INTO seasonal_player_stats (
            id, "basePlayerId", "seasonId", position, "realWorldClub", "overallRating",
            star_rating, nationality, playing_style, height, weight, age, foot, featured,
            weak_foot_usage, weak_foot_accuracy, form, injury_resistance, condition,
            max_level, overall_at_max_level,
            offensive_awareness, ball_control, dribbling, tight_possession, low_pass,
            lofted_pass, finishing, heading, set_piece_taking, curl,
            speed, acceleration, kicking_power, jumping, physical_contact, balance, stamina,
            defensive_awareness, tackling, aggression, defensive_engagement,
            gk_awareness, gk_catching, gk_parrying, gk_reflexes, gk_reach,
            position_group,
            scissors_feint, double_touch, flip_flap, marseille_turn, sombrero,
            chop_turn, cut_behind_turn, scotch_move, sole_control, momentum_dribbling,
            acceleration_burst, magnetic_feet, heading_skill, bullet_header,
            long_range_curler, blitz_curler, chip_shot_control, knuckle_shot,
            dipping_shot, rising_shot, long_range_shooting, low_screamer,
            acrobatic_finishing, heel_trick, first_time_shot, phenomenal_finishing,
            willpower, one_touch_pass, through_passing, weighted_pass,
            pinpoint_crossing, edged_crossing, outside_curler, rabona,
            no_look_pass, game_changing_pass, visionary_pass, phenomenal_pass,
            low_lofted_pass, gk_low_punt, gk_high_punt, long_throw, gk_long_throw,
            penalty_specialist, gk_penalty_saver, gk_directing_defence, gk_spirit_roar,
            gamesmanship, man_marking, track_back, interception, blocker,
            aerial_superiority, sliding_tackle, long_reach_tackle, fortress,
            acrobatic_clearance, aerial_fort, captaincy, attack_trigger,
            super_sub, fighting_spirit, trickster, mazing_run, speeding_bullet,
            incisive_run, long_ball_expert, early_cross, long_ranger,
            "createdAt", "updatedAt"
          )
          SELECT
            gen_random_uuid(), s."basePlayerId", $2, s.position, s."realWorldClub", s."overallRating",
            s.star_rating, s.nationality, s.playing_style, s.height, s.weight, s.age, s.foot, s.featured,
            s.weak_foot_usage, s.weak_foot_accuracy, s.form, s.injury_resistance, s.condition,
            s.max_level, s.overall_at_max_level,
            s.offensive_awareness, s.ball_control, s.dribbling, s.tight_possession, s.low_pass,
            s.lofted_pass, s.finishing, s.heading, s.set_piece_taking, s.curl,
            s.speed, s.acceleration, s.kicking_power, s.jumping, s.physical_contact, s.balance, s.stamina,
            s.defensive_awareness, s.tackling, s.aggression, s.defensive_engagement,
            s.gk_awareness, s.gk_catching, s.gk_parrying, s.gk_reflexes, s.gk_reach,
            s.position_group,
            s.scissors_feint, s.double_touch, s.flip_flap, s.marseille_turn, s.sombrero,
            s.chop_turn, s.cut_behind_turn, s.scotch_move, s.sole_control, s.momentum_dribbling,
            s.acceleration_burst, s.magnetic_feet, s.heading_skill, s.bullet_header,
            s.long_range_curler, s.blitz_curler, s.chip_shot_control, s.knuckle_shot,
            s.dipping_shot, s.rising_shot, s.long_range_shooting, s.low_screamer,
            s.acrobatic_finishing, s.heel_trick, s.first_time_shot, s.phenomenal_finishing,
            s.willpower, s.one_touch_pass, s.through_passing, s.weighted_pass,
            s.pinpoint_crossing, s.edged_crossing, s.outside_curler, s.rabona,
            s.no_look_pass, s.game_changing_pass, s.visionary_pass, s.phenomenal_pass,
            s.low_lofted_pass, s.gk_low_punt, s.gk_high_punt, s.long_throw, s.gk_long_throw,
            s.penalty_specialist, s.gk_penalty_saver, s.gk_directing_defence, s.gk_spirit_roar,
            s.gamesmanship, s.man_marking, s.track_back, s.interception, s.blocker,
            s.aerial_superiority, s.sliding_tackle, s.long_reach_tackle, s.fortress,
            s.acrobatic_clearance, s.aerial_fort, s.captaincy, s.attack_trigger,
            s.super_sub, s.fighting_spirit, s.trickster, s.mazing_run, s.speeding_bullet,
            s.incisive_run, s.long_ball_expert, s.early_cross, s.long_ranger,
            NOW(), NOW()
          FROM seasonal_player_stats s
          WHERE s."seasonId" = $1
          AND NOT EXISTS (
            SELECT 1 FROM seasonal_player_stats t
            WHERE t."seasonId" = $2 AND t."basePlayerId" = s."basePlayerId"
          )
        `, source.id, seasonId)

        const carried = Number(result)

        send({
          step: 'complete',
          message: `Successfully carried forward ${carried} players from ${source.name} to ${target.name}`,
          carried,
          skipped: alreadyInTarget,
          totalInSource,
          sourceSeason: source,
          targetSeason: target
        })

        console.log(`✅ Carry-forward complete: ${carried} players from ${source.name} → ${target.name}`)

      } catch (error) {
        console.error('Carry-forward error:', error)
        send({ step: 'error', error: error instanceof Error ? error.message : 'Failed to carry forward players' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
