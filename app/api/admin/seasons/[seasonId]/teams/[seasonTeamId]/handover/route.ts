import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateAuditId, generateManagerId, generateManagerTenureId } from "@/lib/id-generator"
import { triggerNews } from "@/lib/news/trigger"

const handoverSchema = z.object({
  newManagerName: z.string().min(2, "Manager name must be at least 2 characters").max(100),
  lastMatchId: z.string().nullable().optional(),
})

interface RouteParams {
  params: Promise<{
    seasonId: string
    seasonTeamId: string
  }>
}

// GET: Fetch team info, completed matches, and tenure status for handover preview
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { seasonId, seasonTeamId } = await params

    const seasonTeam = await prisma.season_teams.findUnique({
      where: { id: seasonTeamId },
      include: {
        team: { select: { id: true, name: true, logoUrl: true, managerName: true } },
        season: { select: { id: true, name: true, seasonNumber: true } },
        managerTenures: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!seasonTeam || seasonTeam.seasonId !== seasonId) {
      return NextResponse.json({ error: "Season team not found" }, { status: 404 })
    }

    // Fetch all completed matches for this season team
    const completedMatches = await prisma.matches.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { homeTeamId: seasonTeamId },
          { awayTeamId: seasonTeamId },
        ],
      },
      include: {
        homeTeam: { select: { id: true, team: { select: { name: true, logoUrl: true } } } },
        awayTeam: { select: { id: true, team: { select: { name: true, logoUrl: true } } } },
        tournament: { select: { id: true, name: true } },
      },
      orderBy: [
        { matchDate: "asc" },
        { createdAt: "asc" },
      ],
    })

    const formattedMatches = completedMatches.map((m) => {
      const isHome = m.homeTeamId === seasonTeamId
      const myScore = isHome ? m.homeScore : m.awayScore
      const oppScore = isHome ? m.awayScore : m.homeScore
      const oppTeam = isHome ? m.awayTeam.team : m.homeTeam.team

      let result: "W" | "D" | "L" = "D"
      if (myScore !== null && oppScore !== null) {
        if (myScore > oppScore) result = "W"
        else if (myScore < oppScore) result = "L"
      }

      return {
        id: m.id,
        round: m.round || "Match",
        matchDate: m.matchDate,
        tournamentName: m.tournament.name,
        opponentName: oppTeam.name,
        opponentLogo: oppTeam.logoUrl,
        isHome,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        result,
      }
    })

    // Fetch all available managers for autocomplete
    const allManagers = await prisma.managers.findMany({
      select: { id: true, name: true, photoUrl: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      seasonTeam: {
        id: seasonTeam.id,
        teamId: seasonTeam.teamId,
        teamName: seasonTeam.team.name,
        teamLogo: seasonTeam.team.logoUrl,
        currentManagerName: seasonTeam.managerName || seasonTeam.team.managerName,
        seasonName: seasonTeam.season.name,
        seasonId: seasonTeam.seasonId,
      },
      matches: formattedMatches,
      existingTenures: seasonTeam.managerTenures,
      allManagers,
    })
  } catch (error) {
    console.error("Error fetching handover details:", error)
    return NextResponse.json({ error: "Failed to fetch handover details" }, { status: 500 })
  }
}

