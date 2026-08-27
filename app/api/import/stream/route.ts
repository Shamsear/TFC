import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { generatePlayerId, generatePlayerStatsId, generateIds, ID_PREFIXES } from '@/lib/id-generator';
import { normalizeString } from '@/lib/search-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for large imports

interface ImportRequest {
  seasonId: string;
  mode: 'import' | 'update';
  selectedPlayers: EFootballPlayer[];
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add' | 'add-all' | string>;
  ignoredFields?: string[];
  playerIgnoredFields?: Record<string, string[]>;
}

const SKILL_FIELDS = [
  'scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet',
  'headingSkill', 'bulletHeader',
  'longRangeCurler', 'blitzCurler', 'chipShotControl', 'knuckleShot', 'dippingShot', 'risingShot', 'longRangeShooting', 'lowScreamer', 'acrobaticFinishing', 'heelTrick', 'firstTimeShot', 'phenomenalFinishing', 'willpower',
  'oneTouchPass', 'throughPassing', 'weightedPass', 'pinpointCrossing', 'edgedCrossing', 'outsideCurler', 'rabona', 'noLookPass', 'gameChangingPass', 'visionaryPass', 'phenomenalPass', 'lowLoftedPass',
  'gkLowPunt', 'gkHighPunt', 'longThrow', 'gkLongThrow', 'penaltySpecialist', 'gkPenaltySaver', 'gkDirectingDefence', 'gkSpiritRoar',
  'gamesmanship', 'manMarking', 'trackBack', 'interception', 'blocker', 'aerialSuperiority', 'slidingTackle', 'longReachTackle', 'fortress', 'acrobaticClearance', 'aerialFort',
  'captaincy', 'attackTrigger', 'superSub', 'fightingSpirit', 'trickster', 'mazingRun', 'speedingBullet', 'incisiveRun', 'longBallExpert', 'earlyCross', 'longRanger'
]

const STAT_FIELDS = [
  'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'setPieceTaking', 'curl',
  'speed', 'acceleration', 'kickingPower', 'jumping', 'physicalContact', 'balance', 'stamina',
  'defensiveAwareness', 'tackling', 'aggression', 'defensiveEngagement',
  'gkAwareness', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'
]

