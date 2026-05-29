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

    const team = await prisma.teams.findUnique({
      where: { id: session.user.teamId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        xp: true,
        level: true,
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true },
    })

    // Get all unlocked badges for this team
    const badges = await prisma.team_badges.findMany({
      where: {
        teamId: session.user.teamId,
      },
      orderBy: {
        unlockedAt: "desc",
      },
    })

    // Get XP history ledger
    const xpHistory = await prisma.team_xp_history.findMany({
      where: {
        teamId: session.user.teamId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      team,
      badges,
      xpHistory,
      activeSeasonId: activeSeason?.id || null,
    })
  } catch (error) {
    console.error("Error fetching team achievements:", error)
    return NextResponse.json(
      { error: "Failed to fetch achievements data" },
      { status: 500 }
    )
  }
}
