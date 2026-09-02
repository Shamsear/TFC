import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeString } from '@/lib/search-utils';
import { EFootballPlayer } from '@/lib/sqlite-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

interface StageRequest {
  seasonId: string;
  players: EFootballPlayer[];
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

    const { seasonId, players } = (await request.json()) as StageRequest;

    if (!seasonId || !players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // Verify season exists
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const importSessionId = `import-${crypto.randomUUID()}`;

    // Map each EFootballPlayer to schema-compatible format
    const stagingData = players.map(player => ({
      importSessionId,
      seasonId,
      player_id: player.playerId ? String(player.playerId) : null,
      name: player.playerName,
      normalized_name: normalizeString(player.playerName),
      photoUrl: player.playerId ? `/players/${player.playerId}.webp` : '/default-player.png',
      position: player.position,
      realWorldClub: player.teamName,
      overallRating: player.overallRating,
      star_rating: player.starRating || null,
      
      // Player Info
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

      // Offensive stats
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

      // Physical stats
      speed: player.speed || null,
      acceleration: player.acceleration || null,
      kicking_power: player.kickingPower || null,
      jumping: player.jumping || null,
      physical_contact: player.physicalContact || null,
      balance: player.balance || null,
      stamina: player.stamina || null,

      // Defensive stats
      defensive_awareness: player.defensiveAwareness || null,
      tackling: player.tackling || null,
      aggression: player.aggression || null,
      defensive_engagement: player.defensiveEngagement || null,

      // Goalkeeper stats
      gk_awareness: player.gkAwareness || null,
      gk_catching: player.gkCatching || null,
      gk_parrying: player.gkParrying || null,
      gk_reflexes: player.gkReflexes || null,
      gk_reach: player.gkReach || null,

      // Skills
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
      position_group: player.positionGroup || null,
      importStatus: 'pending'
    }));

    // Save players into import_staging_players in batches of 5000
    const CHUNK_SIZE = 5000;
    let stagedCount = 0;

    for (let i = 0; i < stagingData.length; i += CHUNK_SIZE) {
      const chunk = stagingData.slice(i, i + CHUNK_SIZE);
      await prisma.import_staging_players.createMany({
        data: chunk,
        skipDuplicates: true
      });
      stagedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      importSessionId,
      count: stagedCount
    });
  } catch (error) {
    console.error('Failed to stage players:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    const where = seasonId ? { seasonId } : {};

    const count = await prisma.import_staging_players.count({ where });

    let latestSession: { importSessionId: string; seasonId: string } | null = null;
    if (count > 0) {
      const sample = await prisma.import_staging_players.findFirst({
        where,
        select: { importSessionId: true, seasonId: true }
      });
      if (sample) {
        latestSession = {
          importSessionId: sample.importSessionId,
          seasonId: sample.seasonId
        };
      }
    }

    return NextResponse.json({
      hasStagedData: count > 0,
      count,
      sessionId: latestSession?.importSessionId || null,
      seasonId: latestSession?.seasonId || null
    });
  } catch (error) {
    console.error('Failed to get staged players count:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "import_staging_players";');
      return NextResponse.json({ success: true, message: 'All staged players cleared successfully' });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const result = await prisma.import_staging_players.deleteMany({
      where: { importSessionId: sessionId }
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} staged players for session ${sessionId}`
    });
  } catch (error) {
    console.error('Failed to clear staged players:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