// POST: Execute the manager handover with stat splitting
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { seasonId, seasonTeamId } = await params
    const body = await request.json()
    const validated = handoverSchema.parse(body)

    const seasonTeam = await prisma.season_teams.findUnique({
      where: { id: seasonTeamId },
      include: {
        team: true,
        season: true,
      },
    })

    if (!seasonTeam || seasonTeam.seasonId !== seasonId) {
      return NextResponse.json({ error: "Season team not found" }, { status: 404 })
    }

    const oldManagerName = (seasonTeam.managerName || seasonTeam.team.managerName || "").trim()
    const newManagerName = validated.newManagerName.trim()

    if (oldManagerName.toLowerCase() === newManagerName.toLowerCase()) {
      return NextResponse.json(
        { error: "New manager name must be different from current manager name" },
        { status: 400 }
      )
    }

    // Fetch all completed matches for boundary resolution
    const completedMatches = await prisma.matches.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { homeTeamId: seasonTeamId },
          { awayTeamId: seasonTeamId },
        ],
      },
      orderBy: [
        { matchDate: "asc" },
        { createdAt: "asc" },
      ],
    })

    let lastMatchOfOld: string | null = null
    let firstMatchOfNew: string | null = null

    if (validated.lastMatchId) {
      const matchIndex = completedMatches.findIndex((m) => m.id === validated.lastMatchId)
      if (matchIndex === -1) {
        return NextResponse.json({ error: "Selected match not found in completed matches" }, { status: 400 })
      }
      lastMatchOfOld = completedMatches[matchIndex].id
      if (matchIndex + 1 < completedMatches.length) {
        firstMatchOfNew = completedMatches[matchIndex + 1].id
      }
    } else {
      // Handover before any matches were played
      if (completedMatches.length > 0) {
        firstMatchOfNew = completedMatches[0].id
      }
    }

    // Generate IDs for new records
    const oldTenureId = await generateManagerTenureId()
    const newTenureId = await generateManagerTenureId()
    const auditId = await generateAuditId()

    // Execute everything atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Remove any previous tenures for this seasonTeam
      await tx.manager_tenures.deleteMany({
        where: { seasonTeamId },
      })

      // 2. Create tenure for Old Manager
      await tx.manager_tenures.create({
        data: {
          id: oldTenureId,
          seasonTeamId,
          managerName: oldManagerName,
          fromMatchId: null,
          toMatchId: lastMatchOfOld,
        },
      })

      // 3. Create tenure for New Manager
      await tx.manager_tenures.create({
        data: {
          id: newTenureId,
          seasonTeamId,
          managerName: newManagerName,
          fromMatchId: firstMatchOfNew,
          toMatchId: null,
        },
      })

      // 4. Update season_teams managerName to the new manager
      const updatedSeasonTeam = await tx.season_teams.update({
        where: { id: seasonTeamId },
        data: {
          managerName: newManagerName,
          updatedAt: new Date(),
        },
      })

      // 5. Ensure a managers record exists for the new manager
      let newManagerRecord = await tx.managers.findFirst({
        where: { name: { equals: newManagerName, mode: "insensitive" } },
      })
      if (!newManagerRecord) {
        newManagerRecord = await tx.managers.create({
          data: {
            id: await generateManagerId(),
            name: newManagerName,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      // 6. Ensure a managers record exists for the old manager
      let oldManagerRecord = await tx.managers.findFirst({
        where: { name: { equals: oldManagerName, mode: "insensitive" } },
      })
      if (!oldManagerRecord && oldManagerName) {
        oldManagerRecord = await tx.managers.create({
          data: {
            id: await generateManagerId(),
            name: oldManagerName,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      // 7. Update manager_teams links
      if (oldManagerRecord) {
        await tx.manager_teams.updateMany({
          where: { managerId: oldManagerRecord.id, teamId: seasonTeam.teamId },
          data: { isCurrent: false },
        })
      }

      if (newManagerRecord) {
        await tx.manager_teams.upsert({
          where: {
            managerId_teamId: {
              managerId: newManagerRecord.id,
              teamId: seasonTeam.teamId,
            },
          },
          update: { isCurrent: true },
          create: {
            managerId: newManagerRecord.id,
            teamId: seasonTeam.teamId,
            isCurrent: true,
          },
        })

        // 8. Update any user account linked to this new manager
        await tx.users.updateMany({
          where: {
            name: { equals: newManagerName, mode: "insensitive" },
            role: "TEAM_MANAGER",
          },
          data: {
            teamId: seasonTeam.teamId,
            managerId: newManagerRecord.id,
          },
        })
      }

      // 9. Audit Log
      await tx.audit_logs.create({
        data: {
          id: auditId,
          userId: session.user.id,
          userEmail: session.user.email || "",
          userRole: session.user.role,
          action: "MANAGER_HANDOVER",
          entityType: "SEASON_TEAM",
          entityId: seasonTeamId,
          entityName: `${seasonTeam.team.name} (${seasonTeam.season.name})`,
          seasonId,
          details: JSON.stringify({
            teamId: seasonTeam.teamId,
            teamName: seasonTeam.team.name,
            oldManager: oldManagerName,
            newManager: newManagerName,
            lastMatchId: lastMatchOfOld,
            firstNewMatchId: firstMatchOfNew,
            transferredBy: session.user.email,
          }),
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      })

      return {
        updatedSeasonTeam,
        newManagerRecord,
        oldManagerRecord,
      }
    })

    // 10. Trigger news event in background
    try {
      await triggerNews("team_manager_created", {
        season_id: seasonTeam.seasonId,
        season_name: seasonTeam.season.name,
        metadata: {
          manager_name: newManagerName,
          old_manager_name: oldManagerName,
          team_name: seasonTeam.team.name,
          handover: true,
        },
      })
    } catch (newsErr) {
      console.warn("[News AI] Failed to generate handover news:", newsErr)
    }

    return NextResponse.json({
      message: "Manager handover completed successfully",
      seasonTeamId,
      oldManagerName,
      newManagerName,
      newManagerId: result.newManagerRecord.id,
      oldManagerId: result.oldManagerRecord?.id || null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
    }
    console.error("Error executing manager handover:", error)
    return NextResponse.json({ error: "Failed to execute manager handover" }, { status: 500 })
  }
}

// DELETE: Undo manager handover and revert to original manager
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { seasonId, seasonTeamId } = await params

    const seasonTeam = await prisma.season_teams.findUnique({
      where: { id: seasonTeamId },
      include: {
        team: true,
        season: true,
        managerTenures: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!seasonTeam || seasonTeam.seasonId !== seasonId) {
      return NextResponse.json({ error: "Season team not found" }, { status: 404 })
    }

    if (seasonTeam.managerTenures.length === 0) {
      return NextResponse.json({ error: "No handover record exists for this team" }, { status: 400 })
    }

    const originalManagerName = seasonTeam.managerTenures[0].managerName
    const currentManagerName = seasonTeam.managerName || ""
    const auditId = await generateAuditId()

    await prisma.$transaction(async (tx) => {
      // 1. Delete all manager tenures
      await tx.manager_tenures.deleteMany({
        where: { seasonTeamId },
      })

      // 2. Revert managerName on season_teams
      await tx.season_teams.update({
        where: { id: seasonTeamId },
        data: {
          managerName: originalManagerName,
          updatedAt: new Date(),
        },
      })

      // 3. Revert manager_teams isCurrent links
      const originalMgr = await tx.managers.findFirst({
        where: { name: { equals: originalManagerName, mode: "insensitive" } },
      })
      const currentMgr = await tx.managers.findFirst({
        where: { name: { equals: currentManagerName, mode: "insensitive" } },
      })

      if (currentMgr) {
        await tx.manager_teams.updateMany({
          where: { managerId: currentMgr.id, teamId: seasonTeam.teamId },
          data: { isCurrent: false },
        })
      }

      if (originalMgr) {
        await tx.manager_teams.upsert({
          where: {
            managerId_teamId: {
              managerId: originalMgr.id,
              teamId: seasonTeam.teamId,
            },
          },
          update: { isCurrent: true },
          create: {
            managerId: originalMgr.id,
            teamId: seasonTeam.teamId,
            isCurrent: true,
          },
        })
      }

      // 4. Audit Log
      await tx.audit_logs.create({
        data: {
          id: auditId,
          userId: session.user.id,
          userEmail: session.user.email || "",
          userRole: session.user.role,
          action: "REVERT_MANAGER_HANDOVER",
          entityType: "SEASON_TEAM",
          entityId: seasonTeamId,
          entityName: `${seasonTeam.team.name} (${seasonTeam.season.name})`,
          seasonId,
          details: JSON.stringify({
            teamId: seasonTeam.teamId,
            teamName: seasonTeam.team.name,
            revertedTo: originalManagerName,
            revertedFrom: currentManagerName,
            revertedBy: session.user.email,
          }),
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      })
    })

    return NextResponse.json({
      message: "Manager handover reverted successfully",
      revertedTo: originalManagerName,
    })
  } catch (error) {
    console.error("Error reverting manager handover:", error)
    return NextResponse.json({ error: "Failed to revert manager handover" }, { status: 500 })
  }
}
