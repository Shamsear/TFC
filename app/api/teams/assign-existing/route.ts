import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { Prisma } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"
import { generateUserId, generateSeasonTeamId, generateFinancialId, generateManagerId } from "@/lib/id-generator"
import { generateUniqueEmail, generatePasswordFromTeamName } from "@/lib/password-generator"
import { hash } from "bcryptjs"

/**
 * POST /api/teams/assign-existing
 * Assign a manager to an existing team (prevents duplicate teams)
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request)

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { teamId, managerName, seasonId } = body

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 })
    }

    if (!managerName || typeof managerName !== "string" || managerName.trim() === "") {
      return NextResponse.json({ error: "Manager name is required" }, { status: 400 })
    }

    // Find the existing team
    const team = await prisma.teams.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Validate season if provided
    let season = null
    if (seasonId) {
      season = await prisma.seasons.findUnique({ where: { id: seasonId } })
      if (!season) {
        return NextResponse.json({ error: "Invalid season ID" }, { status: 400 })
      }
    } else {
      season = await prisma.seasons.findFirst({ where: { isActive: true } })
    }

    // Generate credentials based on manager name
    const email = await generateUniqueEmail(managerName.trim(), async (email) => {
      const existing = await prisma.users.findUnique({ where: { email } })
      return !!existing
    })
    const password = generatePasswordFromTeamName(managerName.trim())
    const passwordHash = await hash(password, 10)

    const userId = await generateUserId()

    const result = await prisma.$transaction(async (tx) => {
      // NOTE: Do NOT overwrite teams.managerName — it is the team's identity.
      // The season-level managerName on season_teams tracks who manages per season.

      // Create season_teams record if season is provided and team isn't already in it
      if (season) {
        const existingSeasonTeam = await tx.season_teams.findFirst({
          where: { seasonId: season.id, teamId, isActive: true }
        })

        if (!existingSeasonTeam) {
          const seasonTeamId = await generateSeasonTeamId()
          const ledgerId = await generateFinancialId()

          await tx.season_teams.create({
            data: {
              id: seasonTeamId,
              seasonId: season.id,
              teamId,
              currentBudget: season.startingPurse,
              trophiesWon: 0,
              updatedAt: new Date()
            }
          })

          await tx.financial_ledger.create({
            data: {
              id: ledgerId,
              seasonTeamId,
              seasonId: season.id,
              transactionType: "INITIAL_PURSE",
              amount: season.startingPurse,
              previousBalance: 0,
              newBalance: season.startingPurse,
              description: "Initial season purse"
            }
          })

          const teamCount = await tx.season_teams.count({ where: { seasonId: season.id, isActive: true } })
          await tx.seasons.update({
            where: { id: season.id },
            data: { defaultMaxBidsPerTeam: teamCount, updatedAt: new Date() }
          })
        }
      }

      // Find existing user (manager)
      const existingUser = await tx.users.findFirst({
        where: {
          name: { equals: managerName.trim(), mode: "insensitive" },
          role: "TEAM_MANAGER"
        }
      })

      // Ensure managers record exists
      let managerRecord = await tx.managers.findFirst({
        where: { name: { equals: managerName.trim(), mode: "insensitive" } }
      })
      if (!managerRecord) {
        managerRecord = await tx.managers.create({
          data: { id: await generateManagerId(), name: managerName.trim(), createdAt: new Date(), updatedAt: new Date() }
        })
      }

      if (existingUser) {
        throw new Error(`MANAGER_EXISTS:${existingUser.name}:${existingUser.teamId || 'none'}`)
      }

      const user = await tx.users.create({
        data: {
          id: userId,
          email,
          name: managerName.trim(),
          passwordHash,
          role: "TEAM_MANAGER",
          teamId,
          managerId: managerRecord.id,
          createdBy: session.user.id,
          isActive: true
        }
      })

      return { team, user, password, email }
    })

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: "CREATE_TEAM",
      entityType: "team",
      entityId: result.team.id,
      entityName: result.team.name,
      details: {
        managerName: managerName.trim(),
        existingTeam: true,
        seasonId: season?.id
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown"
    })

    return NextResponse.json({
      team: result.team,
      credentials: {
        email: result.email,
        password: result.password
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('MANAGER_EXISTS:')) {
      const parts = error.message.split(':')
      const managerName = parts[1]
      const teamId = parts[2]
      let teamName = 'another team'
      if (teamId && teamId !== 'none') {
        const team = await prisma.teams.findUnique({ where: { id: teamId }, select: { name: true } })
        teamName = team?.name || 'another team'
      }
      return NextResponse.json(
        { error: `Manager "${managerName}" already exists and is linked to ${teamName}. Choose a different manager name.` },
        { status: 409 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A manager with this name is already assigned to a team." },
          { status: 409 }
        )
      }
    }

    logError("Failed to assign manager to team", error, context)
    return NextResponse.json(
      { error: "Failed to assign manager. Please try again." },
      { status: 500 }
    )
  }
}
