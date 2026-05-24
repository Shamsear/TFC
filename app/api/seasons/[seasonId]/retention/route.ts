import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateRetentionId, generateTransferId, generateSeasonTeamId, generateFinancialId } from "@/lib/id-generator"

/**
 * POST /api/seasons/[seasonId]/retention
 * Process retention selections for a new season
 * Validates maximum retention limit per team
 * Queries previous season roster
 * Creates Retention records
 * Restricted to Sub Admin role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
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

    // Check Sub Admin or Super Admin role
    if (session.user.role !== "SUB_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      logError(
        "Forbidden access attempt to process retention",
        new Error("Unauthorized role attempted retention processing"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { seasonId } = await params

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      logError("Invalid JSON in retention request", parseError, { ...context, seasonId })
      return NextResponse.json(
        { error: "Invalid request body. Please provide valid JSON." },
        { status: 400 }
      )
    }

    const { retentions, maxRetentionsPerTeam, previousSeasonId } = body

    // Validate required fields
    if (!Array.isArray(retentions)) {
      return NextResponse.json(
        { error: "retentions must be an array" },
        { status: 400 }
      )
    }

    if (!previousSeasonId || typeof previousSeasonId !== "string") {
      return NextResponse.json(
        { error: "previousSeasonId is required and must be a string" },
        { status: 400 }
      )
    }

    if (maxRetentionsPerTeam !== undefined && (typeof maxRetentionsPerTeam !== "number" || maxRetentionsPerTeam < 0)) {
      return NextResponse.json(
        { error: "maxRetentionsPerTeam must be a non-negative number" },
        { status: 400 }
      )
    }

    // Validate retention structure
    for (const retention of retentions) {
      if (!retention.basePlayerId || typeof retention.basePlayerId !== "string") {
        return NextResponse.json(
          { error: "Each retention must have a valid basePlayerId" },
          { status: 400 }
        )
      }
      if (!retention.teamId || typeof retention.teamId !== "string") {
        return NextResponse.json(
          { error: "Each retention must have a valid teamId" },
          { status: 400 }
        )
      }
    }

    // Verify season exists
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return NextResponse.json(
        { error: "Season not found. Please verify the season ID." },
        { status: 404 }
      )
    }

    // Verify previous season exists
    const previousSeason = await prisma.seasons.findUnique({
      where: { id: previousSeasonId }
    })

    if (!previousSeason) {
      return NextResponse.json(
        { error: "Previous season not found. Please verify the previous season ID." },
        { status: 404 }
      )
    }

    // Validate retention limit per team if specified
    if (maxRetentionsPerTeam !== undefined) {
      const retentionsByTeam = new Map<string, number>()
      
      for (const retention of retentions) {
        const count = retentionsByTeam.get(retention.teamId) || 0
        retentionsByTeam.set(retention.teamId, count + 1)
      }

      for (const [teamId, count] of retentionsByTeam.entries()) {
        if (count > maxRetentionsPerTeam) {
          return NextResponse.json(
            { error: `Team ${teamId} exceeds maximum retention limit of ${maxRetentionsPerTeam}` },
            { status: 400 }
          )
        }
      }
    }

    // Query previous season roster to verify players were actually on those teams
    const previousSeasonTransfers = await prisma.transfer_history.findMany({
      where: {
        seasonId: previousSeasonId,
        basePlayerId: { in: retentions.map(r => r.basePlayerId) }
      },
      include: {
        basePlayer: true
      }
    })

    // Create a map of player to team from previous season
    const playerTeamMap = new Map<string, string>()
    for (const transfer of previousSeasonTransfers) {
      playerTeamMap.set(transfer.basePlayerId, transfer.teamId)
    }

    // Validate that each retention matches the previous season's team assignment
    for (const retention of retentions) {
      const previousTeamId = playerTeamMap.get(retention.basePlayerId)
      
      if (!previousTeamId) {
        return NextResponse.json(
          { error: `Player ${retention.basePlayerId} was not found in previous season roster` },
          { status: 400 }
        )
      }

      if (previousTeamId !== retention.teamId) {
        return NextResponse.json(
          { error: `Player ${retention.basePlayerId} was not on team ${retention.teamId} in previous season` },
          { status: 400 }
        )
      }
    }

    // Verify all base players exist
    const basePlayers = await prisma.base_players.findMany({
      where: { id: { in: retentions.map(r => r.basePlayerId) } }
    })

    if (basePlayers.length !== retentions.length) {
      return NextResponse.json(
        { error: "One or more player IDs are invalid. Please verify all player IDs exist." },
        { status: 400 }
      )
    }

    // Create Retention records and transfer history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdRetentions = []
      
      for (const retention of retentions) {
        // Create retention record
        const retentionId = await generateRetentionId()
        const retentionRecord = await tx.retentions.create({
          data: {
            id: retentionId,
            seasonId,
            basePlayerId: retention.basePlayerId,
            retainedFromSeasonId: previousSeasonId
          },
          include: {
            basePlayer: true,
            season: true
          }
        })
        
        createdRetentions.push(retentionRecord)
        
        // Get the original transfer price from previous season
        const previousTransfer = await tx.transfer_history.findFirst({
          where: {
            seasonId: previousSeasonId,
            basePlayerId: retention.basePlayerId,
            teamId: retention.teamId
          }
        })
        
        // Create transfer history for the new season (retained at same price)
        const transferId = await generateTransferId();
        await tx.transfer_history.create({
          data: {
            id: transferId,
            seasonId,
            basePlayerId: retention.basePlayerId,
            teamId: retention.teamId,
            soldPrice: previousTransfer?.soldPrice || 0,
            status: 'ACTIVE'
          }
        })
      }
      
      return createdRetentions
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TEAM',
      entityType: 'retention',
      entityId: seasonId,
      entityName: 'Player Retentions',
      seasonId,
      details: {
        previousSeasonId,
        retentionCount: result.length,
        maxRetentionsPerTeam,
        players: retentions.map((r: any) => ({
          playerId: r.basePlayerId,
          teamId: r.teamId
        }))
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      {
        retentions: result,
        message: `Successfully retained ${result.length} players for the new season`
      },
      { status: 201 }
    )
  } catch (error) {
    // Handle Prisma unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "One or more players are already retained for this season" },
          { status: 409 }
        )
      }
    }

    // Log unexpected errors
    logError("Failed to process retention selections", error, context)
    
    return NextResponse.json(
      { error: "Failed to process retention selections. Please try again later." },
      { status: 500 }
    )
  }
}
