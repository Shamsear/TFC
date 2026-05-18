import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { seasonId, formation } = body

    if (!seasonId || !formation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teamId = session.user.teamId

    await prisma.team_squads.upsert({
      where: {
        team_id_season_id: {
          team_id: teamId,
          season_id: seasonId,
        },
      },
      update: {
        formation: formation,
      },
      create: {
        team_id: teamId,
        season_id: seasonId,
        formation: formation,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving squad:", error)
    return NextResponse.json(
      { error: "Failed to save squad" },
      { status: 500 }
    )
  }
}
