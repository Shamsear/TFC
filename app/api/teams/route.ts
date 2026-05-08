import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

/**
 * GET /api/teams
 * Returns all teams from global registry
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const teams = await prisma.teams.findMany({
      orderBy: { name: "asc" }
    })

    return NextResponse.json(teams)
  } catch (error) {
    logError("Failed to fetch teams", error, extractRequestContext(request))
    
    return NextResponse.json(
      { error: "Failed to fetch teams. Please try again later." },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams
 * Create new team in global registry
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
        "Forbidden access attempt to create team",
        new Error("Non-super-admin attempted team creation"),
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
      logError("Invalid JSON in team creation request", parseError, context)
      return NextResponse.json(
        { error: "Invalid request body. Please provide valid JSON." },
        { status: 400 }
      )
    }

    const { name, managerName, logoUrl } = body

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Team name is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!managerName || typeof managerName !== "string" || managerName.trim() === "") {
      return NextResponse.json(
        { error: "Manager name is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!logoUrl || typeof logoUrl !== "string" || logoUrl.trim() === "") {
      return NextResponse.json(
        { error: "Logo URL is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    // Create team
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const team = await prisma.teams.create({
      data: {
        id: teamId,
        name: name.trim(),
        managerName: managerName.trim(),
        logoUrl: logoUrl.trim(),
        updatedAt: new Date()
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TEAM',
      entityType: 'team',
      entityId: team.id,
      entityName: team.name,
      details: {
        managerName: team.managerName,
        logoUrl: team.logoUrl
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    // Handle Prisma unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A team with this name already exists. Please choose a different name." },
          { status: 409 }
        )
      }
    }

    // Log unexpected errors
    logError("Failed to create team", error, context)
    
    return NextResponse.json(
      { error: "Failed to create team. Please try again later." },
      { status: 500 }
    )
  }
}
