import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateTeamId, generateUserId, generateSeasonTeamId, generateFinancialId } from "@/lib/id-generator"
import { generateUniqueEmail, generatePasswordFromTeamName } from "@/lib/password-generator"
import { hash } from "bcryptjs"

/**
 * GET /api/teams
 * Returns all teams from global registry
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    // Add limit to prevent loading all teams
    const teams = await prisma.teams.findMany({
      orderBy: { name: "asc" },
      take: 100 // Limit to 100 teams
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

    const { name, managerName, logoUrl, seasonId } = body

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

    // Validate season if provided
    let season = null
    if (seasonId) {
      season = await prisma.seasons.findUnique({
        where: { id: seasonId }
      })
      
      if (!season) {
        return NextResponse.json(
          { error: "Invalid season ID" },
          { status: 400 }
        )
      }
    } else {
      // Default to active season
      season = await prisma.seasons.findFirst({
        where: { isActive: true }
      })
    }

    // Generate credentials
    const email = await generateUniqueEmail(name.trim(), async (email) => {
      const existing = await prisma.users.findUnique({
        where: { email }
      })
      return !!existing
    })
    
    const password = generatePasswordFromTeamName(name.trim())
    const passwordHash = await hash(password, 10)

    // Generate IDs
    const teamId = await generateTeamId()
    const userId = await generateUserId()

    // Create team and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create team
      const team = await tx.teams.create({
        data: {
          id: teamId,
          name: name.trim(),
          managerName: managerName.trim(),
          logoUrl: logoUrl.trim(),
          updatedAt: new Date()
        }
      })

      // Create season_teams record if season is provided
      if (season) {
        const seasonTeamId = await generateSeasonTeamId()
        const ledgerId = await generateFinancialId()
        
        await tx.season_teams.create({
          data: {
            id: seasonTeamId,
            seasonId: season.id,
            teamId: team.id,
            currentBudget: season.startingPurse,
            trophiesWon: 0,
            updatedAt: new Date()
          }
        })

        // Create initial financial ledger entry
        await tx.financial_ledger.create({
          data: {
            id: ledgerId,
            seasonTeamId: seasonTeamId,
            seasonId: season.id,
            transactionType: 'INITIAL_PURSE',
            amount: season.startingPurse,
            previousBalance: 0,
            newBalance: season.startingPurse,
            description: 'Initial season purse'
          }
        })

        // Update defaultMaxBidsPerTeam to match the number of teams in the season
        const teamCount = await tx.season_teams.count({
          where: { seasonId: season.id }
        })
        
        await tx.seasons.update({
          where: { id: season.id },
          data: { 
            defaultMaxBidsPerTeam: teamCount,
            updatedAt: new Date()
          }
        })
      }

      // Create user (team manager)
      const user = await tx.users.create({
        data: {
          id: userId,
          email,
          name: managerName.trim(),
          passwordHash,
          role: "TEAM_MANAGER",
          teamId: team.id,
          createdBy: session.user.id,
          isActive: true,
          assignedSeasons: season ? [season.id] : []
        }
      })

      return { team, user, password }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TEAM',
      entityType: 'team',
      entityId: result.team.id,
      entityName: result.team.name,
      details: {
        managerName: result.team.managerName,
        logoUrl: result.team.logoUrl,
        userEmail: email,
        assignedSeasons: season ? [season.id] : []
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      team: result.team,
      credentials: {
        email,
        password: result.password
      }
    }, { status: 201 })
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
