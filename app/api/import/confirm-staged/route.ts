import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateIds, ID_PREFIXES } from '@/lib/id-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

interface ConfirmStagedRequest {
  sessionId: string;
  seasonId: string;
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add' | string>;
  deleteAfterSync?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { sessionId, seasonId, duplicateResolutions, deleteAfterSync = false } = (await request.json()) as ConfirmStagedRequest;

    if (!sessionId || !seasonId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch staged players
    const stagedRows = await prisma.import_staging_players.findMany({
      where: { importSessionId: sessionId }
    });

    if (stagedRows.length === 0) {
      return NextResponse.json({ error: 'No staged players found for session' }, { status: 404 });
    }

    // 2. Fetch existing database players for comparison
    const stagedPlayerIds = stagedRows.map(r => r.player_id).filter(Boolean) as string[];
    const stagedNames = stagedRows.map(r => r.name);

    const existingBasePlayers = await prisma.base_players.findMany({
      where: {
        OR: [
          { player_id: { in: stagedPlayerIds } },
          { name: { in: stagedNames } }
        ]
      }
    });

    const basePlayerMapById = new Map<string, typeof existingBasePlayers[0]>();
    const basePlayerMapByName = new Map<string, typeof existingBasePlayers[0]>();
    existingBasePlayers.forEach(p => {
      if (p.player_id) basePlayerMapById.set(p.player_id, p);
      basePlayerMapByName.set(p.name, p);
    });

    // 3. Fetch existing seasonal stats for the active season
    const basePlayerIds = existingBasePlayers.map(p => p.id);
    const existingStats = basePlayerIds.length > 0
      ? await prisma.seasonal_player_stats.findMany({
          where: {
            seasonId,
            basePlayerId: { in: basePlayerIds }
          }
        })
      : [];

    const statsMapByPlayerId = new Map<string, typeof existingStats[0]>();
    existingStats.forEach(s => {
      statsMapByPlayerId.set(s.basePlayerId, s);
    });

    // Lists for bulk operations
    const basePlayersToCreate: any[] = [];
    const seasonalStatsToCreate: any[] = [];

    // Counters for response
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // First pass: identify how many new base players and stats we need to insert
    const stagedToInsert: any[] = [];
    
    stagedRows.forEach(row => {
      const resolution = row.player_id ? duplicateResolutions[row.player_id] : undefined;

      // Handle skip resolution
      if (resolution === 'skip') {
        skipped++;
        return;
      }

      // Find matching base player
      const matchingBase = row.player_id ? basePlayerMapById.get(row.player_id) : basePlayerMapByName.get(row.name);

      // We need to create a new base player if:
      // - No matching base player exists OR
      // - The resolution is explicitly 'add' (to add a new distinct entry for name duplication)
      const shouldCreateBase = !matchingBase || resolution === 'add';

      stagedToInsert.push({
        row,
        shouldCreateBase,
        matchingBase
      });
    });

    // Calculate how many IDs we need to pre-allocate atomically
    const newBaseCount = stagedToInsert.filter(x => x.shouldCreateBase).length;
    const newStatsCount = stagedToInsert.filter(x => {
      // Need new stats entry if creating a new base player OR existing player doesn't have stats for this season yet
      if (x.shouldCreateBase) return true;
      const stats = statsMapByPlayerId.get(x.matchingBase.id);
      return !stats;
    }).length;

    // Atomically pre-allocate ID ranges
    const preAllocatedPlayerIds = await generateIds(ID_PREFIXES.PLAYER, newBaseCount);
    const preAllocatedStatsIds = await generateIds(ID_PREFIXES.PLAYER_STATS, newStatsCount);

    let baseIdIndex = 0;
    let statsIdIndex = 0;

    stagedToInsert.forEach(({ row, shouldCreateBase, matchingBase }) => {
      let finalBasePlayerId = '';

      if (shouldCreateBase) {
        finalBasePlayerId = preAllocatedPlayerIds[baseIdIndex++];
        basePlayersToCreate.push({
          id: finalBasePlayerId,
          player_id: row.player_id,
          name: row.name,
          normalized_name: row.normalized_name,
          photoUrl: row.photoUrl || '/default-player.png',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        imported++;
      } else {
        finalBasePlayerId = matchingBase.id;
      }

      // Check if seasonal stats exist
      const stats = shouldCreateBase ? null : statsMapByPlayerId.get(finalBasePlayerId);

      if (!stats) {
        // Create new stats
        const finalStatsId = preAllocatedStatsIds[statsIdIndex++];
        seasonalStatsToCreate.push({
          id: finalStatsId,
          basePlayerId: finalBasePlayerId,
          seasonId: seasonId,
          position: row.position,
          realWorldClub: row.realWorldClub,
          overallRating: row.overallRating,
          star_rating: row.star_rating,
          
          nationality: row.nationality,
          playing_style: row.playing_style,
          height: row.height,
          weight: row.weight,
          age: row.age,
          foot: row.foot,
          featured: row.featured,
          weak_foot_usage: row.weak_foot_usage,
          weak_foot_accuracy: row.weak_foot_accuracy,
          form: row.form,
          injury_resistance: row.injury_resistance,
          condition: row.condition,
          max_level: row.max_level,
          overall_at_max_level: row.overall_at_max_level,

          offensive_awareness: row.offensive_awareness,
          ball_control: row.ball_control,
          dribbling: row.dribbling,
          tight_possession: row.tight_possession,
          low_pass: row.low_pass,
          lofted_pass: row.lofted_pass,
          finishing: row.finishing,
          heading: row.heading,
          set_piece_taking: row.set_piece_taking,
          curl: row.curl,

          speed: row.speed,
          acceleration: row.acceleration,
          kicking_power: row.kicking_power,
          jumping: row.jumping,
          physical_contact: row.physical_contact,
          balance: row.balance,
          stamina: row.stamina,

          defensive_awareness: row.defensive_awareness,
          tackling: row.tackling,
          aggression: row.aggression,
          defensive_engagement: row.defensive_engagement,

          gk_awareness: row.gk_awareness,
          gk_catching: row.gk_catching,
          gk_parrying: row.gk_parrying,
          gk_reflexes: row.gk_reflexes,
          gk_reach: row.gk_reach,

          scissors_feint: row.scissors_feint,
          double_touch: row.double_touch,
          flip_flap: row.flip_flap,
          marseille_turn: row.marseille_turn,
          sombrero: row.sombrero,
          chop_turn: row.chop_turn,
          cut_behind_turn: row.cut_behind_turn,
          scotch_move: row.scotch_move,
          sole_control: row.sole_control,
          momentum_dribbling: row.momentum_dribbling,
          acceleration_burst: row.acceleration_burst,
          magnetic_feet: row.magnetic_feet,
          heading_skill: row.heading_skill,
          bullet_header: row.bullet_header,
          long_range_curler: row.long_range_curler,
          blitz_curler: row.blitz_curler,
          chip_shot_control: row.chip_shot_control,
          knuckle_shot: row.knuckle_shot,
          dipping_shot: row.dipping_shot,
          rising_shot: row.rising_shot,
          long_range_shooting: row.long_range_shooting,
          low_screamer: row.low_screamer,
          acrobatic_finishing: row.acrobatic_finishing,
          heel_trick: row.heel_trick,
          first_time_shot: row.first_time_shot,
          phenomenal_finishing: row.phenomenal_finishing,
          willpower: row.willpower,
          one_touch_pass: row.one_touch_pass,
          through_passing: row.through_passing,
          weighted_pass: row.weighted_pass,
          pinpoint_crossing: row.pinpoint_crossing,
          edged_crossing: row.edged_crossing,
          outside_curler: row.outside_curler,
          rabona: row.rabona,
          no_look_pass: row.no_look_pass,
          game_changing_pass: row.game_changing_pass,
          visionary_pass: row.visionary_pass,
          phenomenal_pass: row.phenomenal_pass,
          low_lofted_pass: row.low_lofted_pass,
          gk_low_punt: row.gk_low_punt,
          gk_high_punt: row.gk_high_punt,
          long_throw: row.long_throw,
          gk_long_throw: row.gk_long_throw,
          penalty_specialist: row.penalty_specialist,
          gk_penalty_saver: row.gk_penalty_saver,
          gk_directing_defence: row.gk_directing_defence,
          gk_spirit_roar: row.gk_spirit_roar,
          gamesmanship: row.gamesmanship,
          man_marking: row.man_marking,
          track_back: row.track_back,
          interception: row.interception,
          blocker: row.blocker,
          aerial_superiority: row.aerial_superiority,
          sliding_tackle: row.sliding_tackle,
          long_reach_tackle: row.long_reach_tackle,
          fortress: row.fortress,
          acrobatic_clearance: row.acrobatic_clearance,
          aerial_fort: row.aerial_fort,
          captaincy: row.captaincy,
          attack_trigger: row.attack_trigger,
          super_sub: row.super_sub,
          fighting_spirit: row.fighting_spirit,
          trickster: row.trickster,
          mazing_run: row.mazing_run,
          speeding_bullet: row.speeding_bullet,
          incisive_run: row.incisive_run,
          long_ball_expert: row.long_ball_expert,
          early_cross: row.early_cross,
          long_ranger: row.long_ranger,
          position_group: row.position_group,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        if (!shouldCreateBase) {
          imported++;
        }
      } else {
        // Stats already exist, we increment updated counter (will be updated via bulk Postgres query)
        updated++;
      }
    });

    // Execute bulk transactions
    await prisma.$transaction(async (tx) => {
      // 1. Bulk insert base players
      if (basePlayersToCreate.length > 0) {
        const BATCH_SIZE = 2000;
        for (let i = 0; i < basePlayersToCreate.length; i += BATCH_SIZE) {
          const chunk = basePlayersToCreate.slice(i, i + BATCH_SIZE);
          await tx.base_players.createMany({
            data: chunk,
            skipDuplicates: true
          });
        }
      }

      // 2. Bulk insert seasonal stats
      if (seasonalStatsToCreate.length > 0) {
        const BATCH_SIZE = 2000;
        for (let i = 0; i < seasonalStatsToCreate.length; i += BATCH_SIZE) {
          const chunk = seasonalStatsToCreate.slice(i, i + BATCH_SIZE);
          await tx.seasonal_player_stats.createMany({
            data: chunk,
            skipDuplicates: true
          });
        }
      }

      // 3. Bulk update existing stats via raw Postgres UPDATE join (highly optimized!)
      if (updated > 0) {
        await tx.$executeRawUnsafe(`
          UPDATE seasonal_player_stats sp
          SET
            position = s.position,
            "realWorldClub" = s.real_world_club,
            "overallRating" = s.overall_rating,
            star_rating = s.star_rating,
            nationality = s.nationality,
            playing_style = s.playing_style,
            height = s.height,
            weight = s.weight,
            age = s.age,
            foot = s.foot,
            featured = s.featured,
            weak_foot_usage = s.weak_foot_usage,
            weak_foot_accuracy = s.weak_foot_accuracy,
            form = s.form,
            injury_resistance = s.injury_resistance,
            condition = s.condition,
            max_level = s.max_level,
            overall_at_max_level = s.overall_at_max_level,
            offensive_awareness = s.offensive_awareness,
            ball_control = s.ball_control,
            dribbling = s.dribbling,
            tight_possession = s.tight_possession,
            low_pass = s.low_pass,
            lofted_pass = s.lofted_pass,
            finishing = s.finishing,
            heading = s.heading,
            set_piece_taking = s.set_piece_taking,
            curl = s.curl,
            speed = s.speed,
            acceleration = s.acceleration,
            kicking_power = s.kicking_power,
            jumping = s.jumping,
            physical_contact = s.physical_contact,
            balance = s.balance,
            stamina = s.stamina,
            defensive_awareness = s.defensive_awareness,
            tackling = s.tackling,
            aggression = s.aggression,
            defensive_engagement = s.defensive_engagement,
            gk_awareness = s.gk_awareness,
            gk_catching = s.gk_catching,
            gk_parrying = s.gk_parrying,
            gk_reflexes = s.gk_reflexes,
            gk_reach = s.gk_reach,
            scissors_feint = s.scissors_feint,
            double_touch = s.double_touch,
            flip_flap = s.flip_flap,
            marseille_turn = s.marseille_turn,
            sombrero = s.sombrero,
            chop_turn = s.chop_turn,
            cut_behind_turn = s.cut_behind_turn,
            scotch_move = s.scotch_move,
            sole_control = s.sole_control,
            momentum_dribbling = s.momentum_dribbling,
            acceleration_burst = s.acceleration_burst,
            magnetic_feet = s.magnetic_feet,
            heading_skill = s.heading_skill,
            bullet_header = s.bullet_header,
            long_range_curler = s.long_range_curler,
            blitz_curler = s.blitz_curler,
            chip_shot_control = s.chip_shot_control,
            knuckle_shot = s.knuckle_shot,
            dipping_shot = s.dipping_shot,
            rising_shot = s.rising_shot,
            long_range_shooting = s.long_range_shooting,
            low_screamer = s.low_screamer,
            acrobatic_finishing = s.acrobatic_finishing,
            heel_trick = s.heel_trick,
            first_time_shot = s.first_time_shot,
            phenomenal_finishing = s.phenomenal_finishing,
            willpower = s.willpower,
            one_touch_pass = s.one_touch_pass,
            through_passing = s.through_passing,
            weighted_pass = s.weighted_pass,
            pinpoint_crossing = s.pinpoint_crossing,
            edged_crossing = s.edged_crossing,
            outside_curler = s.outside_curler,
            rabona = s.rabona,
            no_look_pass = s.no_look_pass,
            game_changing_pass = s.game_changing_pass,
            visionary_pass = s.visionary_pass,
            phenomenal_pass = s.phenomenal_pass,
            low_lofted_pass = s.low_lofted_pass,
            gk_low_punt = s.gk_low_punt,
            gk_high_punt = s.gk_high_punt,
            long_throw = s.long_throw,
            gk_long_throw = s.gk_long_throw,
            penalty_specialist = s.penalty_specialist,
            gk_penalty_saver = s.gk_penalty_saver,
            gk_directing_defence = s.gk_directing_defence,
            gk_spirit_roar = s.gk_spirit_roar,
            gamesmanship = s.gamesmanship,
            man_marking = s.man_marking,
            track_back = s.track_back,
            interception = s.interception,
            blocker = s.blocker,
            aerial_superiority = s.aerial_superiority,
            sliding_tackle = s.sliding_tackle,
            long_reach_tackle = s.long_reach_tackle,
            fortress = s.fortress,
            acrobatic_clearance = s.acrobatic_clearance,
            aerial_fort = s.aerial_fort,
            captaincy = s.captaincy,
            attack_trigger = s.attack_trigger,
            super_sub = s.super_sub,
            fighting_spirit = s.fighting_spirit,
            trickster = s.trickster,
            mazing_run = s.mazing_run,
            speeding_bullet = s.speeding_bullet,
            incisive_run = s.incisive_run,
            long_ball_expert = s.long_ball_expert,
            early_cross = s.early_cross,
            long_ranger = s.long_ranger,
            "updatedAt" = NOW()
          FROM import_staging_players s
          JOIN base_players bp ON bp.player_id = s.player_id
          WHERE s.import_session_id = $1
            AND sp."basePlayerId" = bp.id
            AND sp."seasonId" = s.season_id
        `, sessionId);
      }

      // 4. Optionally delete staged rows for this session
      if (deleteAfterSync) {
        await tx.import_staging_players.deleteMany({
          where: { importSessionId: sessionId }
        });
      }
    });

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped
    });
  } catch (error) {
    console.error('Failed to confirm staged import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
