import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

/**
 * GET /api/teams/[teamId]
 * Returns a specific team
 * Public endpoint (no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      include: {
        unlockedBadges: true,
        xpHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    // 1. Fetch seasons participated
    const seasonTeams = await prisma.season_teams.findMany({
      where: { teamId },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            startingPurse: true
          }
        },
        standings: true
      },
      orderBy: {
        season: {
          createdAt: 'desc'
        }
      }
    })

    // 2. Fetch transfer history with basePlayer details
    const transferHistory = await prisma.transfer_history.findMany({
      where: { teamId, status: 'ACTIVE' },
      include: {
        basePlayer: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // 3. Compute all-time stats
    const totalTrophies = seasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0)
    const highestSigning = transferHistory.reduce((max, t) => Math.max(max, t.soldPrice), 0)
    const seasonsParticipated = seasonTeams.length

    // 4. Format seasonal data with aggregated standing stats
    const seasonalData = seasonTeams.map(st => {
      const played = st.standings.reduce((sum, s) => sum + s.played, 0)
      const won = st.standings.reduce((sum, s) => sum + s.won, 0)
      const drawn = st.standings.reduce((sum, s) => sum + s.drawn, 0)
      const lost = st.standings.reduce((sum, s) => sum + s.lost, 0)
      const goalsFor = st.standings.reduce((sum, s) => sum + s.goalsFor, 0)
      const goalsAgainst = st.standings.reduce((sum, s) => sum + s.goalsAgainst, 0)
      const goalDiff = st.standings.reduce((sum, s) => sum + s.goalDiff, 0)
      const points = st.standings.reduce((sum, s) => sum + s.points, 0)

      return {
        seasonId: st.season.id,
        seasonName: st.season.name,
        currentBudget: st.currentBudget,
        finalBudget: st.finalBudget,
        trophiesWon: st.trophiesWon,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff,
        points
      }
    })

    // 5. Format transfer history
    const formattedTransferHistory = transferHistory.map(t => ({
      id: t.id,
      playerId: t.basePlayerId,
      playerName: t.basePlayer.name,
      seasonId: t.seasonId,
      seasonName: seasonTeams.find(st => st.seasonId === t.seasonId)?.season.name || "Unknown Season",
      soldPrice: t.soldPrice,
      createdAt: t.createdAt.toISOString()
    }))

    const responseData = {
      ...team,
      allTimeStats: {
        totalTrophies,
        highestSigning,
        seasonsParticipated
      },
      seasonalData,
      transferHistory: formattedTransferHistory
    }

    return NextResponse.json(responseData)
  } catch (error) {
    logError("Failed to fetch team details", error, extractRequestContext(request))
    
    return NextResponse.json(
      { error: "Failed to fetch team details. Please try again later." },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teams/[teamId]
 * Update team in global registry
 * Restricted to Super Admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
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
        "Forbidden access attempt to update team",
        new Error("Non-super-admin attempted team update"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      )
    }

    const { teamId } = await params

    // Check if team exists
    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId }
    })

    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      logError("Invalid JSON in team update request", parseError, context)
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

    // Update team
    const team = await prisma.teams.update({
      where: { id: teamId },
      data: {
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
      action: 'UPDATE_TEAM',
      entityType: 'team',
      entityId: team.id,
      entityName: team.name,
      details: {
        previousValues: {
          name: existingTeam.name,
          managerName: existingTeam.managerName,
          logoUrl: existingTeam.logoUrl
        },
        newValues: {
          name: team.name,
          managerName: team.managerName,
          logoUrl: team.logoUrl
        }
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(team)
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
    logError("Failed to update team", error, context)
    
    return NextResponse.json(
      { error: "Failed to update team. Please try again later." },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/[teamId]
 * Delete team from global registry
 * Restricted to Super Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
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
        "Forbidden access attempt to delete team",
        new Error("Non-super-admin attempted team deletion"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      )
    }

    const { teamId } = await params

    // Check if team exists
    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId }
    })

    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    // Delete team (cascade will handle related records)
    await prisma.teams.delete({
      where: { id: teamId }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'DELETE_TEAM',
      entityType: 'team',
      entityId: teamId,
      entityName: existingTeam.name,
      details: {
        deletedTeam: {
          name: existingTeam.name,
          managerName: existingTeam.managerName,
          logoUrl: existingTeam.logoUrl
        }
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Log unexpected errors
    logError("Failed to delete team", error, context)
    
    return NextResponse.json(
      { error: "Failed to delete team. Please try again later." },
      { status: 500 }
    )
  }
}
