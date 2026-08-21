import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/managers/check?name=xxx
 * Check if a manager name already exists. Returns the linked team name if found.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ exists: false })
    }

    const user = await prisma.users.findFirst({
      where: {
        name: { equals: name.trim(), mode: "insensitive" },
        role: "TEAM_MANAGER"
      },
      include: {
        team: { select: { name: true } }
      }
    })

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      name: user.name,
      teamName: user.team?.name || "No team"
    })
  } catch (error) {
    return NextResponse.json({ exists: false })
  }
}
