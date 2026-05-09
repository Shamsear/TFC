import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"
import { generateUserId, generateAuditId } from "@/lib/id-generator"

// Validation schema
const createTeamManagerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  teamId: z.string().min(1, "Team assignment is required"),
})

// POST /api/admin/team-managers - Create team manager
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authorization
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createTeamManagerSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

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

    // Check if team already has a manager
    const existingManager = await prisma.users.findFirst({
      where: {
        teamId: validatedData.teamId,
        role: "TEAM_MANAGER",
      },
    })

    if (existingManager) {
      return NextResponse.json(
        { error: "Team already has a manager assigned" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 10)

    // Generate user ID
    const userId = await generateUserId()

    // Create team manager
    const teamManager = await prisma.users.create({
      data: {
        id: userId,
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: "TEAM_MANAGER",
        teamId: validatedData.teamId,
        createdBy: session.user.id,
        isActive: true,
      },
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
        action: "CREATE",
        entityType: "TEAM_MANAGER",
        entityId: teamManager.id,
        entityName: teamManager.name || teamManager.email,
        details: JSON.stringify({
          teamId: validatedData.teamId,
          teamName: team.name,
          createdBy: session.user.email,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Team manager created successfully",
      teamManager: {
        id: teamManager.id,
        name: teamManager.name,
        email: teamManager.email,
        team: teamManager.team,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating team manager:", error)
    return NextResponse.json(
      { error: "Failed to create team manager" },
      { status: 500 }
    )
  }
}