const FIELD_MAPPING: Record<string, string> = {
  playingStyle: 'playing_style',
  teamName: 'realWorldClub',
  starRating: 'star_rating',
  weakFootUsage: 'weak_foot_usage',
  weakFootAccuracy: 'weak_foot_accuracy',
  injuryResistance: 'injury_resistance',
  maxLevel: 'max_level',
  overallAtMaxLevel: 'overall_at_max_level',
  offensiveAwareness: 'offensive_awareness',
  ballControl: 'ball_control',
  tightPossession: 'tight_possession',
  lowPass: 'low_pass',
  loftedPass: 'lofted_pass',
  finishing: 'finishing',
  heading: 'heading',
  setPieceTaking: 'set_piece_taking',
  kickingPower: 'kicking_power',
  physicalContact: 'physical_contact',
  defensiveAwareness: 'defensive_awareness',
  defensiveEngagement: 'defensive_engagement',
  gkAwareness: 'gk_awareness',
  gkCatching: 'gk_catching',
  gkParrying: 'gk_parrying',
  gkReflexes: 'gk_reflexes',
  gkReach: 'gk_reach',
  // Skills mapping
  scissorsFeint: 'scissors_feint',
  doubleTouch: 'double_touch',
  flipFlap: 'flip_flap',
  marseilleTurn: 'marseille_turn',
  chopTurn: 'chop_turn',
  cutBehindTurn: 'cut_behind_turn',
  scotchMove: 'scotch_move',
  soleControl: 'sole_control',
  momentumDribbling: 'momentum_dribbling',
  accelerationBurst: 'acceleration_burst',
  magneticFeet: 'magnetic_feet',
  headingSkill: 'heading_skill',
  bulletHeader: 'bullet_header',
  longRangeCurler: 'long_range_curler',
  blitzCurler: 'blitz_curler',
  chipShotControl: 'chip_shot_control',
  knuckleShot: 'knuckle_shot',
  dippingShot: 'dipping_shot',
  risingShot: 'rising_shot',
  longRangeShooting: 'long_range_shooting',
  lowScreamer: 'low_screamer',
  acrobaticFinishing: 'acrobatic_finishing',
  heelTrick: 'heel_trick',
  firstTimeShot: 'first_time_shot',
  phenomenalFinishing: 'phenomenal_finishing',
  oneTouchPass: 'one_touch_pass',
  throughPassing: 'through_passing',
  weightedPass: 'weighted_pass',
  pinpointCrossing: 'pinpoint_crossing',
  edgedCrossing: 'edged_crossing',
  outsideCurler: 'outside_curler',
  noLookPass: 'no_look_pass',
  gameChangingPass: 'game_changing_pass',
  visionaryPass: 'visionary_pass',
  phenomenalPass: 'phenomenal_pass',
  lowLoftedPass: 'low_lofted_pass',
  gkLowPunt: 'gk_low_punt',
  gkHighPunt: 'gk_high_punt',
  gkLongThrow: 'gk_long_throw',
  penaltySpecialist: 'penalty_specialist',
  gkPenaltySaver: 'gk_penalty_saver',
  gkDirectingDefence: 'gk_directing_defence',
  gkSpiritRoar: 'gk_spirit_roar',
  manMarking: 'man_marking',
  trackBack: 'track_back',
  aerialSuperiority: 'aerial_superiority',
  slidingTackle: 'sliding_tackle',
  longReachTackle: 'long_reach_tackle',
  acrobaticClearance: 'acrobatic_clearance',
  aerialFort: 'aerial_fort',
  attackTrigger: 'attack_trigger',
  superSub: 'super_sub',
  fightingSpirit: 'fighting_spirit',
  mazingRun: 'mazing_run',
  speedingBullet: 'speeding_bullet',
  incisiveRun: 'incisive_run',
  longBallExpert: 'long_ball_expert',
  earlyCross: 'early_cross',
  longRanger: 'long_ranger'
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body: ImportRequest = await request.json();
  const { seasonId, mode, selectedPlayers, duplicateResolutions, ignoredFields = [], playerIgnoredFields = {} } = body;

  console.log(`Import request: ${selectedPlayers?.length || 0} players for season ${seasonId}`);

  if (!seasonId || !mode || !selectedPlayers) {
    console.error('Missing required fields:', { seasonId: !!seasonId, mode: !!mode, selectedPlayers: !!selectedPlayers });
    return new Response('Missing required fields', { status: 400 });
  }

  if (selectedPlayers.length === 0) {
    console.error('No players selected');
    return new Response('No players selected', { status: 400 });
  }

  // Verify season exists
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    return new Response('Season not found', { status: 404 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors: Array<{ player: string; error: string }> = [];
        const importedPlayers: string[] = [];
        const updatedPlayers: string[] = [];

        console.log(`Starting import of ${selectedPlayers.length} players in ${mode} mode`);

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              total: selectedPlayers.length,
              processed: 0,
              imported: 0,
              updated: 0,
              skipped: 0,
              currentPlayer: null,
              errors: [],
              importedPlayers: [],
              updatedPlayers: []
            })}\n\n`
          )
        );

        // 1. Fetch all existing base players in one query
        const playerIds = selectedPlayers.map(p => p.playerId);
        const existingBasePlayers = await prisma.base_players.findMany({
          where: { player_id: { in: playerIds } }
        });
        const basePlayerMap = new Map(existingBasePlayers.map(bp => [bp.player_id, bp]));

        // 2. Fetch all existing seasonal stats in one query
        const basePlayerUuids = existingBasePlayers.map(bp => bp.id);
        const existingStats = await prisma.seasonal_player_stats.findMany({
          where: {
            basePlayerId: { in: basePlayerUuids },
            seasonId: seasonId
          }
        });
        const statsMap = new Map(existingStats.map(s => [s.basePlayerId, s]));

        const buildStatsData = (player: EFootballPlayer) => {
          return {
            position: player.position,
            realWorldClub: player.teamName,
            overallRating: player.overallRating,
            star_rating: player.starRating || null,
            nationality: player.nationality || null,
            playing_style: player.playingStyle || null,
            height: player.height || null,
            weight: player.weight || null,
            age: player.age || null,
            foot: player.foot || null,
            featured: player.featured || null,
            weak_foot_usage: player.weakFootUsage || null,
            weak_foot_accuracy: player.weakFootAccuracy || null,
            form: player.form || null,
            injury_resistance: player.injuryResistance || null,
            condition: player.condition || null,
            max_level: player.maxLevel || null,
            overall_at_max_level: player.overallAtMaxLevel || null,
            offensive_awareness: player.offensiveAwareness || null,
            ball_control: player.ballControl || null,
            dribbling: player.dribbling || null,
            tight_possession: player.tightPossession || null,
            low_pass: player.lowPass || null,
            lofted_pass: player.loftedPass || null,
            finishing: player.finishing || null,
            heading: player.heading || null,
            set_piece_taking: player.setPieceTaking || null,
            curl: player.curl || null,
            speed: player.speed || null,
            acceleration: player.acceleration || null,
            kicking_power: player.kickingPower || null,
            jumping: player.jumping || null,
            physical_contact: player.physicalContact || null,
            balance: player.balance || null,
            stamina: player.stamina || null,
            defensive_awareness: player.defensiveAwareness || null,
            tackling: player.tackling || null,
            aggression: player.aggression || null,
            defensive_engagement: player.defensiveEngagement || null,
            gk_awareness: player.gkAwareness || null,
            gk_catching: player.gkCatching || null,
            gk_parrying: player.gkParrying || null,
            gk_reflexes: player.gkReflexes || null,
            gk_reach: player.gkReach || null,
            scissors_feint: player.scissorsFeint || null,
            double_touch: player.doubleTouch || null,
            flip_flap: player.flipFlap || null,
            marseille_turn: player.marseilleTurn || null,
            sombrero: player.sombrero || null,
            chop_turn: player.chopTurn || null,
            cut_behind_turn: player.cutBehindTurn || null,
            scotch_move: player.scotchMove || null,
            sole_control: player.soleControl || null,
            momentum_dribbling: player.momentumDribbling || null,
            acceleration_burst: player.accelerationBurst || null,
            magnetic_feet: player.magneticFeet || null,
            heading_skill: player.headingSkill || null,
            bullet_header: player.bulletHeader || null,
            long_range_curler: player.longRangeCurler || null,
            blitz_curler: player.blitzCurler || null,
            chip_shot_control: player.chipShotControl || null,
            knuckle_shot: player.knuckleShot || null,
            dipping_shot: player.dippingShot || null,
            rising_shot: player.risingShot || null,
            long_range_shooting: player.longRangeShooting || null,
            low_screamer: player.lowScreamer || null,
            acrobatic_finishing: player.acrobaticFinishing || null,
            heel_trick: player.heelTrick || null,
            first_time_shot: player.firstTimeShot || null,
            phenomenal_finishing: player.phenomenalFinishing || null,
            willpower: player.willpower || null,
            one_touch_pass: player.oneTouchPass || null,
            through_passing: player.throughPassing || null,
            weighted_pass: player.weightedPass || null,
            pinpoint_crossing: player.pinpointCrossing || null,
            edged_crossing: player.edgedCrossing || null,
            outside_curler: player.outsideCurler || null,
            rabona: player.rabona || null,
            no_look_pass: player.noLookPass || null,
            game_changing_pass: player.gameChangingPass || null,
            visionary_pass: player.visionaryPass || null,
            phenomenal_pass: player.phenomenalPass || null,
            low_lofted_pass: player.lowLoftedPass || null,
            gk_low_punt: player.gkLowPunt || null,
            gk_high_punt: player.gkHighPunt || null,
            long_throw: player.longThrow || null,
            gk_long_throw: player.gkLongThrow || null,
            penalty_specialist: player.penaltySpecialist || null,
            gk_penalty_saver: player.gkPenaltySaver || null,
            gk_directing_defence: player.gkDirectingDefence || null,
            gk_spirit_roar: player.gkSpiritRoar || null,
            gamesmanship: player.gamesmanship || null,
            man_marking: player.manMarking || null,
            track_back: player.trackBack || null,
            interception: player.interception || null,
            blocker: player.blocker || null,
            aerial_superiority: player.aerialSuperiority || null,
            sliding_tackle: player.slidingTackle || null,
            long_reach_tackle: player.longReachTackle || null,
            fortress: player.fortress || null,
            acrobatic_clearance: player.acrobaticClearance || null,
            aerial_fort: player.aerialFort || null,
            captaincy: player.captaincy || null,
            attack_trigger: player.attackTrigger || null,
            super_sub: player.superSub || null,
            fighting_spirit: player.fightingSpirit || null,
            trickster: player.trickster || null,
            mazing_run: player.mazingRun || null,
            speeding_bullet: player.speedingBullet || null,
            incisive_run: player.incisiveRun || null,
            long_ball_expert: player.longBallExpert || null,
            early_cross: player.earlyCross || null,
            long_ranger: player.longRanger || null,
          };
        };

        // Classify actions for each player
        const toSkip: EFootballPlayer[] = [];
        const toCreatePlayer: EFootballPlayer[] = [];
        const toUpdatePlayer: { player: EFootballPlayer, id: string }[] = [];
        const toCreateStats: { player: EFootballPlayer, basePlayerId: string }[] = [];
        const toUpdateStats: { player: EFootballPlayer, statsId: string, basePlayerId: string }[] = [];

        for (let i = 0; i < selectedPlayers.length; i++) {
          const player = selectedPlayers[i];
          const resolution = duplicateResolutions[player.playerId];

          // Skip conditions
          if (resolution && resolution !== 'skip' && resolution !== 'replace' && resolution !== 'add' && resolution !== 'add-all') {
            if (resolution !== player.playerId) {
              toSkip.push(player);
              continue;
            }
          } else if (resolution === 'skip') {
            toSkip.push(player);
            continue;
          }

          let basePlayer = basePlayerMap.get(player.playerId);

          if (mode === 'update') {
            if (basePlayer) {
              toUpdatePlayer.push({ player, id: basePlayer.id });
            } else {
              toCreatePlayer.push(player);
            }
          } else {
            if (basePlayer) {
              toSkip.push(player);
              continue;
            }
            toCreatePlayer.push(player);
          }

          if (basePlayer) {
            const stats = statsMap.get(basePlayer.id);
            if (stats) {
              toUpdateStats.push({ player, statsId: stats.id, basePlayerId: basePlayer.id });
            } else {
              toCreateStats.push({ player, basePlayerId: basePlayer.id });
            }
          } else {
            toCreateStats.push({ player, basePlayerId: '' }); // basePlayerId will be populated after ID generation
          }
        }

        // Generate IDs in bulk
        const newPlayerIds = await generateIds(ID_PREFIXES.PLAYER, toCreatePlayer.length);
        const newStatsIds = await generateIds(ID_PREFIXES.PLAYER_STATS, toCreateStats.length);

        const createdPlayerIdMap = new Map<string, string>();
        toCreatePlayer.forEach((player, idx) => {
          createdPlayerIdMap.set(player.playerId, newPlayerIds[idx]);
        });

        // Link basePlayerId for new player stats
        toCreateStats.forEach((item) => {
          if (!item.basePlayerId) {
            item.basePlayerId = createdPlayerIdMap.get(item.player.playerId)!;
          }
        });

        // Set up write actions
        const allWrites: (() => Promise<void>)[] = [];

        // 1. Create Base Players
        toCreatePlayer.forEach((player) => {
          const generatedId = createdPlayerIdMap.get(player.playerId)!;
          allWrites.push(async () => {
            await prisma.base_players.create({
              data: {
                id: generatedId,
                player_id: player.playerId,
                name: player.playerName,
                normalized_name: normalizeString(player.playerName),
                photoUrl: `/players/${player.playerId}.webp`,
                updatedAt: new Date()
              }
            });
            imported++;
            importedPlayers.push(player.playerName);
          });
        });

        // 2. Update Base Players
        toUpdatePlayer.forEach(({ player, id }) => {
          allWrites.push(async () => {
            await prisma.base_players.update({
              where: { id },
              data: {
                photoUrl: `/players/${player.playerId}.webp`,
                updatedAt: new Date()
              }
            });
          });
        });

        // 3. Create Stats
        toCreateStats.forEach(({ player, basePlayerId }, idx) => {
          const statsId = newStatsIds[idx];
          const statsData = buildStatsData(player);
          allWrites.push(async () => {
            await prisma.seasonal_player_stats.create({
              data: {
                id: statsId,
                basePlayerId,
                seasonId,
                ...statsData,
                updatedAt: new Date()
              }
            });
          });
        });

        // 4. Update Stats
        toUpdateStats.forEach(({ player, statsId }) => {
          const statsData = buildStatsData(player);
          const currentPlayerIgnoredFields = playerIgnoredFields[player.playerId] || ignoredFields || [];
          const updateData = { ...statsData, updatedAt: new Date() };

          if (currentPlayerIgnoredFields.length > 0) {
            const ignoredDbColumns = new Set<string>();
            currentPlayerIgnoredFields.forEach(field => {
              if (field === 'stats') {
                STAT_FIELDS.forEach(f => ignoredDbColumns.add(FIELD_MAPPING[f] || f));
              } else if (field === 'skills') {
                SKILL_FIELDS.forEach(f => ignoredDbColumns.add(FIELD_MAPPING[f] || f));
              } else if (field === 'teamName') {
                ignoredDbColumns.add('realWorldClub');
              } else {
                ignoredDbColumns.add(FIELD_MAPPING[field] || field);
              }
            });
            ignoredDbColumns.forEach(column => {
              delete (updateData as any)[column];
            });
          }

          allWrites.push(async () => {
            await prisma.seasonal_player_stats.update({
              where: { id: statsId },
              data: updateData
            });
            const isNew = toCreatePlayer.some(cp => cp.playerId === player.playerId);
            if (!isNew) {
              updated++;
              updatedPlayers.push(player.playerName);
            }
          });
        });

        // Execute writes in parallel chunks to keep connection pool stable but extremely fast
        const chunkSize = 40;
        const writeChunks: (() => Promise<void>)[][] = [];
        for (let i = 0; i < allWrites.length; i += chunkSize) {
          writeChunks.push(allWrites.slice(i, i + chunkSize));
        }

        let processedCount = 0;
        skipped = toSkip.length;
        processedCount += toSkip.length;

        if (toSkip.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                total: selectedPlayers.length,
                processed: processedCount,
                imported,
                updated,
                skipped,
                currentPlayer: `Skipped ${toSkip.length} existing/ignored players`,
                errors,
                importedPlayers,
                updatedPlayers
              })}\n\n`
            )
          );
        }

        for (let i = 0; i < writeChunks.length; i++) {
          const currentChunk = writeChunks[i];
          
          await Promise.all(
            currentChunk.map(writeFn => 
              writeFn().catch(err => {
                console.error('Error in write execution:', err);
                errors.push({
                  player: 'Database Write',
                  error: err instanceof Error ? err.message : 'Database write error'
                });
              })
            )
          );

          processedCount += currentChunk.length;

          // Send chunk progress updates
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                total: selectedPlayers.length,
                processed: processedCount,
                imported,
                updated,
                skipped,
                currentPlayer: `Processed ${processedCount}/${selectedPlayers.length} players`,
                errors,
                importedPlayers,
                updatedPlayers
              })}\n\n`
            )
          );
        }

      // Send completion
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            total: selectedPlayers.length,
            imported,
            updated,
            skipped,
            errors,
            importedPlayers,
            updatedPlayers
          })}\n\n`
        )
      );

      console.log(`Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
      controller.close();
    } catch (error) {
      console.error('Stream error:', error);
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`
        )
      );
      controller.close();
    }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
