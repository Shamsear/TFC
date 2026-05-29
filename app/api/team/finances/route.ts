import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.teamId) {
      return NextResponse.json(
        { error: "Unauthorized: No team assigned" },
        { status: 401 }
      )
    }

    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true },
    })

    if (!activeSeason) {
      return NextResponse.json(
        { error: "No active season found" },
        { status: 404 }
      )
    }

    // Get current season team
    const currentSeasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: activeSeason.id,
          teamId: session.user.teamId,
        },
      },
    })

    if (!currentSeasonTeam) {
      return NextResponse.json(
        { error: "Team not registered in the active season" },
        { status: 404 }
      )
    }

    // Get all transactions
    const transactions = await prisma.financial_ledger.findMany({
      where: {
        seasonTeamId: currentSeasonTeam.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate totals
    const totalSpent = transactions
      .filter((t) => t.transactionType === "PLAYER_PURCHASE")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalEarned = transactions
      .filter((t) => t.transactionType === "PLAYER_SALE")
      .reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({
      currentBudget: currentSeasonTeam.currentBudget,
      startingPurse: activeSeason.startingPurse,
      totalSpent,
      totalEarned,
      transactions,
    })
  } catch (error) {
    console.error("Error fetching team finances:", error)
    return NextResponse.json(
      { error: "Failed to fetch team finances" },
      { status: 500 }
    )
  }
}
