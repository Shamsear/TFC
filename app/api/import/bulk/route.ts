import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';

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
  const { seasonId, players } = body;

  console.log(`Bulk import request: ${players?.length || 0} players for season ${seasonId}`);

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
        let updated = 0;
        let skipped = 0;
        const errors: Array<{ player: string; error: string }> = [];
        const importedPlayers: string[] = [];
        const updatedPlayers: string[] = [];

        console.log(`Starting bulk import of ${players.length} players`);

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              total: players.length,
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

        // Process each player
        for (let i = 0; i < players.length; i++) {
          const player = players[i];

          try {
            console.log(`Processing player ${i + 1}/${players.length}: ${player.playerName}`);
            
            // Send current player update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'current',
                  currentPlayer: player.playerName
                })}\n\n`
              )
            );

            // Find or create base player
            let basePlayer = await prisma.base_players.findFirst({
              where: { name: player.playerName }
            });

            if (!basePlayer) {
              // Create new base player
              basePlayer = await prisma.base_players.create({
                data: {
                  id: `player-${player.playerId}-${Date.now()}`,
                  name: player.playerName,
                  photoUrl: `/players/${player.playerId}.webp`,
                  updatedAt: new Date()
                }
              });
              imported++;
              importedPlayers.push(player.playerName);
            }

            // Check if seasonal stats exist
            const existingStats = await prisma.seasonal_player_stats.findUnique({
              where: {
                basePlayerId_seasonId: {
                  basePlayerId: basePlayer.id,
                  seasonId: seasonId
                }
              }
            });

            const statsData = {
              position: player.position,
              realWorldClub: player.teamName,
              overallRating: player.overallRating,
              star_rating: player.starRating || null,
              nationality: player.nationality || null,
              playing_style: player.playingStyle || null,
              // Player Info
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
              // Offensive Stats
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
              // Physical Stats
              speed: player.speed || null,
              acceleration: player.acceleration || null,
              kicking_power: player.kickingPower || null,
              jumping: player.jumping || null,
              physical_contact: player.physicalContact || null,
              balance: player.balance || null,
              stamina: player.stamina || null,
              // Defensive Stats
              defensive_awareness: player.defensiveAwareness || null,
              tackling: player.tackling || null,
              aggression: player.aggression || null,
              defensive_engagement: player.defensiveEngagement || null,
              // Goalkeeper Stats
              gk_awareness: player.gkAwareness || null,
              gk_catching: player.gkCatching || null,
              gk_parrying: player.gkParrying || null,
              gk_reflexes: player.gkReflexes || null,
              gk_reach: player.gkReach || null,
              // Dribbling Skills
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
              // Heading Skills
              heading_skill: player.headingSkill || null,
              bullet_header: player.bulletHeader || null,
              // Shooting Skills
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
              // Passing Skills
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
              // Goalkeeper Skills
              gk_low_punt: player.gkLowPunt || null,
              gk_high_punt: player.gkHighPunt || null,
              long_throw: player.longThrow || null,
              gk_long_throw: player.gkLongThrow || null,
              penalty_specialist: player.penaltySpecialist || null,
              gk_penalty_saver: player.gkPenaltySaver || null,
              gk_directing_defence: player.gkDirectingDefence || null,
              gk_spirit_roar: player.gkSpiritRoar || null,
              // Defensive Skills
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
              // Special Skills
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
              updatedAt: new Date()
            };

            if (existingStats) {
              // Update existing stats
              await prisma.seasonal_player_stats.update({
                where: { id: existingStats.id },
                data: statsData
              });
              updated++;
              updatedPlayers.push(player.playerName);
            } else {
              // Create new stats
              await prisma.seasonal_player_stats.create({
                data: {
                  id: `stats-${seasonId}-${basePlayer.id}-${Date.now()}`,
                  basePlayerId: basePlayer.id,
                  seasonId: seasonId,
                  ...statsData
                }
              });
              // Only count as imported if we didn't already count the base player
              if (basePlayer.id.startsWith('player-')) {
                // Already counted above
              } else {
                imported++;
                importedPlayers.push(player.playerName);
              }
            }
          } catch (error) {
            console.error(`Error processing player ${player.playerName}:`, error);
            errors.push({
              player: player.playerName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          // Send progress update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                total: players.length,
                processed: i + 1,
                imported,
                updated,
                skipped,
                currentPlayer: player.playerName,
                errors,
                importedPlayers,
                updatedPlayers
              })}\n\n`
            )
          );

          // Small delay to prevent overwhelming the database
          if (i < players.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              total: players.length,
              imported,
              updated,
              skipped,
              errors,
              importedPlayers,
              updatedPlayers
            })}\n\n`
          )
        );

        console.log(`Bulk import complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
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
