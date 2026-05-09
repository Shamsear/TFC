import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"
import { generateAuditId } from "@/lib/id-generator"

// Validation schema for updates
const updateTeamManagerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/team-managers/[id] - Update team manager
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    // Check authorization
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    // Check if team manager exists
    const existingManager = await prisma.users.findUnique({
      where: {
        id,
        role: "TEAM_MANAGER",
      },
    })

    if (!existingManager) {
      return NextResponse.json(
        { error: "Team manager not found" },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateTeamManagerSchema.parse(body)

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== existingManager.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email: validatedData.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        )
      }
    }

    // Check if team assignment is being changed
    if (validatedData.teamId !== undefined) {
      if (validatedData.teamId) {
        // Check if team exists
        const team = await prisma.teams.findUnique({
          where: { id: validatedData.teamId },
        })

        if (!team) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          )
        }

        // Check if team already has a different manager
        const existingTeamManager = await prisma.users.findFirst({
          where: {
            teamId: validatedData.teamId,
            role: "TEAM_MANAGER",
            NOT: {
              id,
            },
          },
        })

        if (existingTeamManager) {
          return NextResponse.json(
            { error: "Team already has a manager assigned" },
            { status: 400 }
          )
        }
      }
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.email && { email: validatedData.email }),
      ...(validatedData.teamId !== undefined && { teamId: validatedData.teamId }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      updatedAt: new Date(),
    }

    // Hash new password if provided
    if (validatedData.password) {
      updateData.passwordHash = await hash(validatedData.password, 10)
    }

    // Update team manager
    const updatedManager = await prisma.users.update({
      where: { id },
      data: updateData,
      include: {
        team: true,
      },
    })

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email || "",
        userRole: session.user.role,
        action: "UPDATE",
        entityType: "TEAM_MANAGER",
        entityId: updatedManager.id,
        entityName: updatedManager.name || updatedManager.email,
        details: JSON.stringify({
          changes: validatedData,
          updatedBy: session.user.email,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Team manager updated successfully",
      teamManager: {
        id: updatedManager.id,
        name: updatedManager.name,
        email: updatedManager.email,
        team: updatedManager.team,
        isActive: updatedManager.isActive,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating team manager:", error)
    return NextResponse.json(
      { error: "Failed to update team manager" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/team-managers/[id] - Delete team manager
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    // Check authorization
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    // Check if team manager exists
    const existingManager = await prisma.users.findUnique({
      where: {
        id,
        role: "TEAM_MANAGER",
      },
      include: {
        team: true,
      },
    })

    if (!existingManager) {
      return NextResponse.json(
        { error: "Team manager not found" },
        { status: 404 }
      )
    }

    // Delete team manager
    await prisma.users.delete({
      where: { id },
    })

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email || "",
        userRole: session.user.role,
        action: "DELETE",
        entityType: "TEAM_MANAGER",
        entityId: existingManager.id,
        entityName: existingManager.name || existingManager.email,
        details: JSON.stringify({
          teamId: existingManager.teamId,
          teamName: existingManager.team?.name,
          deletedBy: session.user.email,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Team manager deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting team manager:", error)
    return NextResponse.json(
      { error: "Failed to delete team manager" },
      { status: 500 }
    )
  }
}
