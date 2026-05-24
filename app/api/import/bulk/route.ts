import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { generatePlayerId, generatePlayerStatsId } from '@/lib/id-generator';
import { normalizeString } from '@/lib/search-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for large imports

interface BulkImportRequest {
  seasonId: string;
  players: EFootballPlayer[];
  batchInfo?: {
    batchNumber: number;
    totalBatches: number;
    overallStart: number;
    overallTotal: number;
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body: BulkImportRequest = await request.json();
  const { seasonId, players, batchInfo } = body;

  const batchLabel = batchInfo 
    ? `batch ${batchInfo.batchNumber}/${batchInfo.totalBatches}` 
    : 'single batch';
  
  console.log(`Bulk import request: ${players?.length || 0} players for season ${seasonId} (${batchLabel})`);

  if (!seasonId || !players) {
    console.error('Missing required fields:', { seasonId: !!seasonId, players: !!players });
    return new Response('Missing required fields', { status: 400 });
  }

  if (players.length === 0) {
    console.error('No players provided');
    return new Response('No players provided', { status: 400 });
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
        let skipped = 0;
        const errors: Array<{ player: string; error: string }> = [];
        const importedPlayers: string[] = [];

        const batchLabel = batchInfo 
          ? `batch ${batchInfo.batchNumber}/${batchInfo.totalBatches}` 
          : 'batch';

        console.log(`Starting bulk import of ${players.length} players (${batchLabel})`);

        // OPTIMIZATION: Pre-fetch all existing player_ids in one query
        const existingPlayerIds = new Set(
          (await prisma.base_players.findMany({
            where: {
              player_id: {
                in: players.map(p => p.playerId).filter(Boolean)
              }
            },
            select: { player_id: true }
          })).map(p => p.player_id)
        );

        console.log(`Found ${existingPlayerIds.size} existing players out of ${players.length}`);

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              total: players.length,
              processed: 0,
              imported: 0,
              skipped: 0,
              currentPlayer: null,
              errors: [],
              importedPlayers: []
            })}\n\n`
          )
        );

        // Prepare batch data for bulk insert
        const playersToCreate: any[] = [];
        const statsToCreate: any[] = [];
        const skippedPlayers: string[] = [];

        // Process each player and prepare data
        for (let i = 0; i < players.length; i++) {
          const player = players[i];

          try {
            // Check if player already exists (using pre-fetched set)
            if (existingPlayerIds.has(player.playerId)) {
              console.log(`Skipping existing player: ${player.playerName} (player_id: ${player.playerId})`);
              skipped++;
              skippedPlayers.push(player.playerName);
              continue;
            }

            // Generate IDs for this player
            const newPlayerId = await generatePlayerId();
            const statsId = await generatePlayerStatsId();

            // Prepare base player data
            playersToCreate.push({
              id: newPlayerId,
              player_id: player.playerId,
              name: player.playerName,
              normalized_name: normalizeString(player.playerName),
              photoUrl: `/players/${player.playerId}.webp`,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            // Prepare stats data
            statsToCreate.push({
              id: statsId,
              basePlayerId: newPlayerId,
              seasonId: seasonId,
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
              createdAt: new Date(),
              updatedAt: new Date()
            });

            imported++;
            importedPlayers.push(player.playerName);

            // Send progress update every 10 players
            if (i % 10 === 0 || i === players.length - 1) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'progress',
                    total: players.length,
                    processed: i + 1,
                    imported,
                    skipped,
                    currentPlayer: player.playerName,
                    errors,
                    importedPlayers: importedPlayers.slice(-10)
                  })}\n\n`
                )
              );
            }
          } catch (error) {
            console.error(`Error preparing player ${player.playerName}:`, error);
            errors.push({
              player: player.playerName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // BULK INSERT: Insert all players and stats in batches
        if (playersToCreate.length > 0) {
          console.log(`Bulk inserting ${playersToCreate.length} players...`);
          
          try {
            // Insert players in chunks of 500 to avoid query size limits
            const CHUNK_SIZE = 500;
            for (let i = 0; i < playersToCreate.length; i += CHUNK_SIZE) {
              const chunk = playersToCreate.slice(i, i + CHUNK_SIZE);
              await prisma.base_players.createMany({
                data: chunk,
                skipDuplicates: true // Skip any duplicates that might occur
              });
              console.log(`Inserted players chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(playersToCreate.length / CHUNK_SIZE)}`);
            }

            // Insert stats in chunks of 500
            for (let i = 0; i < statsToCreate.length; i += CHUNK_SIZE) {
              const chunk = statsToCreate.slice(i, i + CHUNK_SIZE);
              await prisma.seasonal_player_stats.createMany({
                data: chunk,
                skipDuplicates: true
              });
              console.log(`Inserted stats chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(statsToCreate.length / CHUNK_SIZE)}`);
            }

            console.log(`Bulk insert complete: ${playersToCreate.length} players and stats created`);
          } catch (bulkError) {
            console.error('Bulk insert error:', bulkError);
            errors.push({
              player: 'Bulk Insert',
              error: bulkError instanceof Error ? bulkError.message : 'Failed to bulk insert'
            });
          }
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              total: players.length,
              imported,
              skipped,
              errors,
              importedPlayers
            })}\n\n`
          )
        );

        console.log(`Bulk import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
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
