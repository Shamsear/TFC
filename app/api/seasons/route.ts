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

    return NextResponse.json(season, { status: 201 })
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
