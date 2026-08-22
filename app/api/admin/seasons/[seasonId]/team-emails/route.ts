import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    const { seasonId } = await params

    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true, seasonNumber: true },
    })

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 })
    }

    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            managerName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // For each season team, find the user (team manager) email by manager NAME
    // This ensures we get the correct email for the season-specific manager,
    // not the current user linked to the teamId
    const managerNames = seasonTeams
      .map((st) => st.managerName)
      .filter((name): name is string => !!name)

    const uniqueManagerNames = [...new Set(managerNames.map((n) => n.toLowerCase()))]

    const managers = await prisma.users.findMany({
      where: {
        name: { in: uniqueManagerNames, mode: "insensitive" },
        role: "TEAM_MANAGER",
      },
      select: {
        name: true,
        email: true,
      },
    })

    const emailByName = new Map(
      managers.map((m) => [m.name.toLowerCase(), m.email])
    )

    const result = seasonTeams.map((st, index) => {
      const email = emailByName.get(st.managerName?.toLowerCase() || "") || "N/A"
      return {
        number: index + 1,
        managerName: st.managerName || st.team.managerName || "N/A",
        teamName: st.team.name,
        email,
      }
    })

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        seasonNumber: season.seasonNumber,
      },
      teams: result,
    })
  } catch (error) {
    console.error("Error fetching team emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch team emails" },
      { status: 500 }
    )
  }
}
