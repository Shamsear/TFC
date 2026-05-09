import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateSeasonId } from "@/lib/id-generator"

/**
 * GET /api/seasons
 * Returns all seasons with basic info
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const seasons = await prisma.seasons.findMany({
      orderBy: { createdAt: "desc" }
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

    const { name, startingPurse, seasonNumber, isActive } = body

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
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Created season with ID:', season.id)

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
        isActive: isActive ?? false
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

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
