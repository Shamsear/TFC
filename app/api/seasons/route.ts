import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateSeasonId } from "@/lib/id-generator"
import { triggerNews } from "@/lib/news/trigger"

/**
 * GET /api/seasons
 * Returns all seasons with basic info
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    // Add limit and select only needed fields
    const seasons = await prisma.seasons.findMany({
      select: {
        id: true,
        name: true,
        seasonNumber: true,
        isActive: true,
        startingPurse: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 50 // Limit to last 50 seasons
    })

    return NextResponse.json(seasons)
  } catch (error) {
    logError("Failed to fetch seasons", error, extractRequestContext(request))
    
    return NextResponse.json(
      { error: "Failed to fetch seasons. Please try again later." },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seasons
 * Create new season with starting purse
 * Restricted to Super Admin role
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request)
  
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      )
    }

    // Check Super Admin role
    if (session.user.role !== "SUPER_ADMIN") {
      logError(
        "Forbidden access attempt to create season",
        new Error("Non-super-admin attempted season creation"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      logError("Invalid JSON in season creation request", parseError, context)
      return NextResponse.json(
        { error: "Invalid request body. Please provide valid JSON." },
        { status: 400 }
      )
    }

    const { name, startingPurse, seasonNumber, isActive, minSquadSize, maxSquadSize } = body

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Season name is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (startingPurse === undefined || startingPurse === null) {
      return NextResponse.json(
        { error: "Starting purse is required" },
        { status: 400 }
      )
    }

    if (typeof startingPurse !== "number" || startingPurse < 0) {
      return NextResponse.json(
        { error: "Starting purse must be a non-negative number" },
        { status: 400 }
      )
    }

    if (!seasonNumber || typeof seasonNumber !== "number" || seasonNumber < 1) {
      return NextResponse.json(
        { error: "Season number is required and must be a positive number" },
        { status: 400 }
      )
    }

    // Validate squad size fields (optional, with defaults)
    const minSquad = minSquadSize && typeof minSquadSize === "number" ? minSquadSize : 25;
    const maxSquad = maxSquadSize && typeof maxSquadSize === "number" ? maxSquadSize : 30;

    if (minSquad < 1) {
      return NextResponse.json(
        { error: "Minimum squad size must be at least 1" },
        { status: 400 }
      )
    }

    if (maxSquad < minSquad) {
      return NextResponse.json(
        { error: "Maximum squad size must be greater than or equal to minimum squad size" },
        { status: 400 }
      )
    }

    // Check if season number already exists
    const existingSeasonWithNumber = await prisma.seasons.findUnique({
      where: { seasonNumber }
    })

    if (existingSeasonWithNumber) {
      return NextResponse.json(
        { error: `Season number ${seasonNumber} is already in use. Please choose a different number.` },
        { status: 409 }
      )
    }

    // Generate clean season ID based on season number
    const seasonId = `TFCS-${seasonNumber}`
    console.log('🆔 Generated Season ID:', seasonId)
    
    const season = await prisma.seasons.create({
      data: {
        id: seasonId,
        seasonNumber,
        name: name.trim(),
        startingPurse,
        isActive: isActive ?? false,
        defaultMaxBidsPerTeam: 0, // Start with 0, will update when teams are assigned
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Created season with ID:', season.id)

    // Create auction settings for the season using Prisma
    try {
      await prisma.$executeRaw`
        INSERT INTO auction_settings (
          season_id,
          auction_window,
          phase_1_end_round,
          phase_1_min_balance,
          phase_2_end_round,
          phase_2_min_balance,
          phase_3_min_balance,
          min_squad_size,
          max_squad_size,
          max_rounds,
          contract_duration,
          min_balance_per_round
        ) VALUES (
          ${seasonId},
          'season_start',
          18,
          30,
          20,
          30,
          10,
          ${minSquad},
          ${maxSquad},
          25,
          2,
          30
        )
        ON CONFLICT (season_id) DO UPDATE SET
          min_squad_size = ${minSquad},
          max_squad_size = ${maxSquad},
          updated_at = NOW()
      `;
      
      console.log(`✅ Created auction settings for season ${seasonId} (min: ${minSquad}, max: ${maxSquad})`);
    } catch (settingsError) {
      console.error('⚠️ Failed to create auction settings:', settingsError);
      // Don't fail the entire request if auction settings creation fails
      // The season is still created successfully
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TEAM',
      entityType: 'season',
      entityId: season.id,
      entityName: season.name,
      seasonId: season.id,
      details: {
        startingPurse,
        isActive: isActive ?? false,
        minSquadSize: minSquad,
        maxSquadSize: maxSquad
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Auto-carry-forward: copy all players from previous season via raw SQL
    let carriedForward = 0
    try {
      const copyResult = await prisma.$executeRawUnsafe(`
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
          gen_random_uuid(), s."basePlayerId", $1, s.position, s."realWorldClub", s."overallRating",
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
        JOIN seasons prev ON prev.season_number = $2 AND prev.id = s."seasonId"
        WHERE NOT EXISTS (
          SELECT 1 FROM seasonal_player_stats t
          WHERE t."seasonId" = $1 AND t."basePlayerId" = s."basePlayerId"
        )
      `, seasonId, seasonNumber - 1)

      carriedForward = Number(copyResult)
      if (carriedForward > 0) {
        console.log(`✅ Auto-carry-forward: ${carriedForward} players carried to ${name}`)
      }
    } catch (carryErr) {
      console.error('⚠️ Auto-carry-forward failed (non-blocking):', carryErr)
      // Don't fail season creation if carry-forward fails
    }

    // Generate AI news for season creation
    try {
      await triggerNews('season_created', {
        season_id: season.id,
        season_name: season.name,
        metadata: {
          season_number: seasonNumber,
          starting_purse: startingPurse,
          min_squad: minSquad,
          max_squad: maxSquad,
          is_active: isActive ?? false
        }
      });
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate season creation news:', newsErr);
    }

    return NextResponse.json({ ...season, carriedForward }, { status: 201 })
  } catch (error) {
    // Handle Prisma unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A season with this name already exists. Please choose a different name." },
          { status: 409 }
        )
      }
    }

    // Log unexpected errors
    logError("Failed to create season", error, context)
    
    return NextResponse.json(
      { error: "Failed to create season. Please try again later." },
      { status: 500 }
    )
  }
}
