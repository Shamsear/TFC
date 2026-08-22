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

    // For each team, find the user (team manager) email
    const teamIds = seasonTeams.map((st) => st.teamId)

    const managers = await prisma.users.findMany({
      where: {
        teamId: { in: teamIds },
        role: "TEAM_MANAGER",
      },
      select: {
        teamId: true,
        email: true,
        name: true,
      },
    })

    const managerMap = new Map(
      managers.map((m) => [m.teamId, { email: m.email, name: m.name }])
    )

    const result = seasonTeams.map((st, index) => {
      const manager = managerMap.get(st.teamId)
      return {
        number: index + 1,
        managerName: st.managerName || st.team.managerName || manager?.name || "N/A",
        teamName: st.team.name,
        email: manager?.email || "N/A",
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
