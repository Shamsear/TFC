import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { PlayerChange, DuplicateInfo, PreviewResponse } from '../preview/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

function mapStagingToEFootballPlayer(s: any): EFootballPlayer {
  return {
    playerId: s.player_id || '',
    playerName: s.name,
    position: s.position,
    teamName: s.realWorldClub,
    nationality: s.nationality || '',
    overallRating: s.overallRating,
    starRating: s.star_rating || undefined,
    playingStyle: s.playing_style || '',
    height: s.height || undefined,
    weight: s.weight || undefined,
    age: s.age || undefined,
    foot: s.foot || undefined,
    featured: s.featured || undefined,
    weakFootUsage: s.weak_foot_usage || undefined,
    weakFootAccuracy: s.weak_foot_accuracy || undefined,
    form: s.form || undefined,
    injuryResistance: s.injury_resistance || undefined,
    condition: s.condition || undefined,
    maxLevel: s.max_level || undefined,
    overallAtMaxLevel: s.overall_at_max_level || undefined,
    
    // Stats
    offensiveAwareness: s.offensive_awareness || 0,
    ballControl: s.ball_control || 0,
    dribbling: s.dribbling || 0,
    tightPossession: s.tight_possession || 0,
    lowPass: s.low_pass || 0,
    loftedPass: s.lofted_pass || 0,
    finishing: s.finishing || 0,
    heading: s.heading || 0,
    setPieceTaking: s.set_piece_taking || 0,
    curl: s.curl || 0,
    speed: s.speed || 0,
    acceleration: s.acceleration || 0,
    kickingPower: s.kicking_power || 0,
    jumping: s.jumping || 0,
    physicalContact: s.physical_contact || 0,
    balance: s.balance || 0,
    stamina: s.stamina || 0,
    defensiveAwareness: s.defensive_awareness || 0,
    tackling: s.tackling || 0,
    aggression: s.aggression || 0,
    defensiveEngagement: s.defensive_engagement || 0,
    gkAwareness: s.gk_awareness,
    gkCatching: s.gk_catching,
    gkParrying: s.gk_parrying,
    gkReflexes: s.gk_reflexes,
    gkReach: s.gk_reach,

    // Skills
    scissorsFeint: s.scissors_feint || undefined,
    doubleTouch: s.double_touch || undefined,
    flipFlap: s.flip_flap || undefined,
    marseilleTurn: s.marseille_turn || undefined,
    sombrero: s.sombrero || undefined,
    chopTurn: s.chop_turn || undefined,
    cutBehindTurn: s.cut_behind_turn || undefined,
    scotchMove: s.scotch_move || undefined,
    soleControl: s.sole_control || undefined,
    momentumDribbling: s.momentum_dribbling || undefined,
    accelerationBurst: s.acceleration_burst || undefined,
    magneticFeet: s.magnetic_feet || undefined,
    headingSkill: s.heading_skill || undefined,
    bulletHeader: s.bullet_header || undefined,
    longRangeCurler: s.long_range_curler || undefined,
    blitzCurler: s.blitz_curler || undefined,
    chipShotControl: s.chip_shot_control || undefined,
    knuckleShot: s.knuckle_shot || undefined,
    dippingShot: s.dipping_shot || undefined,
    risingShot: s.rising_shot || undefined,
    longRangeShooting: s.long_range_shooting || undefined,
    lowScreamer: s.low_screamer || undefined,
    acrobaticFinishing: s.acrobatic_finishing || undefined,
    heelTrick: s.heel_trick || undefined,
    firstTimeShot: s.first_time_shot || undefined,
    phenomenalFinishing: s.phenomenal_finishing || undefined,
    willpower: s.willpower || undefined,
    oneTouchPass: s.one_touch_pass || undefined,
    throughPassing: s.through_passing || undefined,
    weightedPass: s.weighted_pass || undefined,
    pinpointCrossing: s.pinpoint_crossing || undefined,
    edgedCrossing: s.edged_crossing || undefined,
    outsideCurler: s.outside_curler || undefined,
    rabona: s.rabona || undefined,
    noLookPass: s.no_look_pass || undefined,
    gameChangingPass: s.game_changing_pass || undefined,
    visionaryPass: s.visionary_pass || undefined,
    phenomenalPass: s.phenomenal_pass || undefined,
    lowLoftedPass: s.low_lofted_pass || undefined,
    gkLowPunt: s.gk_low_punt || undefined,
    gkHighPunt: s.gk_high_punt || undefined,
    longThrow: s.long_throw || undefined,
    gkLongThrow: s.gk_long_throw || undefined,
    penaltySpecialist: s.penalty_specialist || undefined,
    gkPenaltySaver: s.gk_penalty_saver || undefined,
    gkDirectingDefence: s.gk_directing_defence || undefined,
    gkSpiritRoar: s.gk_spirit_roar || undefined,
    gamesmanship: s.gamesmanship || undefined,
    manMarking: s.man_marking || undefined,
    trackBack: s.track_back || undefined,
    interception: s.interception || undefined,
    blocker: s.blocker || undefined,
    aerialSuperiority: s.aerial_superiority || undefined,
    slidingTackle: s.sliding_tackle || undefined,
    longReachTackle: s.long_reach_tackle || undefined,
    fortress: s.fortress || undefined,
    acrobaticClearance: s.acrobatic_clearance || undefined,
    aerialFort: s.aerial_fort || undefined,
    captaincy: s.captaincy || undefined,
    attackTrigger: s.attack_trigger || undefined,
    superSub: s.super_sub || undefined,
    fightingSpirit: s.fighting_spirit || undefined,
    trickster: s.trickster || undefined,
    mazingRun: s.mazing_run || undefined,
    speedingBullet: s.speeding_bullet || undefined,
    incisiveRun: s.incisive_run || undefined,
    longBallExpert: s.long_ball_expert || undefined,
    earlyCross: s.early_cross || undefined,
    longRanger: s.long_ranger || undefined,
    positionGroup: s.position_group || undefined
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const seasonId = searchParams.get('seasonId');
    const mode = (searchParams.get('mode') || 'import') as 'import' | 'update';

    if (!sessionId || !seasonId) {
      return NextResponse.json({ error: 'Missing sessionId or seasonId' }, { status: 400 });
    }

    // 1. Fetch staged players
    const stagedRows = await prisma.import_staging_players.findMany({
      where: { importSessionId: sessionId }
    });

    if (stagedRows.length === 0) {
      return NextResponse.json({ error: 'No staged players found for session' }, { status: 404 });
    }

    const players = stagedRows.map(mapStagingToEFootballPlayer);

    // 2. Fetch existing database players that match staged playerIds or names
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

    // 4. Compare staged players with DB to compute differences
    const newPlayers: EFootballPlayer[] = [];
    const unchangedPlayers: EFootballPlayer[] = [];
    const changedPlayers: PlayerChange[] = [];
    const duplicates: DuplicateInfo[] = [];

    // Simple helper to detect changed fields
    const compareStats = (oldStats: any, newStats: EFootballPlayer) => {
      const fields = [
        'position', 'teamName', 'overallRating', 'starRating', 'nationality',
        'playingStyle', 'height', 'weight', 'age', 'foot', 'featured',
        'weakFootUsage', 'weakFootAccuracy', 'form', 'injuryResistance',
        'condition', 'maxLevel', 'overallAtMaxLevel'
      ];
      
      const changed: string[] = [];
      fields.forEach(f => {
        const dbKey = f === 'teamName' ? 'realWorldClub' : f === 'starRating' ? 'star_rating' : f;
        const oldVal = oldStats[dbKey];
        const newVal = (newStats as any)[f];
        
        if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
          changed.push(f);
        }
      });
      return changed;
    };

    players.forEach(player => {
      // Find matching base player
      const matchingBase = player.playerId ? basePlayerMapById.get(player.playerId) : basePlayerMapByName.get(player.playerName);

      if (!matchingBase) {
        newPlayers.push(player);
      } else {
        const stats = statsMapByPlayerId.get(matchingBase.id);

        if (!stats) {
          // Player exists, but has no stats in this season -> Treat as changed/new seasonal stats
          changedPlayers.push({
            playerId: player.playerId,
            playerName: player.playerName,
            oldStats: null,
            newStats: player,
            changedFields: ['season_stats']
          });
        } else {
          // Compare stats
          const changedFields = compareStats(stats, player);
          if (changedFields.length > 0) {
            changedPlayers.push({
              playerId: player.playerId,
              playerName: player.playerName,
              oldStats: stats,
              newStats: player,
              changedFields
            });
          } else {
            unchangedPlayers.push(player);
          }
        }

        // Add duplicate info if name matches but different playerId, or vice versa
        if (matchingBase.player_id !== player.playerId || matchingBase.name !== player.playerName) {
          duplicates.push({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
            existingCount: 1,
            existingPlayers: [{
              id: matchingBase.id,
              name: matchingBase.name,
              team: stats?.realWorldClub || 'Unknown',
              rating: stats?.overallRating || 0,
              position: stats?.position || player.position
            }],
            reason: `Conflicting identity matching ${matchingBase.name}`,
            duplicateType: 'file-vs-db'
          });
        }
      }
    });

    const statsSummary = {
      total: players.length,
      new: newPlayers.length,
      changed: changedPlayers.length,
      unchanged: unchangedPlayers.length,
      duplicates: duplicates.length
    };

    const responsePayload: PreviewResponse = {
      mode,
      players,
      newPlayers,
      changedPlayers,
      unchangedPlayers,
      duplicates,
      seasonId,
      stats: statsSummary
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Failed to get staged preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
