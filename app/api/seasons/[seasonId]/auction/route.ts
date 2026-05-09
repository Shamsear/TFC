import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateTransferId, generateSeasonTeamId, generateFinancialId } from "@/lib/id-generator"

interface AuctionRequestBody {
  teamId: string
  basePlayerId: string
  amount: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const context = extractRequestContext(request)
  
  try {
    // Authentication check
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      )
    }

    // Role check - only Sub Admin can process auction sales
    if (session.user.role !== "SUB_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      logError(
        "Forbidden access attempt to process auction",
        new Error("Unauthorized role attempted auction processing"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Only Sub Admins can process auction sales" },
        { status: 403 }
      )
    }

    const { seasonId } = await params
    
    // Parse request body
    let body: AuctionRequestBody
    try {
      body = await request.json()
    } catch (parseError) {
      logError("Invalid JSON in auction request", parseError, { ...context, seasonId })
      return NextResponse.json(
        { error: "Invalid request body. Please provide valid JSON." },
        { status: 400 }
      )
    }

    const { teamId, basePlayerId, amount } = body

    // Validation
    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "Invalid request: teamId is required and must be a string" },
        { status: 400 }
      )
    }

    if (!basePlayerId || typeof basePlayerId !== "string") {
      return NextResponse.json(
        { error: "Invalid request: basePlayerId is required and must be a string" },
        { status: 400 }
      )
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid request: amount must be a positive number" },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the season team record with current budget
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId
          }
        }
      })

      if (!seasonTeam) {
        throw new Error("Team not found in this season. Please ensure the team is assigned to this season.")
      }

      // 2. Check if team has sufficient budget
      if (seasonTeam.currentBudget < amount) {
        throw new Error(`Insufficient budget: Team has $${seasonTeam.currentBudget.toLocaleString()}, but bid is $${amount.toLocaleString()}`)
      }

      // 3. Verify base player exists
      const basePlayer = await tx.base_players.findUnique({
        where: { id: basePlayerId }
      })

      if (!basePlayer) {
        throw new Error("Player not found. Please verify the player ID.")
      }

      // 4. Check if player is already sold in this season
      const existingTransfer = await tx.transfer_history.findFirst({
        where: {
          basePlayerId,
          seasonId
        }
      })

      if (existingTransfer) {
        throw new Error(`Player ${basePlayer.name} has already been sold in this season`)
      }

      // 5. Calculate financial ledger balances
      const newBalance = seasonTeam.currentBudget - amount
      const previousBalance = newBalance + amount // Reconstructed from new balance

      // 6. Update team budget
      const updatedSeasonTeam = await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId
          }
        },
        data: {
          currentBudget: newBalance
        }
      })

      // 7. Create transfer history record
      const transferId = await generateTransferId();
      const transfer = await tx.transfer_history.create({
        data: {
          id: transferId,
          basePlayerId,
          seasonId,
          teamId,
          soldPrice: amount
        }
      })

      // 8. Create financial ledger entry
      const ledgerId = await generateFinancialId();
      const ledgerEntry = await tx.financial_ledger.create({
        data: {
          id: ledgerId,
          seasonTeamId: seasonTeam.id,
          seasonId,
          transactionType: "PLAYER_PURCHASE",
          amount: -amount, // Negative for deduction
          previousBalance,
          newBalance,
          description: `Purchased ${basePlayer.name} for $${amount.toLocaleString()}`
        }
      })

      return {
        transfer,
        ledgerEntry,
        updatedBudget: updatedSeasonTeam.currentBudget,
        playerName: basePlayer.name
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'SELL_PLAYER',
      entityType: 'transfer_history',
      entityId: result.transfer.id,
      entityName: result.playerName,
      seasonId,
      details: {
        playerId: basePlayerId,
        playerName: result.playerName,
        teamId,
        amount,
        previousBudget: result.updatedBudget + amount,
        newBudget: result.updatedBudget
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      {
        success: true,
        transfer: result.transfer,
        ledgerEntry: result.ledgerEntry,
        updatedBudget: result.updatedBudget,
        message: `Successfully purchased ${result.playerName} for $${amount.toLocaleString()}`
      },
      { status: 200 }
    )

  } catch (error) {
    // Handle known business logic errors
    if (error instanceof Error) {
      // These are expected validation/business rule errors
      if (
        error.message.includes("not found") ||
        error.message.includes("Insufficient budget") ||
        error.message.includes("already been sold")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logError("Prisma error in auction transaction", error, context)
      
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: "Record not found. The requested resource does not exist." },
          { status: 404 }
        )
      }
    }

    // Log unexpected errors
    logError("Auction transaction failed", error, context)
    
    return NextResponse.json(
      { error: "Internal server error during auction transaction. Please try again later." },
      { status: 500 }
    )
  }
}
