import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEditTeam } from "@/lib/team-auth"
import { z } from "zod"

// Validation schema for team profile updates
const updateTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100).optional(),
  managerName: z.string().min(2, "Manager name must be at least 2 characters").max(100).optional(),
  logoUrl: z.string().url("Invalid logo URL").optional(),
})

// GET /api/team/profile - Get team profile
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
      include: {
        seasonTeams: {
          include: {
            season: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error("Error fetching team profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch team profile" },
      { status: 500 }
    )
  }
}

// PATCH /api/team/profile - Update team profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.teamId) {
      return NextResponse.json(
        { error: "Unauthorized: No team assigned" },
        { status: 401 }
      )
    }

    // Check if user can edit this team
    const canEdit = await canEditTeam(session.user.teamId)
    if (!canEdit) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot edit this team" },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateTeamSchema.parse(body)

    // Check if team name is being changed and if it's already taken
    if (validatedData.name) {
      const existingTeam = await prisma.teams.findFirst({
        where: {
          name: validatedData.name,
          NOT: {
            id: session.user.teamId,
          },
        },
      })

      if (existingTeam) {
        return NextResponse.json(
          { error: "Team name already exists" },
          { status: 400 }
        )
      }
    }

    // Update team
    const updatedTeam = await prisma.teams.update({
      where: { id: session.user.teamId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.managerName && { managerName: validatedData.managerName }),
        ...(validatedData.logoUrl && { logoUrl: validatedData.logoUrl }),
        updatedAt: new Date(),
      },
    })

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: `TFCAL-${Date.now()}`,
        userId: session.user.id,
        userEmail: session.user.email || "",
        userRole: session.user.role,
        action: "UPDATE",
        entityType: "TEAM",
        entityId: updatedTeam.id,
        entityName: updatedTeam.name,
        details: JSON.stringify({
          changes: validatedData,
          updatedBy: session.user.email,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Team profile updated successfully",
      team: updatedTeam,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating team profile:", error)
    return NextResponse.json(
      { error: "Failed to update team profile" },
      { status: 500 }
    )
  }
}
